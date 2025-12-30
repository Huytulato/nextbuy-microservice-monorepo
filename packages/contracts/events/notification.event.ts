/**
 * Notification Event Schemas
 * Used for Kafka event publishing
 */

export interface NotificationEvent {
  title: string;
  message: string;
  creatorId: string;
  receiverId: string;
  redirect_link: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface BroadcastNotificationEvent extends Omit<NotificationEvent, 'receiverId'> {
  receiverIds?: string[];
  receiverType?: 'admin' | 'seller' | 'user';
}

