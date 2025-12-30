import prisma from '@packages/libs/prisma';
import { Prisma } from '@prisma/client';

type OrderModel = Prisma.ordersGetPayload<{
  include: {
    user: true;
    shop: true;
    shippingAddress: true;
    coupon: true;
    items: {
      include: {
        product: true;
        variation: true;
      };
    };
  };
}>;

type CreateOrderInput = Prisma.ordersCreateInput;
type UpdateOrderInput = Prisma.ordersUpdateInput;
type OrderWhereInput = Prisma.ordersWhereInput;

export class OrderRepository {
  /**
   * Create a new order
   */
  async create(data: CreateOrderInput): Promise<OrderModel> {
    return prisma.orders.create({
      data,
      include: {
        user: true,
        shop: true,
        shippingAddress: true,
        coupon: true,
        items: {
          include: {
            product: true,
            variation: true,
          },
        },
      },
    });
  }

  /**
   * Find order by ID
   */
  async findById(id: string, include?: any): Promise<OrderModel | null> {
    return prisma.orders.findUnique({
      where: { id },
      include: include || {
        user: true,
        shop: true,
        shippingAddress: true,
        coupon: true,
        items: {
          include: {
            product: true,
            variation: true,
          },
        },
      },
    });
  }

  /**
   * Find orders by user ID
   */
  async findByUserId(userId: string): Promise<OrderModel[]> {
    return prisma.orders.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                images: true,
              },
            },
          },
        },
        shippingAddress: true,
        shop: {
          select: {
            id: true,
            name: true,
            images: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find orders by shop ID
   */
  async findByShopId(shopId: string): Promise<OrderModel[]> {
    return prisma.orders.findMany({
      where: { shopId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            images: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find all orders (for admin)
   */
  async findAll(): Promise<OrderModel[]> {
    return prisma.orders.findMany({
      include: {
        user: true,
        shop: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Update order
   */
  async update(id: string, data: UpdateOrderInput): Promise<OrderModel> {
    return prisma.orders.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            images: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
        shippingAddress: true,
        coupon: true,
        shop: {
          select: {
            id: true,
            name: true,
            images: true,
          },
        },
      },
    });
  }

  /**
   * Check if order exists with similar data (for idempotency)
   */
  async findExistingOrder(
    userId: string,
    shopId: string,
    total: number,
    timeWindow: number = 5 * 60 * 1000 // 5 minutes
  ): Promise<OrderModel | null> {
    return prisma.orders.findFirst({
      where: {
        userId,
        shopId,
        status: 'paid',
        total,
        createdAt: {
          gte: new Date(Date.now() - timeWindow),
        },
      },
    });
  }
}

