import { kafka, isKafkaEnabled } from '@packages/utils/kafka';
import { updateUserAnalytics } from '../services/analytics.service';

const userEventsConsumer = kafka.consumer({ groupId: "user-events-group" });
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
      console.log("[AnalyticsConsumer] Error processing event:", error);
    }
  }
};

// Process every 5 seconds
setInterval(processQueue, 5000); 

export const consumeUserEvents = async () => {
  if (!isKafkaEnabled()) {
    console.log("[AnalyticsConsumer] Kafka is disabled. Set KAFKA_ENABLED=true to start consuming.");
    return;
  }
  
  try {
    // connect to kafka broker
    await userEventsConsumer.connect();
    // subscribe to topic
    await userEventsConsumer.subscribe({ topic: "users-events", fromBeginning: false });
    
    console.log("[AnalyticsConsumer] Started listening to users-events");

    // listen to messages
    await userEventsConsumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        
        try {
          const event = JSON.parse(message.value.toString());
          eventQueue.push(event);
        } catch (e) {
          console.error("[AnalyticsConsumer] Error parsing message:", e);
        }
      },
    });
  } catch (error) {
    console.error("[AnalyticsConsumer] Failed to start:", error);
  }
};
