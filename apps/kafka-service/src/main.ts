import { kafka, isKafkaEnabled } from '@packages/utils/kafka';
import { updateUserAnalytics } from './services/analytics.service';

const consumer = kafka.consumer({ groupId: "user-events-group" });

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
export const consumeKafkaMessages = async () => {
  if (!isKafkaEnabled()) {
    console.log("[kafka-service] Kafka is disabled. Set KAFKA_ENABLED=true to start consuming.");
    return;
  }
  // connect to kafka broker
  await consumer.connect();
  // subscribe to topic
  await consumer.subscribe({ topic: "users-events", fromBeginning: false });
  // listen to messages
  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      
      const event = JSON.parse(message.value.toString());
      eventQueue.push(event);
    },
  });
};

consumeKafkaMessages().catch((err) => {
  console.error("[kafka-service] Kafka consumer failed:", err);
});
    