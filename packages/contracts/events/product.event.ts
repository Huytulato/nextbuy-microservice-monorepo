/**
 * Product Event Schemas
 * Used for Kafka product-related events
 */

export type ProductEventType = 
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'product_status_changed'
  | 'product_moderated';

export interface ProductEvent {
  eventType: ProductEventType;
  productId: string;
  shopId: string;
  sellerId: string;
  timestamp: Date;
  metadata?: {
    oldStatus?: string;
    newStatus?: string;
    moderationScore?: number;
    changes?: Record<string, any>;
  };
}

