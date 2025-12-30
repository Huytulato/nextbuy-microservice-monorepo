/**
 * Stripe Payment Gateway Implementation
 */

import Stripe from 'stripe';
import { BasePaymentGateway } from '../interfaces/payment-gateway.interface';
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
  PaymentStatus,
  WebhookEventType,
} from '../types/payment.types';

export class StripeGateway extends BasePaymentGateway {
  readonly providerName = 'stripe';
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(secretKey: string, webhookSecret?: string) {
    super();
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-11-17.clover',
    });
    this.webhookSecret = webhookSecret || '';
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: this.toSmallestUnit(request.amount, request.currency),
      currency: request.currency,
      payment_method_types: request.paymentMethodTypes || ['card'],
      metadata: request.metadata,
      description: request.description,
    };

    // Add customer if provided
    if (request.customerId) {
      params.customer = request.customerId;
    }

    // Marketplace: Platform fee and transfer destination
    if (request.applicationFeeAmount) {
      params.application_fee_amount = this.toSmallestUnit(request.applicationFeeAmount, request.currency);
    }

    if (request.transferDestination) {
      params.transfer_data = {
        destination: request.transferDestination,
      };
    }

    if (request.onBehalfOf) {
      params.on_behalf_of = request.onBehalfOf;
    }

    const paymentIntent = await this.stripe.paymentIntents.create(params);

    return this.mapPaymentIntentResponse(paymentIntent);
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);
    return this.mapPaymentIntentResponse(paymentIntent);
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);
    return this.mapPaymentIntentResponse(paymentIntent);
  }

  /**
   * Retrieve payment intent details
   */
  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    return this.mapPaymentIntentResponse(paymentIntent);
  }

  /**
   * Process a refund
   */
  async createRefund(request: RefundRequest): Promise<RefundResponse> {
    const params: Stripe.RefundCreateParams = {
      payment_intent: request.paymentIntentId,
      metadata: request.metadata,
    };

    if (request.amount) {
      params.amount = this.toSmallestUnit(request.amount, 'usd');
    }

    if (request.reason) {
      params.reason = request.reason;
    }

    const refund = await this.stripe.refunds.create(params);

    return {
      id: refund.id,
      paymentIntentId: request.paymentIntentId,
      amount: this.fromSmallestUnit(refund.amount || 0),
      currency: refund.currency,
      status: this.mapRefundStatus(refund.status),
      reason: refund.reason || undefined,
      createdAt: new Date(refund.created * 1000),
      failureMessage: refund.failure_reason || undefined,
      rawResponse: refund,
    };
  }

  /**
   * Get refund details
   */
  async getRefund(refundId: string): Promise<RefundResponse> {
    const refund = await this.stripe.refunds.retrieve(refundId);

    return {
      id: refund.id,
      paymentIntentId: refund.payment_intent as string,
      amount: this.fromSmallestUnit(refund.amount || 0),
      currency: refund.currency,
      status: this.mapRefundStatus(refund.status),
      reason: refund.reason || undefined,
      createdAt: new Date(refund.created * 1000),
      failureMessage: refund.failure_reason || undefined,
      rawResponse: refund,
    };
  }

  /**
   * Verify webhook signature and parse event
   */
  verifyWebhook(payload: string | Buffer, signature: string): WebhookEvent {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret
    );

    return {
      id: event.id,
      type: event.type as WebhookEventType,
      data: event.data.object,
      createdAt: new Date(event.created * 1000),
      rawEvent: event,
    };
  }

  /**
   * Create or retrieve a customer
   */
  async createCustomer(customer: CustomerInfo): Promise<string> {
    // Check if customer already exists
    const existingCustomers = await this.stripe.customers.list({
      email: customer.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0].id;
    }

    const newCustomer = await this.stripe.customers.create({
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      metadata: customer.metadata,
    });

    return newCustomer.id;
  }

  /**
   * Get available payment methods for customer
   */
  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return paymentMethods.data.map((pm) => ({
      id: pm.id,
      type: pm.type,
      card: pm.card
        ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          }
        : undefined,
    }));
  }

  /**
   * Create a transfer to connected account (for marketplace)
   */
  async createTransfer(request: TransferRequest): Promise<TransferResponse> {
    const params: Stripe.TransferCreateParams = {
      amount: this.toSmallestUnit(request.amount, request.currency),
      currency: request.currency,
      destination: request.destinationAccountId,
      metadata: request.metadata,
      description: request.description,
    };

    if (request.sourceTransaction) {
      params.source_transaction = request.sourceTransaction;
    }

    const transfer = await this.stripe.transfers.create(params);

    return {
      id: transfer.id,
      amount: this.fromSmallestUnit(transfer.amount),
      currency: transfer.currency,
      destinationAccountId: transfer.destination as string,
      status: 'paid',
      createdAt: new Date(transfer.created * 1000),
      rawResponse: transfer,
    };
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<{ available: number; pending: number; currency: string }> {
    const balance = await this.stripe.balance.retrieve();

    const availableUSD = balance.available.find((b) => b.currency === 'usd');
    const pendingUSD = balance.pending.find((b) => b.currency === 'usd');

    return {
      available: this.fromSmallestUnit(availableUSD?.amount || 0),
      pending: this.fromSmallestUnit(pendingUSD?.amount || 0),
      currency: 'usd',
    };
  }

  /**
   * Create a connected account for sellers (Stripe Connect)
   */
  async createConnectedAccount(email: string, country: string = 'US'): Promise<string> {
    const account = await this.stripe.accounts.create({
      type: 'express',
      country,
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    return account.id;
  }

  /**
   * Create account onboarding link
   */
  async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<string> {
    const accountLink = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return accountLink.url;
  }

  /**
   * Check if connected account is fully onboarded
   */
  async isAccountOnboarded(accountId: string): Promise<boolean> {
    const account = await this.stripe.accounts.retrieve(accountId);
    return account.details_submitted && account.charges_enabled;
  }

  /**
   * Map Stripe payment intent status to our status
   */
  private mapPaymentIntentStatus(status: Stripe.PaymentIntent.Status): PaymentStatus {
    const statusMap: Record<Stripe.PaymentIntent.Status, PaymentStatus> = {
      requires_payment_method: 'pending',
      requires_confirmation: 'requires_confirmation',
      requires_action: 'requires_action',
      processing: 'processing',
      requires_capture: 'processing',
      canceled: 'cancelled',
      succeeded: 'succeeded',
    };
    return statusMap[status] || 'pending';
  }

  /**
   * Map Stripe refund status to our status
   */
  private mapRefundStatus(status: string | null): RefundResponse['status'] {
    const statusMap: Record<string, RefundResponse['status']> = {
      pending: 'pending',
      succeeded: 'succeeded',
      failed: 'failed',
      canceled: 'cancelled',
    };
    return statusMap[status || 'pending'] || 'pending';
  }

  /**
   * Map Stripe payment intent to our response format
   */
  private mapPaymentIntentResponse(paymentIntent: Stripe.PaymentIntent): PaymentIntentResponse {
    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || undefined,
      status: this.mapPaymentIntentStatus(paymentIntent.status),
      amount: this.fromSmallestUnit(paymentIntent.amount),
      currency: paymentIntent.currency,
      paymentMethod: paymentIntent.payment_method as string | undefined,
      metadata: paymentIntent.metadata as Record<string, string>,
      createdAt: new Date(paymentIntent.created * 1000),
      failureMessage: paymentIntent.last_payment_error?.message,
      rawResponse: paymentIntent,
    };
  }
}
