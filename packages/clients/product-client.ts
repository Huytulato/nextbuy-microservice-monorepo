/**
 * Product Service Client
 * Internal API client for communicating with product-service
 */

import axios, { AxiosInstance } from 'axios';
import {
  GetProductRequest,
  GetProductResponse,
  GetProductsByShopRequest,
  GetProductsByShopResponse,
  ValidateProductRequest,
  ValidateProductResponse,
  UpdateProductStockRequest,
  UpdateProductStockResponse,
} from '@packages/contracts';

export class ProductClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.PRODUCT_SERVICE_URL || 'http://localhost:6002';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get product by ID
   */
  async getProduct(request: GetProductRequest): Promise<GetProductResponse | null> {
    try {
      const response = await this.client.get(`/api/internal/product/${request.productId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get product:', error);
      return null;
    }
  }

  /**
   * Get products by shop ID
   */
  async getProductsByShop(request: GetProductsByShopRequest): Promise<GetProductsByShopResponse> {
    try {
      const params = new URLSearchParams();
      if (request.page) params.append('page', request.page.toString());
      if (request.limit) params.append('limit', request.limit.toString());

      const response = await this.client.get(
        `/api/internal/products/shop/${request.shopId}?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Failed to get products by shop:', error);
      return {
        products: [],
        total: 0,
        page: request.page || 1,
        limit: request.limit || 20,
      };
    }
  }

  /**
   * Validate product ownership
   */
  async validateProduct(request: ValidateProductRequest): Promise<ValidateProductResponse> {
    try {
      const response = await this.client.post('/api/internal/validate-product', request);
      return response.data;
    } catch (error: any) {
      return {
        isValid: false,
        error: error.response?.data?.message || 'Failed to validate product',
      };
    }
  }

  /**
   * Update product stock
   */
  async updateProductStock(request: UpdateProductStockRequest): Promise<UpdateProductStockResponse> {
    try {
      const response = await this.client.put(
        `/api/internal/product/${request.productId}/stock`,
        {
          quantity: request.quantity,
          operation: request.operation,
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to update product stock'
      );
    }
  }
}

export const productClient = new ProductClient();

