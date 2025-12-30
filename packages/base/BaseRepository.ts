import { Prisma } from '@prisma/client';

/**
 * Base Repository class providing common data access patterns
 * 
 * @template TModel - The Prisma model type
 * @template TCreateInput - The Prisma create input type
 * @template TUpdateInput - The Prisma update input type
 * @template TWhereInput - The Prisma where input type
 */
export abstract class BaseRepository<
  TModel extends { id: string },
  TCreateInput = any,
  TUpdateInput = any,
  TWhereInput = any
> {
  protected model: any; // Prisma model delegate

  constructor(model: any) {
    this.model = model;
  }

  /**
   * Find entity by ID
   */
  async findById(id: string, include?: any): Promise<TModel | null> {
    try {
      return await this.model.findUnique({
        where: { id },
        ...(include && { include }),
      });
    } catch (error) {
      this.handleError(error, 'findById');
      throw error;
    }
  }

  /**
   * Find many entities with filters
   */
  async findMany(
    where?: TWhereInput,
    options?: {
      include?: any;
      orderBy?: any;
      skip?: number;
      take?: number;
    }
  ): Promise<TModel[]> {
    try {
      return await this.model.findMany({
        ...(where && { where }),
        ...(options?.include && { include: options.include }),
        ...(options?.orderBy && { orderBy: options.orderBy }),
        ...(options?.skip !== undefined && { skip: options.skip }),
        ...(options?.take !== undefined && { take: options.take }),
      });
    } catch (error) {
      this.handleError(error, 'findMany');
      throw error;
    }
  }

  /**
   * Count entities matching filters
   */
  async count(where?: TWhereInput): Promise<number> {
    try {
      return await this.model.count({
        ...(where && { where }),
      });
    } catch (error) {
      this.handleError(error, 'count');
      throw error;
    }
  }

  /**
   * Create new entity
   */
  async create(data: TCreateInput, include?: any): Promise<TModel> {
    try {
      return await this.model.create({
        data,
        ...(include && { include }),
      });
    } catch (error) {
      this.handleError(error, 'create');
      throw error;
    }
  }

  /**
   * Update entity by ID
   */
  async update(
    id: string,
    data: TUpdateInput,
    include?: any
  ): Promise<TModel> {
    try {
      return await this.model.update({
        where: { id },
        data,
        ...(include && { include }),
      });
    } catch (error) {
      this.handleError(error, 'update');
      throw error;
    }
  }

  /**
   * Delete entity by ID (soft delete if supported)
   */
  async delete(id: string): Promise<TModel> {
    try {
      // Try soft delete first (if isDeleted field exists)
      const entity = await this.findById(id);
      if (entity && 'isDeleted' in entity) {
        return await this.model.update({
          where: { id },
          data: { isDeleted: true, deletedAt: new Date() },
        });
      }

      // Hard delete
      return await this.model.delete({
        where: { id },
      });
    } catch (error) {
      this.handleError(error, 'delete');
      throw error;
    }
  }

  /**
   * Find or create entity
   */
  async findOrCreate(
    where: TWhereInput,
    create: TCreateInput,
    include?: any
  ): Promise<TModel> {
    try {
      let entity = await this.model.findFirst({ where });
      
      if (!entity) {
        entity = await this.create(create, include);
      }

      return entity;
    } catch (error) {
      this.handleError(error, 'findOrCreate');
      throw error;
    }
  }

  /**
   * Update many entities
   */
  async updateMany(
    where: TWhereInput,
    data: TUpdateInput
  ): Promise<{ count: number }> {
    try {
      return await this.model.updateMany({
        where,
        data,
      });
    } catch (error) {
      this.handleError(error, 'updateMany');
      throw error;
    }
  }

  /**
   * Delete many entities
   */
  async deleteMany(where: TWhereInput): Promise<{ count: number }> {
    try {
      return await this.model.deleteMany({
        where,
      });
    } catch (error) {
      this.handleError(error, 'deleteMany');
      throw error;
    }
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const count = await this.model.count({
        where: { id },
      });
      return count > 0;
    } catch (error) {
      this.handleError(error, 'exists');
      throw error;
    }
  }

  /**
   * Handle repository errors
   */
  protected handleError(error: any, operation: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma-specific errors
      switch (error.code) {
        case 'P2002':
          throw new Error(`Unique constraint violation in ${operation}`);
        case 'P2025':
          throw new Error(`Record not found in ${operation}`);
        default:
          console.error(`[BaseRepository] ${operation} error:`, error);
      }
    } else {
      console.error(`[BaseRepository] ${operation} error:`, error);
    }
  }
}

