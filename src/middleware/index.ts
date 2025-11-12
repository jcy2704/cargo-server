import { MiddlewareHandler } from "hono";
import { db as sharedDb } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redis } from "@/lib/redis";
import { tenantDbFactory } from "@/lib/tenantDbFactory";
import { UnauthorizedError, ForbiddenError } from "@/utils/errors";

export const withTenantDrizzle: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
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
    throw new ForbiddenError("Invalid API key");
  }

  const tenantDb = await tenantDbFactory.getClient(client.dbUrl);

  c.set("tenantDb", tenantDb);
  c.set("client", client);

  const usageKey = `usage:tenant:${apiKey}`;
  await redis.incr(usageKey);
  await redis.expire(usageKey, 86400);

  await next();
};
