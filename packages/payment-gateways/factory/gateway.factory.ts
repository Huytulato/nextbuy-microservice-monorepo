/**
 * Payment Gateway Factory
 * Creates payment gateway instances based on configuration
 */

import { IPaymentGateway } from '../interfaces/payment-gateway.interface';
import { StripeGateway } from '../gateways/stripe.gateway';
import { PaymentGatewayConfig } from '../types/payment.types';

export class PaymentGatewayFactory {
  private static instances: Map<string, IPaymentGateway> = new Map();

  /**
   * Create or retrieve a payment gateway instance
   */
  static create(config: PaymentGatewayConfig): IPaymentGateway {
    const cacheKey = `${config.provider}_${config.environment || 'production'}`;

    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    let gateway: IPaymentGateway;

    switch (config.provider) {
      case 'stripe':
        gateway = new StripeGateway(config.secretKey, config.webhookSecret);
        break;

      case 'vnpay':
        // TODO: Implement VNPay gateway
        throw new Error('VNPay gateway not yet implemented');

      case 'momo':
        // TODO: Implement Momo gateway
        throw new Error('Momo gateway not yet implemented');

      case 'paypal':
        // TODO: Implement PayPal gateway
        throw new Error('PayPal gateway not yet implemented');

      default:
        throw new Error(`Unsupported payment provider: ${config.provider}`);
    }

    this.instances.set(cacheKey, gateway);
    return gateway;
  }

  /**
   * Get default Stripe gateway from environment
   */
  static getStripeGateway(): StripeGateway {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }

    return this.create({
      provider: 'stripe',
      secretKey,
      webhookSecret,
    }) as StripeGateway;
  }

  /**
   * Clear all cached instances (useful for testing)
   */
  static clearInstances(): void {
    this.instances.clear();
  }
}
