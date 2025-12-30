/**
 * Payment Types and Interfaces
 */

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'requires_action'
  | 'requires_confirmation'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type RefundStatus = 
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type WebhookEventType =
  | 'payment_intent.created'
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'payment_intent.canceled'
  | 'charge.refunded'
  | 'charge.dispute.created'
  | 'transfer.created'
  | 'payout.paid'
  | 'payout.failed';

export interface PaymentIntentRequest {
  amount: number;
  currency: string;
  customerId?: string;
  paymentMethodTypes?: string[];
  metadata?: Record<string, string>;
  description?: string;
  // Marketplace specific
  applicationFeeAmount?: number;
  transferDestination?: string; // Connected account ID
  onBehalfOf?: string;
}

export interface PaymentIntentResponse {
  id: string;
  clientSecret?: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paymentMethod?: string;
  metadata?: Record<string, string>;
  createdAt: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
  failureMessage?: string;
  rawResponse?: any;
}

export interface RefundRequest {
  paymentIntentId: string;
  amount?: number; // If not provided, full refund
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
}

export interface RefundResponse {
  id: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason?: string;
  createdAt: Date;
  failureMessage?: string;
  rawResponse?: any;
}

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  data: any;
  createdAt: Date;
  rawEvent: any;
}

export interface CustomerInfo {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault?: boolean;
}

export interface TransferRequest {
  amount: number;
  currency: string;
  destinationAccountId: string;
  metadata?: Record<string, string>;
  description?: string;
  sourceTransaction?: string;
}

export interface TransferResponse {
  id: string;
  amount: number;
  currency: string;
  destinationAccountId: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  createdAt: Date;
  rawResponse?: any;
}

export interface PaymentGatewayConfig {
  provider: 'stripe' | 'vnpay' | 'momo' | 'paypal';
  secretKey: string;
  publicKey?: string;
  webhookSecret?: string;
  environment?: 'sandbox' | 'production';
  additionalConfig?: Record<string, any>;
}
