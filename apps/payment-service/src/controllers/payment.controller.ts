/**
 * Payment Controller
 * Handles HTTP requests for payment operations
 */

import { BaseController } from '@packages/base';
import { PaymentService } from '../services/payment.service';
import { Request, Response } from 'express';
import {
  CreatePaymentIntentDto,
  CreatePaymentSessionDto,
  CreateRefundDto,
} from '../dto/payment.dto';

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

export class PaymentController extends BaseController<PaymentService> {
  constructor() {
    super(new PaymentService());
  }

  // ==================== Payment Session Endpoints ====================

  /**
   * Create payment session
   * POST /api/create-payment-session
   */
  createPaymentSession = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    /*
      #swagger.tags = ['Payments']
      #swagger.summary = 'Create a new payment session'
      #swagger.description = 'Creates a payment session for checkout process'
      #swagger.parameters['body'] = {
        in: 'body',
        required: true,
        schema: { $ref: '#/definitions/CreatePaymentSession' }
      }
      #swagger.responses[200] = {
        description: 'Payment session created successfully',
        schema: { sessionId: 'string', message: 'string' }
      }
    */
    const data: CreatePaymentSessionDto = req.body;
    const result = await this.service.createPaymentSession(data, req.user!.id);
    return this.success(res, result, 'Payment session created successfully', 200);
  });

  /**
   * Verify payment session
   * GET /api/verify-payment-session
   */
  verifyPaymentSession = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    /*
      #swagger.tags = ['Payments']
      #swagger.summary = 'Verify payment session'
      #swagger.description = 'Verify and get details of a payment session'
      #swagger.parameters['sessionId'] = {
        in: 'query',
        required: true,
        type: 'string'
      }
      #swagger.responses[200] = {
        description: 'Payment session details'
      }
    */
    const sessionId = req.query.sessionId as string;
    const result = await this.service.verifyPaymentSession(sessionId, req.user!.id);
    return this.success(res, { session: result });
  });

  // ==================== Payment Intent Endpoints ====================

  /**
   * Create payment intent
   * POST /api/create-payment-intent
   */
  createPaymentIntent = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    /*
      #swagger.tags = ['Payments']
      #swagger.summary = 'Create payment intent'
      #swagger.description = 'Creates a Stripe payment intent for processing payment'
      #swagger.parameters['body'] = {
        in: 'body',
        required: true,
        schema: { $ref: '#/definitions/CreatePaymentIntent' }
      }
      #swagger.responses[200] = {
        description: 'Payment intent created',
        schema: { clientSecret: 'string', paymentIntentId: 'string' }
      }
    */
    const data: CreatePaymentIntentDto = req.body;
    const result = await this.service.createPaymentIntent(data, req.user!.id);
    return this.success(res, result);
  });

  // ==================== Webhook Endpoints ====================

  /**
   * Handle Stripe webhook
   * POST /api/webhook/stripe
   */
  handleStripeWebhook = this.asyncHandler(async (req: any, res: Response) => {
    /*
      #swagger.tags = ['Webhooks']
      #swagger.summary = 'Stripe webhook handler'
      #swagger.description = 'Handles incoming Stripe webhook events'
    */
    const stripeSignature = req.headers['stripe-signature'] as string;
    if (!stripeSignature) {
      return res.status(400).send('Missing Stripe signature');
    }

    const rawBody = req.rawBody;

    try {
      const result = await this.service.handleStripeWebhook(rawBody, stripeSignature);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Webhook error:', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  // ==================== Refund Endpoints ====================

  /**
   * Request refund
   * POST /api/refunds
   */
  requestRefund = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    /*
      #swagger.tags = ['Refunds']
      #swagger.summary = 'Request a refund'
      #swagger.description = 'Submit a refund request for a payment'
      #swagger.parameters['body'] = {
        in: 'body',
        required: true,
        schema: { $ref: '#/definitions/RefundRequest' }
      }
      #swagger.responses[200] = {
        description: 'Refund request created'
      }
    */
    const data: CreateRefundDto = req.body;
    const result = await this.service.requestRefund(data, req.user!.id);
    return this.success(res, result, 'Refund request submitted successfully', 201);
  });

  /**
   * Approve refund (admin only)
   * POST /api/refunds/:id/approve
   */
  approveRefund = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    /*
      #swagger.tags = ['Refunds']
      #swagger.summary = 'Approve refund'
      #swagger.description = 'Admin approves and processes a refund request'
      #swagger.parameters['id'] = {
        in: 'path',
        required: true,
        type: 'string'
      }
      #swagger.responses[200] = {
        description: 'Refund approved and processed'
      }
    */
    const refundId = req.params.id;
    const result = await this.service.approveRefund(refundId, req.admin!.id);
    return this.success(res, result, 'Refund approved successfully');
  });

  /**
   * Get pending refunds (admin only)
   * GET /api/refunds/pending
   */
  getPendingRefunds = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    /*
      #swagger.tags = ['Refunds']
      #swagger.summary = 'Get pending refunds'
      #swagger.description = 'Admin retrieves list of pending refund requests'
      #swagger.responses[200] = {
        description: 'List of pending refunds'
      }
    */
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 20;
    const result = await this.service.getPendingRefunds({ skip, take });
    return this.success(res, result);
  });

  /**
   * Get order refunds
   * GET /api/refunds/order/:orderId
   */
  getOrderRefunds = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    /*
      #swagger.tags = ['Refunds']
      #swagger.summary = 'Get order refunds'
      #swagger.description = 'Get all refunds for a specific order'
      #swagger.parameters['orderId'] = {
        in: 'path',
        required: true,
        type: 'string'
      }
      #swagger.responses[200] = {
        description: 'List of refunds for the order'
      }
    */
    const orderId = req.params.orderId;
    const result = await this.service.getOrderRefunds(orderId);
    return this.success(res, result);
  });

  // ==================== Payment History Endpoints ====================

  /**
   * Get user's payment history
   * GET /api/payments/history
   */
  getPaymentHistory = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    /*
      #swagger.tags = ['Payments']
      #swagger.summary = 'Get payment history'
      #swagger.description = 'Get user payment history'
      #swagger.responses[200] = {
        description: 'Payment history list'
      }
    */
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 20;
    const result = await this.service.getUserPayments(req.user!.id, { skip, take });
    return this.success(res, result);
  });

  /**
   * Get payment by ID
   * GET /api/payments/:id
   */
  getPaymentById = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    /*
      #swagger.tags = ['Payments']
      #swagger.summary = 'Get payment details'
      #swagger.description = 'Get details of a specific payment'
      #swagger.parameters['id'] = {
        in: 'path',
        required: true,
        type: 'string'
      }
      #swagger.responses[200] = {
        description: 'Payment details',
        schema: { $ref: '#/definitions/PaymentResponse' }
      }
    */
    const paymentId = req.params.id;
    const result = await this.service.getPaymentById(paymentId);
    return this.success(res, result);
  });

  /**
   * Get payment by order ID
   * GET /api/payments/order/:orderId
   */
  getPaymentByOrderId = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    /*
      #swagger.tags = ['Payments']
      #swagger.summary = 'Get payment by order'
      #swagger.description = 'Get payment details for a specific order'
      #swagger.parameters['orderId'] = {
        in: 'path',
        required: true,
        type: 'string'
      }
      #swagger.responses[200] = {
        description: 'Payment for the order'
      }
    */
    const orderId = req.params.orderId;
    const result = await this.service.getPaymentByOrderId(orderId);
    return this.success(res, result);
  });

  // ==================== Seller Payout Endpoints ====================

  /**
   * Get seller payouts
   * GET /api/payouts/seller
   */
  getSellerPayouts = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    /*
      #swagger.tags = ['Payments']
      #swagger.summary = 'Get seller payouts'
      #swagger.description = 'Get payout history for authenticated seller'
      #swagger.responses[200] = {
        description: 'Seller payout history'
      }
    */
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 20;
    const result = await this.service.getSellerPayouts(req.seller!.id, { skip, take });
    return this.success(res, result);
  });

  /**
   * Get seller payout statistics
   * GET /api/payouts/seller/stats
   */
  getSellerPayoutStats = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    /*
      #swagger.tags = ['Payments']
      #swagger.summary = 'Get seller payout statistics'
      #swagger.description = 'Get payout statistics for authenticated seller'
      #swagger.responses[200] = {
        description: 'Seller payout statistics'
      }
    */
    const result = await this.service.getSellerPayoutStats(req.seller!.id);
    return this.success(res, result);
  });

  // ==================== Statistics Endpoints ====================

  /**
   * Get payment statistics (admin only)
   * GET /api/payments/statistics
   */
  getPaymentStatistics = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    /*
      #swagger.tags = ['Payments']
      #swagger.summary = 'Get payment statistics'
      #swagger.description = 'Admin gets payment statistics for date range'
      #swagger.parameters['startDate'] = { in: 'query', type: 'string', format: 'date' }
      #swagger.parameters['endDate'] = { in: 'query', type: 'string', format: 'date' }
      #swagger.responses[200] = {
        description: 'Payment statistics'
      }
    */
    const startDate = new Date(req.query.startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const endDate = new Date(req.query.endDate as string || new Date());
    const result = await this.service.getPaymentStatistics(startDate, endDate);
    return this.success(res, result);
  });
}

export const paymentController = new PaymentController();
