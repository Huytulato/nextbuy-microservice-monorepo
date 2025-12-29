import { kafka, isKafkaEnabled } from '@packages/utils/kafka';
import prisma from '@packages/libs/prisma';

const notificationsConsumer = kafka.consumer({ groupId: "notifications-events-group" });

export const consumeNotificationEvents = async () => {
  if (!isKafkaEnabled()) {
    console.log("[NotificationConsumer] Kafka is disabled. Notifications will be created directly in database.");
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
          
          console.log("[NotificationConsumer] Notification created for receiver:", event.receiverId);
        } catch (error) {
          console.error("[NotificationConsumer] Error processing notification event:", error);
        }
      },
    });
    
    console.log("[NotificationConsumer] Started listening to notifications-events");
  } catch (error) {
    console.error("[NotificationConsumer] Failed to start:", error);
  }
};
