/**
 * Payment Events Handler
 * Handles Kafka events for payment-related operations
 */

import { publishNotificationEvent } from '@packages/utils/kafka/producer';

export interface PaymentCompletedEvent {
  paymentIntentId: string;
  sessionId: string;
  userId: string;
  amount: number;
  cart: any[];
  sellers: any[];
  shippingAddressId?: string;
  coupon?: any;
}

export interface PaymentFailedEvent {
  paymentIntentId: string;
  sessionId: string;
  userId: string;
  error: string;
}

export interface RefundCompletedEvent {
  refundId: string;
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
}

/**
 * Publish payment completed event
 */
export async function publishPaymentCompleted(data: PaymentCompletedEvent) {
  await publishNotificationEvent('payment.completed', data);
}

/**
 * Publish payment failed event
 */
export async function publishPaymentFailed(data: PaymentFailedEvent) {
  await publishNotificationEvent('payment.failed', data);
}

/**
 * Publish refund completed event
 */
export async function publishRefundCompleted(data: RefundCompletedEvent) {
  await publishNotificationEvent('refund.completed', data);
}

/**
 * Payment event types for Kafka topics
 */
export const PAYMENT_EVENTS = {
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  REFUND_REQUESTED: 'refund.requested',
  REFUND_APPROVED: 'refund.approved',
  REFUND_COMPLETED: 'refund.completed',
  PAYOUT_INITIATED: 'payout.initiated',
  PAYOUT_COMPLETED: 'payout.completed',
} as const;
