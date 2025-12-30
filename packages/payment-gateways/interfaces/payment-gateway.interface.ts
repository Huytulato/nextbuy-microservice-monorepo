/**
 * Payment Gateway Interface
 * All payment providers must implement this interface
 */

import {
  PaymentIntentRequest,
  PaymentIntentResponse,
  RefundRequest,
  RefundResponse,
  WebhookEvent,
  PaymentMethod,
  CustomerInfo,
  TransferRequest,
  TransferResponse,
} from '../types/payment.types';

export interface IPaymentGateway {
  /**
   * Gateway provider name
   */
  readonly providerName: string;

  /**
   * Create a payment intent
   */
  createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse>;

  /**
   * Confirm a payment intent
   */
  confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse>;

  /**
   * Cancel a payment intent
   */
  cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse>;

  /**
   * Retrieve payment intent details
   */
  getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse>;

  /**
   * Process a refund
   */
  createRefund(request: RefundRequest): Promise<RefundResponse>;

  /**
   * Get refund details
   */
  getRefund(refundId: string): Promise<RefundResponse>;

  /**
   * Verify webhook signature and parse event
   */
  verifyWebhook(payload: string | Buffer, signature: string): WebhookEvent;

  /**
   * Create or retrieve a customer
   */
  createCustomer(customer: CustomerInfo): Promise<string>;

  /**
   * Get available payment methods for customer
   */
  getPaymentMethods(customerId: string): Promise<PaymentMethod[]>;

  /**
   * Create a transfer to connected account (for marketplace)
   */
  createTransfer(request: TransferRequest): Promise<TransferResponse>;

  /**
   * Get account balance
   */
  getBalance(): Promise<{ available: number; pending: number; currency: string }>;
}

/**
 * Base abstract class with common functionality
 */
export abstract class BasePaymentGateway implements IPaymentGateway {
  abstract readonly providerName: string;

  abstract createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse>;
  abstract confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse>;
  abstract cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse>;
  abstract getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse>;
  abstract createRefund(request: RefundRequest): Promise<RefundResponse>;
  abstract getRefund(refundId: string): Promise<RefundResponse>;
  abstract verifyWebhook(payload: string | Buffer, signature: string): WebhookEvent;
  abstract createCustomer(customer: CustomerInfo): Promise<string>;
  abstract getPaymentMethods(customerId: string): Promise<PaymentMethod[]>;
  abstract createTransfer(request: TransferRequest): Promise<TransferResponse>;
  abstract getBalance(): Promise<{ available: number; pending: number; currency: string }>;

  /**
   * Convert amount to smallest currency unit (cents)
   */
  protected toSmallestUnit(amount: number, currency: string = 'usd'): number {
    const zeroDecimalCurrencies = ['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'];
    if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
      return Math.round(amount);
    }
    return Math.round(amount * 100);
  }

  /**
   * Convert from smallest currency unit to standard
   */
  protected fromSmallestUnit(amount: number, currency: string = 'usd'): number {
    const zeroDecimalCurrencies = ['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'];
    if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
      return amount;
    }
    return amount / 100;
  }
}
