import { MiddlewareHandler } from "hono";
import { db as sharedDb } from "@/db";
import { clients } from "@/db/schema";
import { getDrizzleForTenant } from "@/db/tenants/tenant-drizzle";
import { eq } from "drizzle-orm";
import { redis } from "@/lib/redis";

export const withTenantDrizzle: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.text("Missing or invalid Authorization header", 401);
  }

  const apiKey = authHeader.replace("Bearer ", "").trim();
  const client = (
    await sharedDb
      .select()
      .from(clients)
      .where(eq(clients.apiKey, apiKey))
      .limit(1)
  )[0];

  if (!client || !client.dbUrl) {
    return c.text("Invalid API key", 403);
  }

  const tenantDb = await getDrizzleForTenant(client.dbUrl);

  c.set("tenantDb", tenantDb);

  const usageKey = `usage:tenant:${apiKey}`;
  await redis.incr(usageKey);
  await redis.expire(usageKey, 86400); // 1 day TTL (optional)

  await next();
};
