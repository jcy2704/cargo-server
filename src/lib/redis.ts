import { Queue } from "bullmq";
import IORedis from "ioredis";

const isProduction = process.env.NODE_ENV === 'production';

export const redis = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...(isProduction && { tls: {} }), // ← only add `tls` in prod
});

export const emailQueue = new Queue("email-jobs", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});
