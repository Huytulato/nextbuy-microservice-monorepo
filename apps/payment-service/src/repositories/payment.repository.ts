/**
 * Payment Repository
 * Data access layer for payment-related entities
 */

import { BaseRepository } from '@packages/base';
import prisma from '@packages/libs/prisma';
import {
  payments,
  transactions,
  refunds,
  payment_sessions,
  seller_payouts,
  Prisma,
  PaymentStatus,
  TransactionType,
  TransactionStatus,
  RefundStatus,
} from '@prisma/client';

// ==================== Payment Repository ====================

export class PaymentRepository extends BaseRepository<
  payments,
  Prisma.paymentsCreateInput,
  Prisma.paymentsUpdateInput,
  Prisma.paymentsWhereInput
> {
  constructor() {
    super(prisma.payments);
  }

  /**
   * Find payment by gateway payment ID
   */
  async findByGatewayPaymentId(gatewayPaymentId: string): Promise<payments | null> {
    return this.model.findUnique({
      where: { gatewayPaymentId },
      include: {
        transactions: true,
        refunds: true,
      },
    });
  }

  /**
   * Find payment by order ID
   */
  async findByOrderId(orderId: string): Promise<payments | null> {
    return this.model.findFirst({
      where: { orderId },
      include: {
        transactions: true,
        refunds: true,
      },
    });
  }

  /**
   * Find payments by user ID
   */
  async findByUserId(
    userId: string,
    options?: {
      skip?: number;
      take?: number;
      status?: PaymentStatus;
    }
  ): Promise<payments[]> {
    return this.model.findMany({
      where: {
        userId,
        ...(options?.status && { status: options.status }),
      },
      include: {
        transactions: true,
        refunds: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take,
    });
  }

  /**
   * Update payment status
   */
  async updateStatus(
    id: string,
    status: PaymentStatus,
    additionalData?: {
      gatewayResponse?: any;
      failureReason?: string;
      paidAt?: Date;
    }
  ): Promise<payments> {
    return this.model.update({
      where: { id },
      data: {
        status,
        ...additionalData,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get payment statistics for a date range
   */
  async getStatistics(startDate: Date, endDate: Date) {
    const [
      totalPayments,
      completedPayments,
      failedPayments,
      totalAmount,
      platformFees,
    ] = await Promise.all([
      this.model.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.model.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'completed',
        },
      }),
      this.model.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'failed',
        },
      }),
      this.model.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'completed',
        },
        _sum: { amount: true },
      }),
      this.model.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'completed',
        },
        _sum: { platformFee: true },
      }),
    ]);

    return {
      totalPayments,
      completedPayments,
      failedPayments,
      totalAmount: totalAmount._sum.amount || 0,
      platformFees: platformFees._sum.platformFee || 0,
    };
  }
}

// ==================== Transaction Repository ====================

export class TransactionRepository extends BaseRepository<
  transactions,
  Prisma.transactionsCreateInput,
  Prisma.transactionsUpdateInput,
  Prisma.transactionsWhereInput
> {
  constructor() {
    super(prisma.transactions);
  }

  /**
   * Find transactions by payment ID
   */
  async findByPaymentId(paymentId: string): Promise<transactions[]> {
    return this.model.findMany({
      where: { paymentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find transactions by seller ID
   */
  async findBySellerId(
    sellerId: string,
    options?: {
      skip?: number;
      take?: number;
      type?: TransactionType;
    }
  ): Promise<transactions[]> {
    return this.model.findMany({
      where: {
        sellerId,
        ...(options?.type && { type: options.type }),
      },
      include: {
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take,
    });
  }

  /**
   * Update transaction status
   */
  async updateStatus(
    id: string,
    status: TransactionStatus,
    processedAt?: Date
  ): Promise<transactions> {
    return this.model.update({
      where: { id },
      data: {
        status,
        processedAt: processedAt || new Date(),
        updatedAt: new Date(),
      },
    });
  }
}

// ==================== Refund Repository ====================

export class RefundRepository extends BaseRepository<
  refunds,
  Prisma.refundsCreateInput,
  Prisma.refundsUpdateInput,
  Prisma.refundsWhereInput
> {
  constructor() {
    super(prisma.refunds);
  }

  /**
   * Find refunds by payment ID
   */
  async findByPaymentId(paymentId: string): Promise<refunds[]> {
    return this.model.findMany({
      where: { paymentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find refunds by order ID
   */
  async findByOrderId(orderId: string): Promise<refunds[]> {
    return this.model.findMany({
      where: { orderId },
      include: {
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find pending refunds for admin review
   */
  async findPendingRefunds(options?: { skip?: number; take?: number }): Promise<refunds[]> {
    return this.model.findMany({
      where: { status: 'pending' },
      include: {
        payment: true,
      },
      orderBy: { createdAt: 'asc' },
      skip: options?.skip,
      take: options?.take,
    });
  }

  /**
   * Update refund status
   */
  async updateStatus(
    id: string,
    status: RefundStatus,
    additionalData?: {
      approvedBy?: string;
      gatewayRefundId?: string;
      gatewayResponse?: any;
      processedAt?: Date;
    }
  ): Promise<refunds> {
    return this.model.update({
      where: { id },
      data: {
        status,
        ...additionalData,
        updatedAt: new Date(),
      },
    });
  }
}

// ==================== Payment Session Repository ====================

export class PaymentSessionRepository extends BaseRepository<
  payment_sessions,
  Prisma.payment_sessionsCreateInput,
  Prisma.payment_sessionsUpdateInput,
  Prisma.payment_sessionsWhereInput
> {
  constructor() {
    super(prisma.payment_sessions);
  }

  /**
   * Find session by session ID
   */
  async findBySessionId(sessionId: string): Promise<payment_sessions | null> {
    return this.model.findUnique({
      where: { sessionId },
    });
  }

  /**
   * Find active sessions by user ID
   */
  async findActiveByUserId(userId: string): Promise<payment_sessions[]> {
    return this.model.findMany({
      where: {
        userId,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update session status
   */
  async updateStatus(sessionId: string, status: string): Promise<payment_sessions> {
    return this.model.update({
      where: { sessionId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete expired sessions
   */
  async deleteExpiredSessions(): Promise<number> {
    const result = await this.model.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        status: 'pending',
      },
    });
    return result.count;
  }
}

// ==================== Seller Payout Repository ====================

export class SellerPayoutRepository extends BaseRepository<
  seller_payouts,
  Prisma.seller_payoutsCreateInput,
  Prisma.seller_payoutsUpdateInput,
  Prisma.seller_payoutsWhereInput
> {
  constructor() {
    super(prisma.seller_payouts);
  }

  /**
   * Find payouts by seller ID
   */
  async findBySellerId(
    sellerId: string,
    options?: {
      skip?: number;
      take?: number;
      status?: string;
    }
  ): Promise<seller_payouts[]> {
    return this.model.findMany({
      where: {
        sellerId,
        ...(options?.status && { status: options.status }),
      },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take,
    });
  }

  /**
   * Get seller payout statistics
   */
  async getSellerStatistics(sellerId: string) {
    const [totalPayouts, pendingPayouts, completedPayouts] = await Promise.all([
      this.model.aggregate({
        where: { sellerId },
        _sum: { netAmount: true },
        _count: true,
      }),
      this.model.aggregate({
        where: { sellerId, status: 'pending' },
        _sum: { netAmount: true },
        _count: true,
      }),
      this.model.aggregate({
        where: { sellerId, status: 'completed' },
        _sum: { netAmount: true },
        _count: true,
      }),
    ]);

    return {
      totalPayouts: totalPayouts._count,
      totalAmount: totalPayouts._sum.netAmount || 0,
      pendingCount: pendingPayouts._count,
      pendingAmount: pendingPayouts._sum.netAmount || 0,
      completedCount: completedPayouts._count,
      completedAmount: completedPayouts._sum.netAmount || 0,
    };
  }

  /**
   * Update payout status
   */
  async updateStatus(
    id: string,
    status: string,
    additionalData?: {
      gatewayPayoutId?: string;
      processedAt?: Date;
    }
  ): Promise<seller_payouts> {
    return this.model.update({
      where: { id },
      data: {
        status,
        ...additionalData,
        updatedAt: new Date(),
      },
    });
  }
}
