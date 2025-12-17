import { disconnectProducer } from '../../../../packages/utils/kafka/producer';
import { shipping_addresses } from '.prisma/client/client';
import { ValidationError } from '@packages/error-handler';
import prisma from '@packages/libs/prisma';
import redis from '@packages/libs/redis';
import { error } from 'console';
import { NextFunction, Response } from "express";
import Stripe from "stripe";
import { sendEmail } from '../utils/send-email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15.acacia",
});

// create payment intent
export const createPaymentIntent = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const { amount, sellerStripeAccountId, getSellerStripeAccountId, sessionId } = req.body;
  
  // Accept both field names for backwards compatibility
  const stripeAccountId = sellerStripeAccountId || getSellerStripeAccountId;

  if (!stripeAccountId) {
    return res.status(400).json({ error: "Stripe account ID is required" });
  }

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required" });
  }

  const customerAmount = Math.round(amount * 100); // Convert to cents
  const platformFee = Math.round(customerAmount * 0.05); // 5% platform fee

  try {
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: customerAmount,
        currency: "usd",
        payment_method_types: ["card"],
        application_fee_amount: platformFee,
        transfer_data: {
          destination: stripeAccountId,
        },
        metadata: {
          sessionId: sessionId,
          userId: req.user.id
        },
    
      }
    );
    res.status(200).json({ 
      success: true,
      clientSecret: paymentIntent.client_secret 
    });
  } catch (error: any) {
    console.error('Payment intent creation error:', error);
    next(error);
  }
};

// create payment session
export const createPaymentSession = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const {cart, selectedAddressId, coupon} = req.body;
    const userId = req.user.id;

    if(!cart || !Array.isArray(cart) ||cart.length === 0) {
      return next(new ValidationError("Cart is empty or invalid"));
    }

    const normalizeCart = JSON.stringify(
      cart.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        sale_price: item.sale_price,
        shopId: item.shopId,
        selectedOptions: item.selectedOptions || [],
      }))
      .sort ((a,b) => a.id.localeCompare(b.id))
    )
    const keys = await redis.keys(`payment_session:${userId}:*`);
    for (const key of keys) {
      const sessionData = await redis.get(key);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.userId === userId) {
          const existingCart = JSON.stringify(
            session.cart
              .map((item: any) => ({
                id: item.id,
                quantity: item.quantity,
                sale_price: item.sale_price,
                shopId: item.shopId,
                selectedOptions: item.selectedOptions || [],
              }))
              .sort((a: any, b: any) => a.id.localeCompare(b.id))
          );
          if (existingCart === normalizeCart) {
            return res.status(200).json({ sessionId: session.sessionId });
          } else {
            await redis.del(key);
          }
      }
    }
  }

    const uniqueShopIds = [...new Set(cart.map((item: any) => item.shopId))];
    const shops = await prisma.shops.findMany({
      where: { id: { in: uniqueShopIds } },
      select: { 
        id: true,
        sellerId: true,
        sellers: {
          select: {
            stripeId: true,
          }
        }
      },
    });

    const sellerData = shops.map((shop) => ({
      shopId: shop.id,
      sellerId: shop.sellerId,
      stripeId: shop?.sellers?.stripeId,
    }));

    // calculate total amount
    const totalAmount = cart.reduce((total: number, item: any) => {
      return total + item.sale_price * item.quantity;
    }, 0);

    // create session payload 
    const sessionId = crypto.randomUUID();
    const sessionData = {
      userId,
      sessionId,
      cart,
      shipping_addressesId: selectedAddressId || null,
      sellers: sellerData,
      totalAmount,
      coupon: coupon || null,
      status: 'pending',
      createdAt: new Date(),
    };

    await redis.set(`payment_session:${userId}:${sessionId}`, JSON.stringify(sessionData), 'EX', 15 * 60); // Expires in 15 minutes
    
    return res.status(200).json({ 
      success: true,
      sessionId,
      message: "Payment session created successfully" 
    });
  } 
  catch (error) {
    next(error);
  }
};

// verify payment session
export const verifyPaymentSession = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const sessionId = req.query.sessionId as string;
    const userId = req.user?.id;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User not authenticated" });
    }

    // Fetch session data from Redis using correct key pattern with userId
    const sessionKey = `payment_session:${userId}:${sessionId}`;
    const sessionData = await redis.get(sessionKey);

    if (!sessionData) {
      return res.status(404).json({ error: "Payment session not found or expired" });
    }
    
    // Parse and return session data
    const session = JSON.parse(sessionData);

    // Check if session is still valid (not completed)
    if (session.status === 'completed') {
      return res.status(400).json({ error: "Payment session already completed" });
    }

    res.status(200).json({ 
      success: true,
      session: {
        sessionId: session.sessionId,
        userId: session.userId,
        totalAmount: session.totalAmount,
        sellers: session.sellers,
        cart: session.cart,
        coupon: session.coupon,
        status: session.status,
        shipping_addressesId: session.shipping_addressesId,
      }
    });
  } catch (error) {
    next(error);
  }
};

// create order
export const createOrder = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const stripeSignature = req.headers['stripe-signature'] as string;
    if (!stripeSignature) {
      return res.status(400).send('Missing Stripe signature');
    }

    const rawBody = (req as any).rawBody;

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        stripeSignature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error('Error verifying Stripe webhook signature:', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const sessionId = paymentIntent.metadata.sessionId;
      const userId = paymentIntent.metadata.userId;

      // Use correct Redis key pattern with userId
      const sessionKey = `payment_session:${userId}:${sessionId}`;
      const sessionData = await redis.get(sessionKey);

      if (!sessionData) {
        console.warn('Payment session not found or expired for sessionId:', sessionId);
        return res.status(404).send('Payment session not found or expired');
      }

      const parsedSession = JSON.parse(sessionData);
      const { cart, totalAmount, shipping_addressesId, coupon } = parsedSession;
      const user = await prisma.users.findUnique({ where: { id: userId } });
      const name = user?.name!;
      const email = user?.email!;

      // Update session status to 'completed'
      parsedSession.status = 'completed';
      await redis.set(sessionKey, JSON.stringify(parsedSession), 'EX', 15 * 60);

      const shopGrouped = cart.reduce((groups: any, item: any) => {
        if (!groups[item.shopId]) groups[item.shopId] = [];
        groups[item.shopId].push(item);
        return groups;
      }, {});

      // SỬA: Dùng Object.keys để lặp qua các key của object shopGrouped
      for (const shopId of Object.keys(shopGrouped)) {
        const orderItems = shopGrouped[shopId];
        let orderTotal = orderItems.reduce((total: number, item: any) => {
          return total + item.sale_price * item.quantity;
        }, 0);

        // Apply coupon logic here if needed
        if (coupon && coupon.disconnectProductId && orderItems.some((item: any) => item.id === coupon.disconnectProductId)) {
          const discountedItem = orderItems.find((item: any) => item.id === coupon.disconnectProductId);
          if (discountedItem) {
            const discount = coupon.discountPercent > 0 
              ? (discountedItem.sale_price * (coupon.discountPercent / 100)) 
              : coupon.discountAmount;
            orderTotal -= discount * discountedItem.quantity;
          }
        }

        // create order in database
        await prisma.orders.create({
          data: {
            userId,
            shopId,
            total: orderTotal,
            status: 'paid',
            shippingAddressId: shipping_addressesId,
            couponCode: coupon?.code || null,
            discountAmount: coupon?.discountAmount || 0,
            items: {
              create: orderItems.map((item: any) => ({
                productId: item.id,
                quantity: item.quantity,
                price: item.sale_price,
                selectedOptions: item.selectedOptions || [],
              })),
            },
          },
        });

        // Update product stock & analytics here if needed
        for (const item of orderItems) {
          const { id: productId, quantity } = item;
          await prisma.products.update({
            where: { id: productId },
            data: {
              stock: { decrement: quantity },
              totalSold: { increment: quantity },
            },
          });

          await prisma.productAnalytics.upsert({
            where: { productId: productId },
            create: {
              productId: productId,
              shopId,
              purchases: quantity,
              lastViewedAt: new Date(),
            },
            update: {
              purchases: { increment: quantity },
            },
          });

          // Lưu ý: Logic tìm productAnalytics bằng userId có thể gây lỗi nếu model không hỗ trợ, 
          // nhưng mình giữ nguyên theo logic code gốc của bạn.
          const existingAnalytics = await prisma.productAnalytics.findUnique({
            where: { userId }, // Kiểm tra lại schema xem field này có unique không
          });

          const newAction = {
            productId,
            shopId,
            action: 'purchase',
            timestamp: Date.now(),
          };

          const currentActions = Array.isArray(existingAnalytics?.actions) 
            ? (existingAnalytics.actions as Prisma.JsonArray) 
            : [];

          if (existingAnalytics) {
            await prisma.productAnalytics.update({
              where: { userId },
              data: {
                actions: [...currentActions, newAction],
              },
            });
          } else {
            await prisma.productAnalytics.create({
              data: {
                userId,
                // lastVisitedAt: new Date(), // Kiểm tra xem field này có trong schema không (productAnalytics thường không có userId làm khóa chính)
                actions: [newAction],
              },
            });
          }
        }

        // send email to user
        await sendEmail(
          email,
          "🛍 Your NextBuy Order Confirmation",
          "order-confirmation",
          {
            name,
            cart,
            totalAmount: coupon?.discountAmount
              ? totalAmount - coupon?.discountAmount
              : totalAmount,
            trackingUrl: `https://nextbuy.com/order/${sessionId}`,
          }
        );

        // Create notification for sellers
        const createdShopIds = Object.keys(shopGrouped);
        const sellerShops = await prisma.shops.findMany({
          where: { id: { in: createdShopIds } },
          select: {
            id: true,
            sellerId: true,
            name: true,
          },
        });

        for (const shop of sellerShops) {
          const firstProduct = shopGrouped[shop.id][0];
          const productTitle = firstProduct?.title || "new item";

          await prisma.notifications.create({
            data: {
              title: "🛒 New Order Received",
              message: `A customer just ordered ${productTitle} from your shop.`,
              creatorId: userId,
              receiverId: shop.sellerId,
              redirect_link: `https://nextbuy.com/order/${sessionId}`,
            },
          });
        }

        // Create notification for admin
        // SỬA: Đã thêm các dấu phẩy bị thiếu trong object bên dưới
        await prisma.notifications.create({
          data: {
            title: "🛒 New Order Placed",
            message: `A new order has been placed by ${name}.`,
            creatorId: userId,
            receiverId: 'admin',
            redirect_link: `https://nextbuy.com/admin/orders/${sessionId}`
          }
        });
      } // Kết thúc vòng lặp shop

      // Xóa session sau khi đã xử lý xong hết các shop
      await redis.del(sessionKey);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.log(error);
    next(error);
  }
};



