import { Request, Response, NextFunction } from 'express';

/**
 * Base Controller class providing common functionality for all controllers
 * 
 * @template TService - The service type that this controller uses
 */
export abstract class BaseController<TService = any> {
  protected service: TService;

  constructor(service: TService) {
    this.service = service;
  }

  /**
   * Standard success response handler
   */
  protected success(
    res: Response,
    data: any,
    message?: string,
    statusCode: number = 200
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message: message || 'Operation successful',
      data,
    });
  }

  /**
   * Standard error response handler
   */
  protected error(
    res: Response,
    message: string,
    statusCode: number = 400,
    errors?: any
  ): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errors && { errors }),
    });
  }

  /**
   * Paginated response handler
   */
  protected paginated(
    res: Response,
    data: any[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  ): Response {
    return res.status(200).json({
      success: true,
      data,
      pagination: {
        currentPage: pagination.page,
        totalPages: pagination.totalPages,
        totalItems: pagination.total,
        hasNextPage: pagination.page < pagination.totalPages,
        hasPrevPage: pagination.page > 1,
      },
    });
  }

  /**
   * Async handler wrapper to catch errors
   */
  protected asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Extract pagination parameters from request
   */
  protected getPaginationParams(req: Request): {
    page: number;
    limit: number;
    skip: number;
  } {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  /**
   * Extract sorting parameters from request
   */
  protected getSortParams(req: Request, defaultSort: string = 'createdAt:desc'): {
    field: string;
    order: 'asc' | 'desc';
  } {
    const sortBy = (req.query.sortBy as string) || defaultSort;
    const [field, order] = sortBy.split(':');
    
    return {
      field: field || 'createdAt',
      order: (order as 'asc' | 'desc') || 'desc',
    };
  }
}

