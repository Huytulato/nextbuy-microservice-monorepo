import { ValidationError, NotFoundError } from '@packages/error-handler';
import prisma from '@packages/libs/prisma';
import redis from '@packages/libs/redis';
import { NextFunction, Response } from "express";
import Stripe from "stripe";
import { sendEmail } from '../utils/send-email';
import { publishNotificationEvent } from '@packages/utils/kafka/producer';

type DeliveryStatus = "ordered" | "packed" | "shipped" | "out_for_delivery" | "delivered";
const DELIVERY_STATUSES: DeliveryStatus[] = ["ordered", "packed", "shipped", "out_for_delivery", "delivered"];
const prismaAny = prisma as any;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
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
    return res.status(200).json({ 
      success: true,
      clientSecret: paymentIntent.client_secret 
    });
  } catch (error: any) {
    console.error('Payment intent creation error:', error);
    return next(error);
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

    await redis.set(`payment_session:${userId}:${sessionId}`, JSON.stringify(sessionData), 'EX', 30 * 60); // Expires in 30 minutes
    
    return res.status(200).json({ 
      success: true,
      sessionId,
      message: "Payment session created successfully" 
    });
  } 
  catch (error) {
    return next(error);
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

    return res.status(200).json({ 
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
    return next(error);
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

    // Log all webhook events for debugging
    console.log('✅ Webhook received:', {
      type: event.type,
      timestamp: new Date().toISOString(),
      eventId: event.id
    });

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const sessionId = paymentIntent.metadata.sessionId;
      const userId = paymentIntent.metadata.userId;

      console.log('💳 Payment Intent Succeeded:', {
        sessionId,
        userId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        paymentIntentId: paymentIntent.id
      });

      // Use correct Redis key pattern with userId
      const sessionKey = `payment_session:${userId}:${sessionId}`;
      console.log('🔍 Retrieving session from Redis:', sessionKey);
      const sessionData = await redis.get(sessionKey);

      if (!sessionData) {
        console.error('❌ Payment session not found or expired:', {
          sessionKey,
          sessionId,
          userId
        });
        return res.status(404).send('Payment session not found or expired');
      }

      console.log('✅ Session retrieved successfully');

      const parsedSession = JSON.parse(sessionData);
      const { cart, totalAmount, shipping_addressesId, coupon } = parsedSession;
      const user = await prisma.users.findUnique({ where: { id: userId } });
      const name = user?.name!;
      const email = user?.email!;

      // Update session status to 'completed'
      parsedSession.status = 'completed';
      await redis.set(sessionKey, JSON.stringify(parsedSession), 'EX', 30 * 60); // 30 minutes timeout

      const shopGrouped = cart.reduce((groups: any, item: any) => {
        if (!groups[item.shopId]) groups[item.shopId] = [];
        groups[item.shopId].push(item);
        return groups;
      }, {});

      // SỬA: Dùng Object.keys để lặp qua các key của object shopGrouped
      for (const shopId of Object.keys(shopGrouped)) {
        console.log('🛒 Processing shop orders:', shopId);
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

        // 🔒 IDEMPOTENCY CHECK: Prevent duplicate order creation from webhook retries
        const existingOrder = await prismaAny.orders.findFirst({
          where: { 
            userId, 
            shopId,
            status: 'paid',
            total: orderTotal,
            createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } // Within last 5 minutes
          }
        });

        if (existingOrder) {
          console.log('⚠️ Order already exists, skipping duplicate creation:', {
            orderId: existingOrder.id,
            shopId,
            userId
          });
          continue; // Skip to next shop
        }

        console.log('✅ Creating new order for shop:', shopId);

        // create order in database
        await prismaAny.orders.create({
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
                variationId: item.variationId || null, // NEW: Link to specific variation
                quantity: item.quantity,
                price: item.sale_price,
                selectedOptions: item.selectedOptions || [],
              })),
            },
          },
        });

        // Update product/variation stock & analytics here if needed
        for (const item of orderItems) {
          const { id: productId, quantity, variationId } = item;
          
          if (variationId) {
            // NEW: Update variation-specific stock and mark as having orders
            const variation = await prisma.product_variations.findUnique({
              where: { id: variationId },
            });

            if (variation) {
              await prisma.product_variations.update({
                where: { id: variationId },
                data: {
                  stock: { decrement: quantity },
                  hasOrders: true, // Prevent hard delete
                },
              });

              console.log(`✅ [ORDER] Updated variation ${variation.sku}: stock -${quantity}, hasOrders=true`);
            } else {
              console.warn(`⚠️ [ORDER] Variation ${variationId} not found, falling back to product stock`);
              // Fallback to product-level stock if variation not found
              await prisma.products.update({
                where: { id: productId },
                data: {
                  stock: { decrement: quantity },
                },
              });
            }
          } else {
            // Legacy: Update product-level stock
            await prisma.products.update({
              where: { id: productId },
              data: {
                stock: { decrement: quantity },
              },
            });
          }

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

          // Publish notification event for seller
          await publishNotificationEvent({
            title: "🛒 New Order Received",
            message: `A customer just ordered ${productTitle} from your shop.`,
            creatorId: userId,
            receiverId: shop.sellerId,
            redirect_link: `https://nextbuy.com/order/${sessionId}`,
          });
        }

        // Publish notification event for admin
        await publishNotificationEvent({
          title: "🛒 New Order Placed",
          message: `A new order has been placed by ${name}.`,
          creatorId: userId,
          receiverId: 'admin',
          redirect_link: `https://nextbuy.com/admin/orders/${sessionId}`
        });
      } // Kết thúc vòng lặp shop

      // Xóa session sau khi đã xử lý xong hết các shop
      console.log('🗑️ Deleting Redis session:', sessionKey);
      await redis.del(sessionKey);
      console.log('✅ Order creation completed successfully for payment intent:', paymentIntent.id);

    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const sessionId = paymentIntent.metadata.sessionId;
      const userId = paymentIntent.metadata.userId;

      console.log('❌ Payment Intent Failed:', {
        sessionId,
        userId,
        paymentIntentId: paymentIntent.id,
        lastPaymentError: paymentIntent.last_payment_error?.message
      });

      // Update session status to 'failed'
      const sessionKey = `payment_session:${userId}:${sessionId}`;
      const sessionData = await redis.get(sessionKey);
      
      if (sessionData) {
        const parsedSession = JSON.parse(sessionData);
        parsedSession.status = 'failed';
        parsedSession.errorMessage = paymentIntent.last_payment_error?.message;
        await redis.set(sessionKey, JSON.stringify(parsedSession), 'EX', 30 * 60);
        console.log('📝 Updated session status to failed');
      }

    } else if (event.type === 'payment_intent.canceled') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const sessionId = paymentIntent.metadata.sessionId;
      const userId = paymentIntent.metadata.userId;

      console.log('🚫 Payment Intent Canceled:', {
        sessionId,
        userId,
        paymentIntentId: paymentIntent.id
      });

      // Update session status to 'canceled'
      const sessionKey = `payment_session:${userId}:${sessionId}`;
      const sessionData = await redis.get(sessionKey);
      
      if (sessionData) {
        const parsedSession = JSON.parse(sessionData);
        parsedSession.status = 'canceled';
        await redis.set(sessionKey, JSON.stringify(parsedSession), 'EX', 30 * 60);
        console.log('📝 Updated session status to canceled');
      }
    } else {
      console.log('ℹ️ Unhandled webhook event type:', event.type);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('💥 Error in webhook handler:', error);
    return next(error);
  }
};

// get seller orders
export const getSellerOrders = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const shop = await prisma.shops.findUnique({
      where: {
        sellerId: req.seller?.id,
      },
    });

    // Fetch orders for the shop
    const orders = await prismaAny.orders.findMany({
      where: {
        shopId: shop?.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            images: true,
          }
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    next(error);
  }
}

// get order details
export const getOrderDetails = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const shop = await prisma.shops.findUnique({
      where: { sellerId: req.seller?.id },
      select: { id: true },
    });

    if (!shop?.id) {
      return next(new NotFoundError("Shop not found"));
    }

    const orderId = req.params.orderId;
    const order = await prismaAny.orders.findUnique({
      where: {
        id: orderId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            images: true,
          }
        },
        items: {
          include: {
            product: true,
          }
        },
        shippingAddress: true,
        coupon: true,
        shop: {
          select: {
            id: true,
            name: true,
            images: true,
          }
        },
      },
    });

    if (!order) {
      return next(new NotFoundError("Order not found"));
    }

    if (order.shopId !== shop.id) {
      return next(new NotFoundError("Order not found"));
    }

    res.status(200).json({
      success: true,
      order: {
        ...order,
        items: order.items?.map((item: any) => ({
          ...item,
          selectedOptions: item.selectedOptions ?? [],
          product: item.product ?? null,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// update delivery status (seller only)
export const updateDeliveryStatus = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const shop = await prisma.shops.findUnique({
      where: { sellerId: req.seller?.id },
      select: { id: true },
    });

    if (!shop?.id) {
      return next(new NotFoundError("Shop not found"));
    }

    const orderId = req.params.orderId;
    const deliveryStatus = req.body?.deliveryStatus as DeliveryStatus | undefined;

    if (!deliveryStatus || !DELIVERY_STATUSES.includes(deliveryStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid deliveryStatus",
        allowed: DELIVERY_STATUSES,
      });
    }

    const existing = await prismaAny.orders.findFirst({
      where: { id: orderId, shopId: shop.id },
      select: { id: true },
    });

    if (!existing?.id) {
      return next(new NotFoundError("Order not found"));
    }

    const updated = await prismaAny.orders.update({
      where: { id: orderId },
      data: { deliveryStatus },
      include: {
        user: { select: { id: true, name: true, email: true, images: true } },
        items: { include: { product: true } },
        shippingAddress: true,
        coupon: true,
        shop: { select: { id: true, name: true, images: true } },
      },
    });

    return res.status(200).json({
      success: true,
      order: {
        ...updated,
        items: updated.items?.map((item: any) => ({
          ...item,
          selectedOptions: item.selectedOptions ?? [],
          product: item.product ?? null,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// verify coupon
export const verifyCoupon = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const couponCode = req.body.couponCode;
    const coupon = await prisma.discount_codes.findUnique({
      where: { discountCode: couponCode },
    });
    if (!coupon) {
      return res.status(400).json({ error: "Invalid coupon code" });
    }
    return res.status(200).json({ coupon });
  } catch (error) {
    next(error);
  }
}

// get user orders
export const getUserOrders = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const orders = await prismaAny.orders.findMany({
      where: { userId: req.user?.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                images: true,
              }
            }
          }
        },
        shippingAddress: true,
        shop: {
          select: {
            id: true,
            name: true,
            images: true,
          }
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return res.status(200).json({ 
      success: true,
      orders 
    });
  } catch (error) {
    next(error);
  }
}

// get user order details
export const getUserOrderDetails = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const orderId = req.params.orderId;
    const order = await prismaAny.orders.findUnique({
      where: {
        id: orderId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            images: true,
          }
        },
        items: {
          include: {
            product: true,
          }
        },
        shippingAddress: true,
        coupon: true,
        shop: {
          select: {
            id: true,
            name: true,
            images: true,
          }
        },
      },
    });

    if (!order) {
      return next(new NotFoundError("Order not found"));
    }

    // Verify the order belongs to the user
    if (order.userId !== req.user?.id) {
      return next(new NotFoundError("Order not found"));
    }

    res.status(200).json({
      success: true,
      order: {
        ...order,
        items: order.items?.map((item: any) => ({
          ...item,
          selectedOptions: item.selectedOptions ?? [],
          product: item.product ?? null,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};


// get admin orders
export const getAdminOrders = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const orders = await prismaAny.orders.findMany(
      {
        include: {
          user: true,
          shop: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }
    );

    // Calculate admin fee (10%) and seller earnings (90%) for each order
    const ordersWithCalculations = orders.map((order: any) => {
      const adminFee = order.total * 0.10;
      const sellerEarnings = order.total * 0.90;
      const paymentStatus = order.status?.toLowerCase() === 'paid' || order.status?.toLowerCase() === 'completed' 
        ? 'paid' 
        : order.status?.toLowerCase() === 'failed' 
        ? 'failed' 
        : 'pending';

      return {
        ...order,
        adminFee,
        sellerEarnings,
        paymentStatus,
      };
    });

    return res.status(200).json({
      success: true,
      orders: ordersWithCalculations,
    });
  } catch (error) {
    next(error);
  }
}
