import { Hono } from "hono";
import { db } from "@/db";
import { clients, type NewClient } from "../../db/schema";
import { generateApiKey } from "@/utils/apiKeys";
import { encrypt } from "@/utils/crypto";
import { redis } from "@/lib/redis";

const tenants = new Hono();

tenants
  .get("/", async (c) => {
    const tenants = await db.select().from(clients);

    return c.json(tenants);
  })
  .post(async (c) => {
    const data = (await c.req.json()) as NewClient;

    const apiKey = generateApiKey();
    const dbUrl = encrypt(data.dbUrl);

    const tenant = await db.insert(clients).values({
      ...data,
      apiKey,
      dbUrl,
    });

    return c.json(tenant);
  });

tenants.get("/usage", async (c) => {
  const rows = await db.select().from(clients);

  const usage = await Promise.all(
    rows.map(async (client) => {
      const key = `usage:tenant:${client.apiKey}`;
      const count = await redis.get(key);
      return {
        domain: client.domain,
        usage: Number(count ?? 0),
      };
    })
  );

  return c.json(usage);
});

export default tenants;
