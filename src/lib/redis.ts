import { Queue } from "bullmq";
import IORedis from "ioredis";
import { logger } from "./logger";

const isProduction = process.env.NODE_ENV === 'production';

export const redis = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...(isProduction && { tls: {} }), // ← only add `tls` in prod
  retryStrategy(times) {
    // Retry indefinitely with exponential backoff (max 30 seconds)
    const delay = Math.min(times * 1000, 30000);
    logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  reconnectOnError(err) {
    // Reconnect on specific errors
    const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'];
    if (targetErrors.some(target => err.message.includes(target))) {
      logger.warn('Redis reconnecting on error', { error: err.message });
      return true; // or 1 to reconnect
    }
    return false;
  },
  enableOfflineQueue: true, // Queue commands when disconnected
  lazyConnect: false, // Connect immediately
  showFriendlyErrorStack: !isProduction,
});

// Connection event handlers
redis.on('connect', () => {
  logger.info('Redis connection established');
});

redis.on('ready', () => {
  logger.info('Redis is ready to accept commands');
});

redis.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message });
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

redis.on('reconnecting', (delay: number) => {
  logger.info('Redis reconnecting', { delayMs: delay });
});

redis.on('end', () => {
  logger.warn('Redis connection ended');
});

export const emailQueue = new Queue("email-jobs", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
