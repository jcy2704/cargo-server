import { Hono } from "hono";
import { withTenantDrizzle } from "@/middleware";
import { type Client, clients } from "@/db/schema";
import { type MySql2Database } from "drizzle-orm/mysql2";
import * as tenantSchema from "@/db/tenants/tenants-schema";

type Variables = {
  tenantDb: MySql2Database<typeof tenantSchema>;
  client: Client;
};

export const api = new Hono<{ Variables: Variables }>();

api.use("*", withTenantDrizzle);

api.get("/", async (c) => {
  const db = c.get("tenantDb");
  const result = await db.select().from(tenantSchema.companies);
  return c.json(result);
});
