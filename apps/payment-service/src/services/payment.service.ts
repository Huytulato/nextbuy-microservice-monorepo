/**
 * Payment Service
 * Business logic for payment processing
 */

import { BaseService } from '@packages/base';
import {
  PaymentRepository,
  TransactionRepository,
  RefundRepository,
  PaymentSessionRepository,
  SellerPayoutRepository,
} from '../repositories/payment.repository';
import {
  CreatePaymentSessionDto,
  CreatePaymentIntentDto,
  CreatePaymentDto,
  CreateRefundDto,
  CreateTransactionDto,
  PaymentSessionDetailsDto,
} from '../dto/payment.dto';
import { ValidationError, NotFoundError, AuthError } from '@packages/error-handler';
import { PaymentGatewayFactory, StripeGateway } from '@packages/payment-gateways';
import prisma from '@packages/libs/prisma';
import redis from '@packages/libs/redis';
import { publishNotificationEvent } from '@packages/utils/kafka/producer';

const PLATFORM_FEE_PERCENT = 0.05; // 5% platform fee
const SESSION_TTL_SECONDS = 30 * 60; // 30 minutes

export class PaymentService extends BaseService<PaymentRepository> {
  private transactionRepository: TransactionRepository;
  private refundRepository: RefundRepository;
  private sessionRepository: PaymentSessionRepository;
  private payoutRepository: SellerPayoutRepository;
  private stripeGateway: StripeGateway;

  constructor() {
    super(new PaymentRepository());
    this.transactionRepository = new TransactionRepository();
    this.refundRepository = new RefundRepository();
    this.sessionRepository = new PaymentSessionRepository();
    this.payoutRepository = new SellerPayoutRepository();
    this.stripeGateway = PaymentGatewayFactory.getStripeGateway();
  }

  // ==================== Payment Session Methods ====================

  /**
   * Create a payment session
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

    // Check for existing session in Redis first
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
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
    
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
      expiresAt,
    };

    // Store in Redis with TTL
    await redis.set(
      `payment_session:${userId}:${sessionId}`,
      JSON.stringify(sessionData),
      'EX',
      SESSION_TTL_SECONDS
    );

    // Also store in database for persistence
    await this.sessionRepository.create({
      sessionId,
      userId,
      cart: data.cart as any,
      totalAmount,
      currency: 'usd',
      shippingAddressId: data.selectedAddressId,
      coupon: data.coupon as any,
      sellers: sellerData as any,
      status: 'pending',
      expiresAt,
    });

    return {
      sessionId,
      message: 'Payment session created successfully',
      totalAmount,
      expiresAt,
    };
  }

  /**
   * Verify and get payment session
   */
  async verifyPaymentSession(sessionId: string, userId: string): Promise<PaymentSessionDetailsDto> {
    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    if (!userId) {
      throw new AuthError('Unauthorized: User not authenticated');
    }

    // Try Redis first
    const sessionKey = `payment_session:${userId}:${sessionId}`;
    let sessionData = await redis.get(sessionKey);

    if (!sessionData) {
      // Fallback to database
      const dbSession = await this.sessionRepository.findBySessionId(sessionId);
      if (!dbSession || dbSession.userId !== userId) {
        throw new NotFoundError('Payment session not found or expired');
      }

      if (dbSession.status === 'completed') {
        throw new ValidationError('Payment session already completed');
      }

      if (new Date(dbSession.expiresAt) < new Date()) {
        throw new ValidationError('Payment session has expired');
      }

      return {
        sessionId: dbSession.sessionId,
        userId: dbSession.userId,
        totalAmount: dbSession.totalAmount,
        sellers: dbSession.sellers as any,
        cart: dbSession.cart as any,
        coupon: dbSession.coupon as any,
        status: dbSession.status,
        shipping_addressesId: dbSession.shippingAddressId || undefined,
      };
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

  // ==================== Payment Intent Methods ====================

  /**
   * Create payment intent with Stripe
   */
  async createPaymentIntent(data: CreatePaymentIntentDto, userId: string) {
    const stripeAccountId = data.sellerStripeAccountId || data.getSellerStripeAccountId;

    if (!stripeAccountId) {
      throw new ValidationError('Stripe account ID is required');
    }

    if (!data.sessionId) {
      throw new ValidationError('Session ID is required');
    }

    const customerAmount = data.amount;
    const platformFee = customerAmount * PLATFORM_FEE_PERCENT;

    const paymentIntent = await this.stripeGateway.createPaymentIntent({
      amount: customerAmount,
      currency: data.currency || 'usd',
      applicationFeeAmount: platformFee,
      transferDestination: stripeAccountId,
      metadata: {
        sessionId: data.sessionId,
        userId,
      },
    });

    return {
      clientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.id,
    };
  }

  // ==================== Webhook Handling ====================

  /**
   * Handle Stripe webhook event
   */
  async handleStripeWebhook(payload: string | Buffer, signature: string) {
    const event = this.stripeGateway.verifyWebhook(payload, signature);

    switch (event.type) {
      case 'payment_intent.succeeded':
        return this.handlePaymentSuccess(event.data);

      case 'payment_intent.payment_failed':
        return this.handlePaymentFailure(event.data);

      case 'charge.refunded':
        return this.handleRefundCompleted(event.data);

      default:
        return { received: true, type: event.type };
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(paymentIntentData: any) {
    const sessionId = paymentIntentData.metadata?.sessionId;
    const userId = paymentIntentData.metadata?.userId;

    if (!sessionId || !userId) {
      throw new ValidationError('Missing session or user information');
    }

    // Get session data
    const sessionKey = `payment_session:${userId}:${sessionId}`;
    const sessionData = await redis.get(sessionKey);

    if (!sessionData) {
      throw new NotFoundError('Payment session not found or expired');
    }

    const parsedSession = JSON.parse(sessionData);

    // Mark session as completed
    parsedSession.status = 'completed';
    await redis.set(sessionKey, JSON.stringify(parsedSession), 'EX', SESSION_TTL_SECONDS);

    // Update database session
    await this.sessionRepository.updateStatus(sessionId, 'completed');

    // Publish event for order creation
    await publishNotificationEvent('payment.completed', {
      paymentIntentId: paymentIntentData.id,
      sessionId,
      userId,
      amount: paymentIntentData.amount / 100,
      cart: parsedSession.cart,
      sellers: parsedSession.sellers,
      shippingAddressId: parsedSession.shipping_addressesId,
      coupon: parsedSession.coupon,
    });

    return {
      success: true,
      sessionId,
      message: 'Payment processed successfully',
    };
  }

  /**
   * Handle payment failure
   */
  private async handlePaymentFailure(paymentIntentData: any) {
    const sessionId = paymentIntentData.metadata?.sessionId;
    const userId = paymentIntentData.metadata?.userId;

    if (sessionId && userId) {
      // Update session status
      await this.sessionRepository.updateStatus(sessionId, 'failed');

      // Publish failure event
      await publishNotificationEvent('payment.failed', {
        paymentIntentId: paymentIntentData.id,
        sessionId,
        userId,
        error: paymentIntentData.last_payment_error?.message || 'Payment failed',
      });
    }

    return {
      success: false,
      message: 'Payment failed',
      error: paymentIntentData.last_payment_error?.message,
    };
  }

  /**
   * Handle refund completed
   */
  private async handleRefundCompleted(chargeData: any) {
    const paymentIntentId = chargeData.payment_intent;

    // Find payment by gateway ID
    const payment = await this.repository.findByGatewayPaymentId(paymentIntentId);
    if (!payment) {
      return { received: true, message: 'Payment not found for refund' };
    }

    // Update payment status
    const refundAmount = chargeData.amount_refunded / 100;
    const isFullRefund = refundAmount >= payment.amount;

    await this.repository.updateStatus(
      payment.id,
      isFullRefund ? 'refunded' : 'partially_refunded'
    );

    // Update any pending refunds
    const pendingRefunds = await this.refundRepository.findByPaymentId(payment.id);
    for (const refund of pendingRefunds) {
      if (refund.status === 'processing') {
        await this.refundRepository.updateStatus(refund.id, 'completed', {
          processedAt: new Date(),
        });
      }
    }

    return {
      success: true,
      message: 'Refund processed',
      paymentId: payment.id,
    };
  }

  // ==================== Refund Methods ====================

  /**
   * Request a refund
   */
  async requestRefund(data: CreateRefundDto, userId: string) {
    const payment = await this.repository.findById(data.paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status !== 'completed') {
      throw new ValidationError('Can only refund completed payments');
    }

    if (data.amount > payment.amount) {
      throw new ValidationError('Refund amount exceeds payment amount');
    }

    // Check for existing refunds
    const existingRefunds = await this.refundRepository.findByPaymentId(data.paymentId);
    const totalRefunded = existingRefunds.reduce((sum, r) => {
      return r.status === 'completed' ? sum + r.amount : sum;
    }, 0);

    if (totalRefunded + data.amount > payment.amount) {
      throw new ValidationError('Total refund amount would exceed original payment');
    }

    // Create refund record
    const refund = await this.refundRepository.create({
      payment: { connect: { id: data.paymentId } },
      orderId: data.orderId,
      userId,
      amount: data.amount,
      currency: payment.currency,
      reason: data.reason,
      status: 'pending',
      requestedBy: userId,
    });

    return refund;
  }

  /**
   * Approve and process refund (admin only)
   */
  async approveRefund(refundId: string, adminId: string) {
    const refund = await this.refundRepository.findById(refundId);
    if (!refund) {
      throw new NotFoundError('Refund not found');
    }

    if (refund.status !== 'pending') {
      throw new ValidationError('Refund is not in pending status');
    }

    const payment = await this.repository.findById(refund.paymentId);
    if (!payment || !payment.gatewayPaymentId) {
      throw new ValidationError('Cannot process refund: Payment gateway ID not found');
    }

    // Update status to processing
    await this.refundRepository.updateStatus(refundId, 'processing', {
      approvedBy: adminId,
    });

    try {
      // Process refund through gateway
      const gatewayRefund = await this.stripeGateway.createRefund({
        paymentIntentId: payment.gatewayPaymentId,
        amount: refund.amount,
        reason: 'requested_by_customer',
      });

      // Update refund with gateway response
      await this.refundRepository.updateStatus(refundId, 'completed', {
        gatewayRefundId: gatewayRefund.id,
        gatewayResponse: gatewayRefund.rawResponse,
        processedAt: new Date(),
      });

      // Create transaction record
      await this.transactionRepository.create({
        payment: { connect: { id: payment.id } },
        type: 'refund',
        amount: refund.amount,
        currency: refund.currency,
        status: 'completed',
        gatewayReference: gatewayRefund.id,
        description: `Refund for order ${refund.orderId}`,
        processedAt: new Date(),
      });

      return {
        success: true,
        refundId: gatewayRefund.id,
        message: 'Refund processed successfully',
      };
    } catch (error: any) {
      await this.refundRepository.updateStatus(refundId, 'rejected');
      throw new ValidationError(`Refund failed: ${error.message}`);
    }
  }

  /**
   * Get refunds for an order
   */
  async getOrderRefunds(orderId: string) {
    return this.refundRepository.findByOrderId(orderId);
  }

  /**
   * Get pending refunds for admin
   */
  async getPendingRefunds(options?: { skip?: number; take?: number }) {
    return this.refundRepository.findPendingRefunds(options);
  }

  // ==================== Payment History Methods ====================

  /**
   * Get user's payment history
   */
  async getUserPayments(userId: string, options?: { skip?: number; take?: number }) {
    return this.repository.findByUserId(userId, options);
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string) {
    const payment = await this.repository.findById(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }
    return payment;
  }

  /**
   * Get payment by order ID
   */
  async getPaymentByOrderId(orderId: string) {
    return this.repository.findByOrderId(orderId);
  }

  // ==================== Seller Payout Methods ====================

  /**
   * Get seller's payout history
   */
  async getSellerPayouts(sellerId: string, options?: { skip?: number; take?: number }) {
    return this.payoutRepository.findBySellerId(sellerId, options);
  }

  /**
   * Get seller payout statistics
   */
  async getSellerPayoutStats(sellerId: string) {
    return this.payoutRepository.getSellerStatistics(sellerId);
  }

  // ==================== Statistics Methods ====================

  /**
   * Get payment statistics for date range
   */
  async getPaymentStatistics(startDate: Date, endDate: Date) {
    return this.repository.getStatistics(startDate, endDate);
  }
}
