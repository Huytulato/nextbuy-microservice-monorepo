import { kafka } from "./index";

const producer = kafka.producer();

let isConnected = false;

export const connectProducer = async () => {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    console.log("Kafka Producer connected");
  }
};

export const disconnectProducer = async () => {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
    console.log("Kafka Producer disconnected");
  }
};

export interface UserEvent {
  userId: string;
  action: "product_view" | "add_to_cart" | "remove_from_cart" | "add_to_wishlist" | "remove_from_wishlist" | "purchase";
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

export const publishUserEvent = async (event: UserEvent) => {
  try {
    await connectProducer();
    
    await producer.send({
      topic: "users-events",
      messages: [
        {
          key: event.userId,
          value: JSON.stringify(event),
          timestamp: event.timestamp.getTime().toString(),
        },
      ],
    });
    
    console.log("Event published:", event.action, "for user:", event.userId);
  } catch (error) {
    console.error("Failed to publish event:", error);
    throw error;
  }
};

export { producer };
