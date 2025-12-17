import { Partitioners } from "kafkajs";
import { isKafkaEnabled, parseEnvBoolean, kafka } from "./index";

const producer = kafka.producer({
  // KafkaJS v2 changed the default partitioner. Keep legacy behavior and avoid the warning spam.
  createPartitioner: Partitioners.LegacyPartitioner,
});

let isConnected = false;

export const connectProducer = async () => {
  if (!isKafkaEnabled()) return;
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    console.log("Kafka Producer connected");
  }
};

export const disconnectProducer = async () => {
  if (!isKafkaEnabled()) return;
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
    if (!isKafkaEnabled()) return;
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
    const strict = parseEnvBoolean(process.env.KAFKA_STRICT) ?? false;
    if (strict) throw error;
  }
};

export { producer };
