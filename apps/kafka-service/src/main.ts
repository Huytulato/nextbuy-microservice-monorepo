import { consumeUserEvents } from './consumers/analytics.consumer';
import { consumeNotificationEvents } from './consumers/notification.consumer';

console.log("🚀 [Kafka Service] Starting consumers...");

// Start Analytics Consumer
consumeUserEvents().catch((err) => {
  console.error("❌ [Analytics Consumer] Failed to start:", err);
});

// Start Notification Consumer
consumeNotificationEvents().catch((err) => {
  console.error("❌ [Notification Consumer] Failed to start:", err);
});