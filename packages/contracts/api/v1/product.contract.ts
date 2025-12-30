/**
 * Product Service API Contracts - v1
 * Defines request/response types for inter-service communication
 */

export interface GetProductRequest {
  productId: string;
}

export interface GetProductResponse {
  id: string;
  title: string;
  slug: string;
  category: string;
  sale_price: number;
  regular_price: number;
  stock: number;
  status: string;
  shopId: string;
}

export interface GetProductsByShopRequest {
  shopId: string;
  page?: number;
  limit?: number;
}

export interface GetProductsByShopResponse {
  products: GetProductResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface ValidateProductRequest {
  productId: string;
  shopId: string;
}

export interface ValidateProductResponse {
  isValid: boolean;
  product?: GetProductResponse;
  error?: string;
}

export interface UpdateProductStockRequest {
  productId: string;
  quantity: number;
  operation: 'increment' | 'decrement' | 'set';
}

export interface UpdateProductStockResponse {
  success: boolean;
  newStock: number;
}

