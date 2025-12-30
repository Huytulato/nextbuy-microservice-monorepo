/**
 * Payment DTOs for request/response validation
 */

// ==================== Payment Session DTOs ====================

export interface CartItemDto {
  id: string;
  quantity: number;
  sale_price: number;
  shopId: string;
  selectedOptions?: any[];
  variationId?: string;
}

export interface CouponDto {
  code: string;
  discountAmount?: number;
  discountPercent?: number;
  disconnectProductId?: string;
}

export interface CreatePaymentSessionDto {
  cart: CartItemDto[];
  selectedAddressId?: string;
  coupon?: CouponDto;
}

export interface PaymentSessionResponseDto {
  sessionId: string;
  message: string;
  totalAmount?: number;
  expiresAt?: Date;
}

export interface VerifyPaymentSessionDto {
  sessionId: string;
}

export interface PaymentSessionDetailsDto {
  sessionId: string;
  userId: string;
  totalAmount: number;
  sellers: SellerPaymentInfoDto[];
  cart: CartItemDto[];
  coupon?: CouponDto;
  status: string;
  shipping_addressesId?: string;
}

// ==================== Payment Intent DTOs ====================

export interface SellerPaymentInfoDto {
  shopId: string;
  sellerId: string;
  stripeId?: string;
}

export interface CreatePaymentIntentDto {
  amount: number;
  currency?: string;
  sessionId: string;
  sellerStripeAccountId?: string;
  getSellerStripeAccountId?: string;
}

export interface PaymentIntentResponseDto {
  clientSecret: string;
  paymentIntentId?: string;
}

// ==================== Payment Record DTOs ====================

export interface CreatePaymentDto {
  orderId: string;
  userId: string;
  amount: number;
  currency?: string;
  method: 'credit_card' | 'debit_card' | 'bank_transfer' | 'e_wallet' | 'cod';
  gatewayProvider: string;
  gatewayPaymentId?: string;
  platformFee?: number;
  sellerAmount?: number;
  metadata?: Record<string, any>;
}

export interface UpdatePaymentStatusDto {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded' | 'cancelled';
  gatewayResponse?: any;
  failureReason?: string;
  paidAt?: Date;
}

export interface PaymentResponseDto {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  gatewayProvider: string;
  gatewayPaymentId?: string;
  platformFee: number;
  sellerAmount: number;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Refund DTOs ====================

export interface CreateRefundDto {
  paymentId: string;
  orderId: string;
  amount: number;
  reason?: string;
}

export interface ApproveRefundDto {
  approvedBy: string;
}

export interface RefundResponseDto {
  id: string;
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  reason?: string;
  status: string;
  gatewayRefundId?: string;
  requestedBy: string;
  approvedBy?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Transaction DTOs ====================

export interface CreateTransactionDto {
  paymentId: string;
  type: 'charge' | 'refund' | 'transfer' | 'payout' | 'platform_fee';
  amount: number;
  currency?: string;
  sellerId?: string;
  description?: string;
  gatewayReference?: string;
  metadata?: Record<string, any>;
}

export interface TransactionResponseDto {
  id: string;
  paymentId: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  sellerId?: string;
  gatewayReference?: string;
  description?: string;
  processedAt?: Date;
  createdAt: Date;
}

// ==================== Webhook DTOs ====================

export interface WebhookPayloadDto {
  type: string;
  data: any;
}

export interface StripeWebhookDto {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

// ==================== Payout DTOs ====================

export interface CreatePayoutDto {
  sellerId: string;
  amount: number;
  currency?: string;
  periodStart: Date;
  periodEnd: Date;
  ordersCount?: number;
  totalSales?: number;
  totalFees?: number;
}

export interface PayoutResponseDto {
  id: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: string;
  gatewayPayoutId?: string;
  periodStart: Date;
  periodEnd: Date;
  ordersCount: number;
  totalSales: number;
  totalFees: number;
  netAmount: number;
  processedAt?: Date;
  createdAt: Date;
}

// ==================== Statistics DTOs ====================

export interface PaymentStatsDto {
  totalPayments: number;
  totalAmount: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  refundedAmount: number;
  platformFees: number;
}

export interface SellerPaymentStatsDto {
  sellerId: string;
  totalSales: number;
  totalOrders: number;
  totalFees: number;
  netEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
}
