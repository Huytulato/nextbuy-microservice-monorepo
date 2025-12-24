import { kafka, isKafkaEnabled } from '@packages/utils/kafka';
import { updateUserAnalytics } from './services/analytics.service';
import prisma from '@packages/libs/prisma';

const userEventsConsumer = kafka.consumer({ groupId: "user-events-group" });
const notificationsConsumer = kafka.consumer({ groupId: "notifications-events-group" });

const eventQueue: any[] = [];

const processQueue = async () => {
  if (eventQueue.length === 0) return;

  const events = [...eventQueue];
  eventQueue.length = 0;
  for (const event of events) {
    if (event.action === "shop_visit"){
      // update shop analatics 
    }

    const validActions = ["add_to_cart", "remove_from_cart", "product_view", "add_to_wishlist"];
    if(!event.action || !validActions.includes(event.action)){
      continue;
    }
    try {
      await updateUserAnalytics(event);
    } catch (error) {
      console.log("Error processing event:", error);
    }
  }
};

setInterval(processQueue, 5000); // Process every 5 seconds

// kafka consumer to listen to user events
export const consumeUserEvents = async () => {
  if (!isKafkaEnabled()) {
    console.log("[kafka-service] Kafka is disabled. Set KAFKA_ENABLED=true to start consuming.");
    return;
  }
  // connect to kafka broker
  await userEventsConsumer.connect();
  // subscribe to topic
  await userEventsConsumer.subscribe({ topic: "users-events", fromBeginning: false });
  // listen to messages
  await userEventsConsumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      
      const event = JSON.parse(message.value.toString());
      eventQueue.push(event);
    },
  });
};

// kafka consumer to listen to notification events
export const consumeNotificationEvents = async () => {
  if (!isKafkaEnabled()) {
    console.log("[kafka-service] Kafka is disabled. Notifications will be created directly in database.");
    return;
  }
  
  try {
    await notificationsConsumer.connect();
    await notificationsConsumer.subscribe({ topic: "notifications-events", fromBeginning: false });
    
    await notificationsConsumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        
        try {
          const event = JSON.parse(message.value.toString());
          
          // Create notification in database
          await prisma.notifications.create({
            data: {
              title: event.title,
              message: event.message,
              creatorId: event.creatorId,
              receiverId: event.receiverId,
              redirect_link: event.redirect_link,
            },
          });
          
          console.log("[kafka-service] Notification created for receiver:", event.receiverId);
        } catch (error) {
          console.error("[kafka-service] Error processing notification event:", error);
        }
      },
    });
    
    console.log("[kafka-service] Notification events consumer started");
  } catch (error) {
    console.error("[kafka-service] Notification events consumer failed:", error);
  }
};

// Start both consumers
consumeUserEvents().catch((err) => {
  console.error("[kafka-service] User events consumer failed:", err);
});

consumeNotificationEvents().catch((err) => {
  console.error("[kafka-service] Notification events consumer failed:", err);
});
    