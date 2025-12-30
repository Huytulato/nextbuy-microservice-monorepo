import { BaseController } from '@packages/base';
import { OrderService } from '../services/order.service';
import { Request, Response, NextFunction } from 'express';
import {
  CreatePaymentIntentDto,
  CreatePaymentSessionDto,
  UpdateDeliveryStatusDto,
} from '../dto/order.dto';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
  };
  seller?: {
    id: string;
    shops?: { id: string };
  };
  admin?: {
    id: string;
    role: string;
  };
}

export class OrderController extends BaseController<OrderService> {
  constructor() {
    super(new OrderService());
  }

  /**
   * Create payment intent
   */
  createPaymentIntent = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data: CreatePaymentIntentDto = req.body;
    const result = await this.service.createPaymentIntent(data, req.user!.id);
    return this.success(res, result);
  });

  /**
   * Create payment session
   */
  createPaymentSession = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data: CreatePaymentSessionDto = req.body;
    const result = await this.service.createPaymentSession(data, req.user!.id);
    return this.success(res, result, 'Payment session created successfully', 200);
  });

  /**
   * Verify payment session
   */
  verifyPaymentSession = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const result = await this.service.verifyPaymentSession(sessionId, req.user!.id);
    return this.success(res, { session: result });
  });

  /**
   * Create order from Stripe webhook
   */
  createOrder = this.asyncHandler(async (req: any, res: Response) => {
    const stripeSignature = req.headers['stripe-signature'] as string;
    if (!stripeSignature) {
      return res.status(400).send('Missing Stripe signature');
    }

    const rawBody = (req as any).rawBody;

    let event: Stripe.Event;
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

    console.log('✅ Webhook received:', {
      type: event.type,
      timestamp: new Date().toISOString(),
      eventId: event.id,
    });

    if (event.type === 'payment_intent.succeeded') {
      const result = await this.service.createOrderFromWebhook(event);
      return res.status(200).json(result);
    } else if (event.type === 'payment_intent.payment_failed' || event.type === 'payment_intent.canceled') {
      // Handle failed/canceled payments
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const sessionId = paymentIntent.metadata.sessionId;
      const userId = paymentIntent.metadata.userId;

      if (sessionId && userId) {
        const sessionKey = `payment_session:${userId}:${sessionId}`;
        const sessionData = await (await import('@packages/libs/redis')).default.get(sessionKey);

        if (sessionData) {
          const parsedSession = JSON.parse(sessionData);
          parsedSession.status = event.type === 'payment_intent.payment_failed' ? 'failed' : 'canceled';
          if (event.type === 'payment_intent.payment_failed') {
            parsedSession.errorMessage = paymentIntent.last_payment_error?.message;
          }
          await (await import('@packages/libs/redis')).default.set(
            sessionKey,
            JSON.stringify(parsedSession),
            'EX',
            30 * 60
          );
        }
      }
    }

    return res.status(200).json({ received: true });
  });

  /**
   * Get seller orders
   */
  getSellerOrders = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orders = await this.service.getSellerOrders(req.seller!.id);
    return this.success(res, { orders });
  });

  /**
   * Get order details (for seller)
   */
  getOrderDetails = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orderId } = req.params;
    const order = await this.service.getOrderDetails(orderId, req.seller!.id);
    return this.success(res, { order });
  });

  /**
   * Update delivery status
   */
  updateDeliveryStatus = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orderId } = req.params;
    const { deliveryStatus }: UpdateDeliveryStatusDto = req.body;
    const order = await this.service.updateDeliveryStatus(orderId, deliveryStatus, req.seller!.id);
    return this.success(res, { order });
  });

  /**
   * Get user orders
   */
  getUserOrders = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orders = await this.service.getUserOrders(req.user!.id);
    return this.success(res, { orders });
  });

  /**
   * Get user order details
   */
  getUserOrderDetails = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orderId } = req.params;
    const order = await this.service.getUserOrderDetails(orderId, req.user!.id);
    return this.success(res, { order });
  });

  /**
   * Get admin orders
   */
  getAdminOrders = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orders = await this.service.getAdminOrders();
    return this.success(res, { orders });
  });

  /**
   * Get order details (for admin)
   */
  getAdminOrderDetails = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orderId } = req.params;
    const order = await this.service.getAdminOrderDetails(orderId);
    return this.success(res, { order });
  });
}

// Export controller instance
export const orderController = new OrderController();


