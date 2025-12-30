import { ValidationError, NotFoundError, AuthError } from '@packages/error-handler';

/**
 * Base Service class providing common functionality for all services
 * 
 * @template TRepository - The repository type that this service uses
 */
export abstract class BaseService<TRepository = any> {
  protected repository: TRepository;

  constructor(repository: TRepository) {
    this.repository = repository;
  }

  /**
   * Validate required fields
   */
  protected validateRequired<T extends Record<string, any>>(
    data: T,
    requiredFields: (keyof T)[]
  ): void {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        missingFields.push(String(field));
      }
    }

    if (missingFields.length > 0) {
      throw new ValidationError(
        `Missing required fields: ${missingFields.join(', ')}`
      );
    }
  }

  /**
   * Validate email format
   */
  protected validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate ObjectId format
   */
  protected validateObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  /**
   * Ensure entity exists or throw NotFoundError
   */
  protected async ensureExists<T>(
    findFn: () => Promise<T | null>,
    entityName: string = 'Entity'
  ): Promise<T> {
    const entity = await findFn();
    
    if (!entity) {
      throw new NotFoundError(`${entityName} not found`);
    }

    return entity;
  }

  /**
   * Ensure user has permission or throw AuthError
   */
  protected ensurePermission(
    condition: boolean,
    message: string = 'You do not have permission to perform this action'
  ): void {
    if (!condition) {
      throw new AuthError(message);
    }
  }

  /**
   * Sanitize string input
   */
  protected sanitizeString(input: string): string {
    return input.trim().replace(/\s+/g, ' ');
  }

  /**
   * Calculate pagination metadata
   */
  protected calculatePagination(
    total: number,
    page: number,
    limit: number
  ): {
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } {
    const totalPages = Math.ceil(total / limit);
    
    return {
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  /**
   * Handle service errors with proper error types
   */
  protected handleError(error: any, context?: string): never {
    if (error instanceof ValidationError || 
        error instanceof NotFoundError || 
        error instanceof AuthError) {
      throw error;
    }

    // Log unexpected errors
    console.error(`[${this.constructor.name}]${context ? ` ${context}` : ''}:`, error);
    
    // Re-throw as generic error
    throw new Error(
      context 
        ? `${context}: ${error.message || 'Unknown error'}`
        : error.message || 'An unexpected error occurred'
    );
  }
}

