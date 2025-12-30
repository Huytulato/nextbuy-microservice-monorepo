import { BaseService } from '@packages/base';
import { OrderRepository } from '../repositories/order.repository';
import {
  CreatePaymentIntentDto,
  CreatePaymentSessionDto,
  CreateOrderDto,
  UpdateDeliveryStatusDto,
} from '../dto/order.dto';
import { ValidationError, NotFoundError, AuthError } from '@packages/error-handler';
import prisma from '@packages/libs/prisma';
import redis from '@packages/libs/redis';
import Stripe from 'stripe';
import { sendEmail } from '@packages/utils/send-email';
import { publishNotificationEvent } from '@packages/utils/kafka/producer';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const DELIVERY_STATUSES = ['ordered', 'packed', 'shipped', 'out_for_delivery', 'delivered'] as const;
type DeliveryStatus = typeof DELIVERY_STATUSES[number];

export class OrderService extends BaseService<OrderRepository> {
  constructor() {
    super(new OrderRepository());
  }

  /**
   * Create payment intent
   */
  async createPaymentIntent(data: CreatePaymentIntentDto, userId: string) {
    const stripeAccountId = data.sellerStripeAccountId || data.getSellerStripeAccountId;

    if (!stripeAccountId) {
      throw new ValidationError('Stripe account ID is required');
    }

    if (!data.sessionId) {
      throw new ValidationError('Session ID is required');
    }

    const customerAmount = Math.round(data.amount * 100); // Convert to cents
    const platformFee = Math.round(customerAmount * 0.05); // 5% platform fee

    const paymentIntent = await stripe.paymentIntents.create({
      amount: customerAmount,
      currency: 'usd',
      payment_method_types: ['card'],
      application_fee_amount: platformFee,
      transfer_data: {
        destination: stripeAccountId,
      },
      metadata: {
        sessionId: data.sessionId,
        userId,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
    };
  }

  /**
   * Create payment session
   */
  async createPaymentSession(data: CreatePaymentSessionDto, userId: string) {
    if (!data.cart || !Array.isArray(data.cart) || data.cart.length === 0) {
      throw new ValidationError('Cart is empty or invalid');
    }

    // Normalize cart for comparison
    const normalizeCart = JSON.stringify(
      data.cart
        .map((item) => ({
          id: item.id,
          quantity: item.quantity,
          sale_price: item.sale_price,
          shopId: item.shopId,
          selectedOptions: item.selectedOptions || [],
        }))
        .sort((a, b) => a.id.localeCompare(b.id))
    );

    // Check for existing session
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
            return { sessionId: session.sessionId };
          } else {
            await redis.del(key);
          }
        }
      }
    }

    // Get shop and seller information
    const uniqueShopIds = [...new Set(data.cart.map((item) => item.shopId))];
    const shops = await prisma.shops.findMany({
      where: { id: { in: uniqueShopIds } },
      select: {
        id: true,
        sellerId: true,
        sellers: {
          select: {
            stripeId: true,
          },
        },
      },
    });

    const sellerData = shops.map((shop) => ({
      shopId: shop.id,
      sellerId: shop.sellerId,
      stripeId: shop?.sellers?.stripeId,
    }));

    // Calculate total amount
    const totalAmount = data.cart.reduce((total, item) => {
      return total + item.sale_price * item.quantity;
    }, 0);

    // Create session
    const sessionId = crypto.randomUUID();
    const sessionData = {
      userId,
      sessionId,
      cart: data.cart,
      shipping_addressesId: data.selectedAddressId || null,
      sellers: sellerData,
      totalAmount,
      coupon: data.coupon || null,
      status: 'pending',
      createdAt: new Date(),
    };

    await redis.set(`payment_session:${userId}:${sessionId}`, JSON.stringify(sessionData), 'EX', 30 * 60); // 30 minutes

    return {
      sessionId,
      message: 'Payment session created successfully',
    };
  }

  /**
   * Verify payment session
   */
  async verifyPaymentSession(sessionId: string, userId: string) {
    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    if (!userId) {
      throw new AuthError('Unauthorized: User not authenticated');
    }

    const sessionKey = `payment_session:${userId}:${sessionId}`;
    const sessionData = await redis.get(sessionKey);

    if (!sessionData) {
      throw new NotFoundError('Payment session not found or expired');
    }

    const session = JSON.parse(sessionData);

    if (session.status === 'completed') {
      throw new ValidationError('Payment session already completed');
    }

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      totalAmount: session.totalAmount,
      sellers: session.sellers,
      cart: session.cart,
      coupon: session.coupon,
      status: session.status,
      shipping_addressesId: session.shipping_addressesId,
    };
  }

  /**
   * Create order from Stripe webhook
   */
  async createOrderFromWebhook(event: Stripe.Event) {
    if (event.type !== 'payment_intent.succeeded') {
      return { received: true };
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const sessionId = paymentIntent.metadata.sessionId;
    const userId = paymentIntent.metadata.userId;

    if (!sessionId || !userId) {
      throw new ValidationError('Missing session or user information');
    }

    const sessionKey = `payment_session:${userId}:${sessionId}`;
    const sessionData = await redis.get(sessionKey);

    if (!sessionData) {
      throw new NotFoundError('Payment session not found or expired');
    }

    const parsedSession = JSON.parse(sessionData);
    const { cart, totalAmount, shipping_addressesId, coupon } = parsedSession;

    // Update session status
    parsedSession.status = 'completed';
    await redis.set(sessionKey, JSON.stringify(parsedSession), 'EX', 30 * 60);

    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Group cart items by shop
    const shopGrouped = cart.reduce((groups: any, item: any) => {
      if (!groups[item.shopId]) groups[item.shopId] = [];
      groups[item.shopId].push(item);
      return groups;
    }, {});

    const createdOrders = [];

    // Process each shop's orders
    for (const shopId of Object.keys(shopGrouped)) {
      const orderItems = shopGrouped[shopId];
      let orderTotal = orderItems.reduce((total: number, item: any) => {
        return total + item.sale_price * item.quantity;
      }, 0);

      // Apply coupon if applicable
      if (coupon && coupon.disconnectProductId && orderItems.some((item: any) => item.id === coupon.disconnectProductId)) {
        const discountedItem = orderItems.find((item: any) => item.id === coupon.disconnectProductId);
        if (discountedItem) {
          const discount = coupon.discountPercent > 0
            ? discountedItem.sale_price * (coupon.discountPercent / 100)
            : coupon.discountAmount;
          orderTotal -= discount * discountedItem.quantity;
        }
      }

      // Idempotency check
      const existingOrder = await this.repository.findExistingOrder(userId, shopId, orderTotal);
      if (existingOrder) {
        continue; // Skip duplicate
      }

      // Create order
      const order = await this.repository.create({
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
            variationId: item.variationId || null,
            quantity: item.quantity,
            price: item.sale_price,
            selectedOptions: item.selectedOptions || [],
          })),
        },
      });

      createdOrders.push(order);

      // Update product/variation stock
      for (const item of orderItems) {
        const { id: productId, quantity, variationId } = item;

        if (variationId) {
          const variation = await prisma.product_variations.findUnique({
            where: { id: variationId },
          });

          if (variation) {
            await prisma.product_variations.update({
              where: { id: variationId },
              data: {
                stock: { decrement: quantity },
                hasOrders: true,
              },
            });
          } else {
            // Fallback to product-level stock
            await prisma.products.update({
              where: { id: productId },
              data: { stock: { decrement: quantity } },
            });
          }
        } else {
          await prisma.products.update({
            where: { id: productId },
            data: { stock: { decrement: quantity } },
          });
        }

        // Update product analytics
        await prisma.productAnalytics.upsert({
          where: { productId },
          create: {
            productId,
            shopId,
            purchases: quantity,
            lastViewedAt: new Date(),
          },
          update: {
            purchases: { increment: quantity },
          },
        });
      }

      // Send email to user
      await sendEmail(
        user.email,
        '🛍 Your NextBuy Order Confirmation',
        'order-confirmation',
        {
          name: user.name,
          cart,
          totalAmount: coupon?.discountAmount ? totalAmount - coupon.discountAmount : totalAmount,
          trackingUrl: `https://nextbuy.com/order/${sessionId}`,
        }
      );

      // Create notifications
      const sellerShops = await prisma.shops.findMany({
        where: { id: { in: Object.keys(shopGrouped) } },
        select: {
          id: true,
          sellerId: true,
          name: true,
        },
      });

      for (const shop of sellerShops) {
        const firstProduct = shopGrouped[shop.id][0];
        const productTitle = firstProduct?.title || 'new item';

        await publishNotificationEvent({
          title: '🛒 New Order Received',
          message: `A customer just ordered ${productTitle} from your shop.`,
          creatorId: userId,
          receiverId: shop.sellerId,
          redirect_link: `https://nextbuy.com/order/${sessionId}`,
        });
      }

      await publishNotificationEvent({
        title: '🛒 New Order Placed',
        message: `A new order has been placed by ${user.name}.`,
        creatorId: userId,
        receiverId: 'admin',
        redirect_link: `https://nextbuy.com/admin/orders/${sessionId}`,
      });
    }

    // Delete session after processing
    await redis.del(sessionKey);

    return { received: true, ordersCreated: createdOrders.length };
  }

  /**
   * Get seller orders
   */
  async getSellerOrders(sellerId: string) {
    const shop = await prisma.shops.findUnique({
      where: { sellerId },
    });

    if (!shop) {
      throw new NotFoundError('Shop not found');
    }

    return this.repository.findByShopId(shop.id);
  }

  /**
   * Get order details (for seller)
   */
  async getOrderDetails(orderId: string, sellerId: string) {
    const shop = await prisma.shops.findUnique({
      where: { sellerId },
      select: { id: true },
    });

    if (!shop?.id) {
      console.log(`[getOrderDetails] Shop not found for sellerId: ${sellerId}`);
      throw new NotFoundError('Shop not found');
    }

    const order = await this.repository.findById(orderId);

    if (!order) {
      console.log(`[getOrderDetails] Order not found: ${orderId}`);
      throw new NotFoundError('Order not found');
    }

    if (order.shopId !== shop.id) {
      console.log(`[getOrderDetails] Order ${orderId} belongs to shop ${order.shopId}, but seller's shop is ${shop.id}`);
      throw new NotFoundError('Order not found or does not belong to your shop');
    }

    return {
      ...order,
      items: order.items?.map((item: any) => ({
        ...item,
        selectedOptions: item.selectedOptions ?? [],
        product: item.product ?? null,
      })),
    };
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(orderId: string, deliveryStatus: DeliveryStatus, sellerId: string) {
    if (!DELIVERY_STATUSES.includes(deliveryStatus)) {
      throw new ValidationError('Invalid delivery status');
    }

    const shop = await prisma.shops.findUnique({
      where: { sellerId },
      select: { id: true },
    });

    if (!shop?.id) {
      throw new NotFoundError('Shop not found');
    }

    const existing = await prisma.orders.findFirst({
      where: { id: orderId, shopId: shop.id },
      select: { id: true },
    });

    if (!existing?.id) {
      throw new NotFoundError('Order not found');
    }

    return this.repository.update(orderId, { deliveryStatus });
  }

  /**
   * Get user orders
   */
  async getUserOrders(userId: string) {
    return this.repository.findByUserId(userId);
  }

  /**
   * Get user order details
   */
  async getUserOrderDetails(orderId: string, userId: string) {
    const order = await this.repository.findById(orderId);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.userId !== userId) {
      throw new NotFoundError('Order not found');
    }

    return {
      ...order,
      items: order.items?.map((item: any) => ({
        ...item,
        selectedOptions: item.selectedOptions ?? [],
        product: item.product ?? null,
      })),
    };
  }

  /**
   * Get admin orders
   */
  async getAdminOrders() {
    const orders = await this.repository.findAll();

    return orders.map((order: any) => {
      const adminFee = order.total * 0.10;
      const sellerEarnings = order.total * 0.90;
      const paymentStatus =
        order.status?.toLowerCase() === 'paid' || order.status?.toLowerCase() === 'completed'
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
  }

  /**
   * Get order details (for admin - can view any order)
   */
  async getAdminOrderDetails(orderId: string) {
    const order = await this.repository.findById(orderId);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const adminFee = order.total * 0.10;
    const sellerEarnings = order.total * 0.90;
    const paymentStatus =
      order.status?.toLowerCase() === 'paid' || order.status?.toLowerCase() === 'completed'
        ? 'paid'
        : order.status?.toLowerCase() === 'failed'
        ? 'failed'
        : 'pending';

    return {
      ...order,
      adminFee,
      sellerEarnings,
      paymentStatus,
      items: order.items?.map((item: any) => ({
        ...item,
        selectedOptions: item.selectedOptions ?? [],
        product: item.product ?? null,
      })),
    };
  }
}

