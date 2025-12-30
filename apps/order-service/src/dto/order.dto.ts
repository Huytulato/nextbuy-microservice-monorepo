/**
 * Order DTOs for request/response validation
 */

export interface CreatePaymentIntentDto {
  amount: number;
  sellerStripeAccountId?: string;
  getSellerStripeAccountId?: string;
  sessionId: string;
}

export interface CreatePaymentSessionDto {
  cart: Array<{
    id: string;
    quantity: number;
    sale_price: number;
    shopId: string;
    selectedOptions?: any[];
    variationId?: string;
  }>;
  selectedAddressId?: string;
  coupon?: {
    code: string;
    discountAmount?: number;
    discountPercent?: number;
    disconnectProductId?: string;
  };
}

export interface OrderItemDto {
  productId: string;
  variationId?: string;
  quantity: number;
  price: number;
  selectedOptions?: any[];
}

export interface CreateOrderDto {
  userId: string;
  shopId: string;
  items: OrderItemDto[];
  total: number;
  shippingAddressId?: string;
  couponCode?: string;
  discountAmount?: number;
}

export interface UpdateDeliveryStatusDto {
  deliveryStatus: 'ordered' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered';
}

export interface OrderResponseDto {
  id: string;
  userId: string;
  shopId: string;
  total: number;
  status: string;
  deliveryStatus: string;
  shippingAddressId?: string;
  couponCode?: string;
  discountAmount: number;
  createdAt: Date;
  updateAt: Date;
  items: Array<{
    id: string;
    productId: string;
    variationId?: string;
    quantity: number;
    price: number;
    selectedOptions?: any[];
    product?: any;
  }>;
  user?: {
    id: string;
    name: string;
    email: string;
    images?: any[];
  };
  shop?: {
    id: string;
    name: string;
    images?: any[];
  };
  shippingAddress?: any;
  coupon?: any;
}

