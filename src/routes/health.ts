import { Hono } from "hono";
import { db } from "@/db";
import { redis, emailQueue } from "@/lib/redis";
import { logger } from "@/lib/logger";

const health = new Hono();

interface HealthCheck {
  status: "healthy" | "unhealthy";
  checks: {
    redis: boolean;
    database: boolean;
    emailQueue: boolean;
  };
  timestamp: string;
}

async function checkRedis(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (err) {
    logger.error("Redis health check failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

async function checkDatabase(): Promise<boolean> {
  try {
    await db.execute("SELECT 1");
    return true;
  } catch (err) {
    logger.error("Database health check failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

async function checkEmailQueue(): Promise<boolean> {
  try {
    await emailQueue.getJobCounts();
    return true;
  } catch (err) {
    logger.error("Email queue health check failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

health.get("/", async (c) => {
  const checks = {
    redis: await checkRedis(),
    database: await checkDatabase(),
    emailQueue: await checkEmailQueue(),
  };

  const healthy = Object.values(checks).every(Boolean);

  const response: HealthCheck = {
    status: healthy ? "healthy" : "unhealthy",
    checks,
    timestamp: new Date().toISOString(),
  };

  return c.json(response, healthy ? 200 : 503);
});

export default health;
