import { Kafka, type KafkaConfig } from "kafkajs";

export function parseEnvBoolean(value: string | undefined): boolean | undefined {
  if (value == null) return undefined;
  const v = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(v)) return true;
  if (["0", "false", "no", "n", "off"].includes(v)) return false;
  return undefined;
}

export function isKafkaEnabled(): boolean {
  const explicit = parseEnvBoolean(process.env.KAFKA_ENABLED);
  if (explicit !== undefined) return explicit;

  // Safe default for local dev: don't try to connect to external Kafka unless explicitly enabled.
  return process.env.NODE_ENV === "production";
}

function parseBrokers(raw: string | undefined): string[] {
  const brokers = (raw ?? "")
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

  return brokers.length > 0 ? brokers : ["localhost:9092"];
}

function brokersLookLikeConfluent(brokers: string[]): boolean {
  return brokers.some((b) => b.includes("confluent.cloud"));
}

function getKafkaSasl(): KafkaConfig["sasl"] | undefined {
  const username = process.env.KAFKA_API_KEY?.trim();
  const password = process.env.KAFKA_API_SECRET?.trim();
  if (!username || !password) return undefined;

  return {
    mechanism: "plain",
    username,
    password,
  };
}

function getKafkaSsl(brokers: string[], sasl: KafkaConfig["sasl"] | undefined): KafkaConfig["ssl"] | undefined {
  const explicit = parseEnvBoolean(process.env.KAFKA_SSL);
  if (explicit !== undefined) return explicit;

  // Confluent Cloud requires TLS, and SASL is typically used over TLS.
  if (sasl) return true;
  if (brokersLookLikeConfluent(brokers)) return true;
  return undefined;
}

function getKafkaClientId(): string {
  return (
    process.env.KAFKA_CLIENT_ID?.trim() ||
    process.env.SERVICE_NAME?.trim() ||
    "nextbuy"
  );
}

const brokers = parseBrokers(process.env.KAFKA_BROKERS);
const sasl = getKafkaSasl();
const ssl = getKafkaSsl(brokers, sasl);

export const kafka = new Kafka({
  clientId: getKafkaClientId(),
  brokers,
  ...(ssl !== undefined ? { ssl } : {}),
  ...(sasl ? { sasl } : {}),
});
