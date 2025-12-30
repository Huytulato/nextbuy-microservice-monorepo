/**
 * User Event Schemas
 * Used for Kafka analytics events
 */

export type UserAction = 
  | 'product_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'add_to_wishlist'
  | 'remove_from_wishlist'
  | 'purchase';

export interface UserEvent {
  userId: string;
  action: UserAction;
  productId: string;
  shopId?: string;
  timestamp: Date;
  metadata?: {
    quantity?: number;
    price?: number;
    location?: string;
    deviceInfo?: string;
  };
}

