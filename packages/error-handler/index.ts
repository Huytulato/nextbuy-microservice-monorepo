// Define class AppError
// AppError is base class that inherits from Error
export class AppError extends Error {
  public readonly statusCode: number; // HTTP Code 
  public readonly isOperational: boolean; // Error from system error or not
  public readonly details?: any;  // save error details

  constructor(message: string, statusCode: number, isOperational = true, details?:any){
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

// Define sub error types
// Not found error
export class NotFoundError extends AppError {
  constructor(message = 'Resources not found') {
    super(message, 404);
  }
}

// Validation Error (use for Joi/zod/react-hook-form validation errors)
export class ValidationError extends AppError {
  constructor(message = 'Invalid request data', details?: any) {
    super(message, 400, true, details);
  }
}

// Authentication error
export class AuthError extends AppError {
  constructor(message = 'Unauthorizes'){
    super(message, 401);
  }
}

// Forbidden error
export class ForbiddenError extends AppError {
  constructor(message = 'Forbiden access'){
    super(message, 403);
  }
}

// Database error (MongoDB or Postgres)
export class DatabaseError extends AppError {
  constructor(message = 'Database error', details?:any){
    super(message, 500, true, details);
  }
}

// Rate Limit error (If user exceeds API limits)
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later'){
    super(message, 429);
  }
}

export * from './error-middleware';