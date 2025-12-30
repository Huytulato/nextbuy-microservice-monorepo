/**
 * Auth Service API Contracts - v1
 * Defines request/response types for inter-service communication
 */

export interface ValidateUserRequest {
  userId: string;
}

export interface ValidateUserResponse {
  isValid: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  error?: string;
}

export interface ValidateSellerRequest {
  sellerId: string;
}

export interface ValidateSellerResponse {
  isValid: boolean;
  seller?: {
    id: string;
    name: string;
    email: string;
    shopId?: string;
  };
  error?: string;
}

export interface GetUserShopRequest {
  sellerId: string;
}

export interface GetUserShopResponse {
  shopId: string;
  shopName: string;
}

export interface ValidateTokenRequest {
  token: string;
  tokenType: 'access' | 'refresh';
}

export interface ValidateTokenResponse {
  isValid: boolean;
  payload?: {
    id: string;
    role: string;
  };
  error?: string;
}

