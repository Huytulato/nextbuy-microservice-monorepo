/**
 * Order Service API Contracts - v1
 * Defines request/response types for inter-service communication
 */

export interface CreateOrderRequest {
  userId: string;
  shopId: string;
  items: Array<{
    productId: string;
    variationId?: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  shippingAddressId?: string;
  couponCode?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  status: string;
  total: number;
}

export interface GetOrderRequest {
  orderId: string;
}

export interface GetOrderResponse {
  id: string;
  userId: string;
  shopId: string;
  total: number;
  status: string;
  deliveryStatus: string;
  items: Array<{
    productId: string;
    variationId?: string;
    quantity: number;
    price: number;
  }>;
}

export interface UpdateOrderStatusRequest {
  orderId: string;
  status: string;
  deliveryStatus?: string;
}

export interface UpdateOrderStatusResponse {
  success: boolean;
  order: GetOrderResponse;
}

