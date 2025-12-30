import prisma from '@packages/libs/prisma';
import { BaseRepository } from '@packages/base';
import { Prisma, products } from '@prisma/client';

export class ProductRepository extends BaseRepository<
  products,
  Prisma.productsCreateInput,
  Prisma.productsUpdateInput,
  Prisma.productsWhereInput
> {
  constructor() {
    super(prisma.products);
  }

  /**
   * Find product by slug
   */
  async findBySlug(slug: string, include?: any): Promise<products | null> {
    try {
      return await this.model.findFirst({
        where: {
          slug: { equals: slug, mode: 'insensitive' },
          isDeleted: false,
          status: 'active',
        },
        ...(include && { include }),
      });
    } catch (error) {
      this.handleError(error, 'findBySlug');
      throw error;
    }
  }

  /**
   * Find products by shop ID
   */
  async findByShopId(
    shopId: string,
    options?: {
      include?: any;
      orderBy?: any;
      skip?: number;
      take?: number;
    }
  ): Promise<products[]> {
    try {
      return await this.model.findMany({
        where: { shopId },
        ...(options?.include && { include: options.include }),
        ...(options?.orderBy && { orderBy: options.orderBy }),
        ...(options?.skip !== undefined && { skip: options.skip }),
        ...(options?.take !== undefined && { take: options.take }),
      });
    } catch (error) {
      this.handleError(error, 'findByShopId');
      throw error;
    }
  }

  /**
   * Find active products with filters
   */
  async findActiveProducts(
    filters: {
      category?: string;
      search?: string;
      priceRange?: { min: number; max: number };
      colors?: string[];
      sizes?: string[];
      categories?: string[];
    },
    options?: {
      include?: any;
      orderBy?: any;
      skip?: number;
      take?: number;
    }
  ): Promise<products[]> {
    try {
      const now = new Date();
      const where: Prisma.productsWhereInput = {
        isDeleted: false,
        status: 'active',
        starting_date: { lte: now },
        ending_date: { gte: now },
        ...(filters.category && { category: filters.category }),
        ...(filters.search && {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { tags: { has: filters.search } },
            { brand: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
        ...(filters.priceRange && {
          sale_price: {
            gte: filters.priceRange.min,
            lte: filters.priceRange.max,
          },
        }),
        ...(filters.colors && filters.colors.length > 0 && {
          colors: { hasSome: filters.colors },
        }),
        ...(filters.sizes && filters.sizes.length > 0 && {
          sizes: { hasSome: filters.sizes },
        }),
        ...(filters.categories && filters.categories.length > 0 && {
          category: { in: filters.categories },
        }),
      };

      return await this.model.findMany({
        where,
        ...(options?.include && { include: options.include }),
        ...(options?.orderBy && { orderBy: options.orderBy }),
        ...(options?.skip !== undefined && { skip: options.skip }),
        ...(options?.take !== undefined && { take: options.take }),
      });
    } catch (error) {
      this.handleError(error, 'findActiveProducts');
      throw error;
    }
  }

  /**
   * Check if slug exists
   */
  async slugExists(slug: string): Promise<boolean> {
    try {
      const count = await this.model.count({
        where: { slug },
      });
      return count > 0;
    } catch (error) {
      this.handleError(error, 'slugExists');
      throw error;
    }
  }

  /**
   * Soft delete product
   */
  async softDelete(id: string): Promise<products> {
    try {
      return await this.model.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    } catch (error) {
      this.handleError(error, 'softDelete');
      throw error;
    }
  }

  /**
   * Restore deleted product
   */
  async restore(id: string): Promise<products> {
    try {
      return await this.model.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });
    } catch (error) {
      this.handleError(error, 'restore');
      throw error;
    }
  }

  /**
   * Update product status
   */
  async updateStatus(
    id: string,
    status: string,
    additionalData?: Partial<Prisma.productsUpdateInput>
  ): Promise<products> {
    try {
      return await this.model.update({
        where: { id },
        data: {
          status,
          ...additionalData,
        },
      });
    } catch (error) {
      this.handleError(error, 'updateStatus');
      throw error;
    }
  }

  /**
   * Get product with variations
   */
  async findWithVariations(id: string): Promise<products | null> {
    try {
      return await this.model.findUnique({
        where: { id },
        include: {
          images: true,
          variations: {
            where: { isDeleted: false, isActive: true },
            orderBy: { createdAt: 'asc' },
          },
          variationGroups: {
            orderBy: { position: 'asc' },
          },
        },
      });
    } catch (error) {
      this.handleError(error, 'findWithVariations');
      throw error;
    }
  }

  /**
   * Get product history
   */
  async getProductHistory(
    productId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      return await prisma.product_history.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      this.handleError(error, 'getProductHistory');
      throw error;
    }
  }

  /**
   * Create product history entry
   */
  async createHistoryEntry(data: {
    productId: string;
    changedBy: string;
    changeType: string;
    changes: Record<string, any>;
    reason?: string;
  }): Promise<any> {
    try {
      return await prisma.product_history.create({
        data,
      });
    } catch (error) {
      this.handleError(error, 'createHistoryEntry');
      throw error;
    }
  }
}

