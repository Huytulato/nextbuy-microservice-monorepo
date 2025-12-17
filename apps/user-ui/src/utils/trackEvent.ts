import axiosInstance from "./axiosInstance";

export type UserEventAction = 
  | "product_view" 
  | "add_to_cart" 
  | "remove_from_cart" 
  | "add_to_wishlist" 
  | "remove_from_wishlist" 
  | "purchase";

export interface TrackEventPayload {
  userId: string;
  action: UserEventAction;
  productId: string;
  shopId?: string;
  metadata?: {
    quantity?: number;
    price?: number;
    location?: string;
    deviceInfo?: string;
  };
}

/**
 * Track user events for analytics
 * Sends events to Kafka via API Gateway
 */
export const trackEvent = async (payload: TrackEventPayload): Promise<void> => {
  try {
    await axiosInstance.post("/analytics/track-event", payload);
  } catch (error) {
    // Log error but don't block user interaction
    console.error("Failed to track event:", error);
  }
};

/**
 * Get current device and location info for event metadata
 */
export const getEventMetadata = () => {
  if (typeof window === "undefined") return {};

  return {
    deviceInfo: navigator.userAgent,
    location: window.location.pathname,
  };
};
