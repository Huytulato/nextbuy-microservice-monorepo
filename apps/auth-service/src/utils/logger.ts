import { connectProducer, producer } from "@packages/utils/kafka/producer";

export interface LogData {
  type: string;
  message: string;
  source: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export const sendLog = async (logData: LogData): Promise<void> => {
  try {
    await connectProducer();
    
    const logMessage = {
      ...logData,
      timestamp: logData.timestamp || new Date(),
    };

    await producer.send({
      topic: "system-logs",
      messages: [
        {
          key: logData.source,
          value: JSON.stringify(logMessage),
          timestamp: logMessage.timestamp.getTime().toString(),
        },
      ],
    });
    
    console.log("Log sent:", logData.type, "from:", logData.source);
  } catch (error) {
    console.error("Failed to send log:", error);
    // Don't throw error to avoid breaking the main flow
  }
};

