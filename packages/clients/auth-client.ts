/**
 * Auth Service Client
 * Internal API client for communicating with auth-service
 */

import axios, { AxiosInstance } from 'axios';
import {
  ValidateUserRequest,
  ValidateUserResponse,
  ValidateSellerRequest,
  ValidateSellerResponse,
  GetUserShopRequest,
  GetUserShopResponse,
} from '@packages/contracts';

export class AuthClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.AUTH_SERVICE_URL || 'http://localhost:6001';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Validate user by ID
   */
  async validateUser(request: ValidateUserRequest): Promise<ValidateUserResponse> {
    try {
      const response = await this.client.get(`/api/internal/validate-user/${request.userId}`);
      return response.data;
    } catch (error: any) {
      return {
        isValid: false,
        error: error.response?.data?.message || 'Failed to validate user',
      };
    }
  }

  /**
   * Validate seller by ID
   */
  async validateSeller(request: ValidateSellerRequest): Promise<ValidateSellerResponse> {
    try {
      const response = await this.client.get(`/api/internal/validate-seller/${request.sellerId}`);
      return response.data;
    } catch (error: any) {
      return {
        isValid: false,
        error: error.response?.data?.message || 'Failed to validate seller',
      };
    }
  }

  /**
   * Get user's shop (for sellers)
   */
  async getUserShop(request: GetUserShopRequest): Promise<GetUserShopResponse | null> {
    try {
      const response = await this.client.get(`/api/internal/get-user-shop/${request.sellerId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get user shop:', error);
      return null;
    }
  }
}

export const authClient = new AuthClient();

