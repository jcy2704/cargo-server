import { Context, MiddlewareHandler } from "hono";
import { db as sharedDb } from "@/db";
import { clients, type Client } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redis } from "@/lib/redis";
import { tenantDbFactory } from "@/lib/tenantDbFactory";
import { UnauthorizedError, ForbiddenError } from "@/utils/errors";
import { logger } from "@/lib/logger";

/**
 * Resolve the calling Client from the Bearer API key, set it on the context,
 * and record usage. This is the shared prelude for both `withClient` and
 * `withTenantDrizzle` — it never touches the tenant DB.
 */
async function resolveClient(c: Context): Promise<Client> {
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

  c.set("client", client);
  c.set("tenantDomain", client.domain);

  logger.info("Tenant request", {
    tenant: client.domain,
    method: c.req.method,
    path: c.req.path,
  });

  const usageKey = `usage:tenant:${apiKey}`;
  await redis.incr(usageKey);
  await redis.expire(usageKey, 86400);

  return client;
}

/**
 * Authenticate the API key and expose the Client (shared-DB metadata) without
 * opening a tenant-DB connection. For routes that only read/write shared-DB
 * data (e.g. WhatsApp/WABA credentials), so they stay available even if a
 * Client's tenant DB is unreachable.
 */
export const withClient: MiddlewareHandler = async (c, next) => {
  await resolveClient(c);
  await next();
};

export const withTenantDrizzle: MiddlewareHandler = async (c, next) => {
  const client = await resolveClient(c);

  const tenantDb = await tenantDbFactory.getClient(client.dbUrl);
  c.set("tenantDb", tenantDb);

  await next();
};
