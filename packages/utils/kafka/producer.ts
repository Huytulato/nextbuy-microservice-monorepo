import { Partitioners } from "kafkajs";
import { isKafkaEnabled, parseEnvBoolean, kafka } from "./index";

// Lazy import prisma for fallback (only when needed)
let prismaInstance: any = null;
const getPrisma = async () => {
  if (!prismaInstance) {
    try {
      // Try to import prisma dynamically
      // Dynamic import with path alias - TypeScript may show error but works at runtime with webpack
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Path alias resolution in dynamic import
      const prismaModule = await import("@packages/libs/prisma");
      prismaInstance = prismaModule.default || prismaModule;
    } catch (error) {
      // If import fails, try require as fallback
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/ban-ts-comment
        // @ts-ignore - Path alias resolution in require
        const prismaModule = require("@packages/libs/prisma");
        prismaInstance = prismaModule.default || prismaModule;
      } catch (requireError) {
        console.error("Failed to load prisma for notification fallback:", requireError);
        throw new Error("Prisma not available for notification fallback");
      }
    }
  }
  return prismaInstance;
};

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

export interface NotificationEvent {
  title: string;
  message: string;
  creatorId: string;
  receiverId: string;
  redirect_link: string;
  timestamp?: Date;
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

export const publishNotificationEvent = async (event: NotificationEvent) => {
  try {
    if (!isKafkaEnabled()) {
      // Fallback: If Kafka is disabled, create notification directly in database
      // This allows the system to work even without Kafka
      try {
        const prisma = await getPrisma();
        await prisma.notifications.create({
          data: {
            title: event.title,
            message: event.message,
            creatorId: event.creatorId,
            receiverId: event.receiverId,
            redirect_link: event.redirect_link,
          },
        });
      } catch (fallbackError) {
        console.error("Failed to create notification as fallback (Kafka disabled):", fallbackError);
        // If fallback fails, just log - don't throw to avoid breaking the main flow
      }
      return;
    }
    
    await connectProducer();
    
    await producer.send({
      topic: "notifications-events",
      messages: [
        {
          key: event.receiverId,
          value: JSON.stringify({
            ...event,
            timestamp: event.timestamp || new Date(),
          }),
        },
      ],
    });
    
    console.log("Notification event published for receiver:", event.receiverId);
  } catch (error) {
    console.error("Failed to publish notification event:", error);
    // Fallback: Create notification directly if Kafka fails
    try {
      const prisma = await getPrisma();
      await prisma.notifications.create({
        data: {
          title: event.title,
          message: event.message,
          creatorId: event.creatorId,
          receiverId: event.receiverId,
          redirect_link: event.redirect_link,
        },
      });
    } catch (fallbackError) {
      console.error("Failed to create notification as fallback (Kafka failed):", fallbackError);
    }
    const strict = parseEnvBoolean(process.env.KAFKA_STRICT) ?? false;
    if (strict) throw error;
  }
};

export { producer };
