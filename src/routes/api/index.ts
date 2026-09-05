import { Hono } from "hono";
import { withTenantDrizzle } from "@/middleware";
import { type MySql2Database } from "drizzle-orm/mysql2";
import * as tenantSchema from "@/db/tenants/tenants-schema";
import type { Client } from "@/db/schema";

import emails from "./emails";
import facturas from "./facturas";
import whatsapp from "./whatsapp";

export type Variables = {
  tenantDb: MySql2Database<typeof tenantSchema>;
  client: Client;
  tenantDomain: string;
};

export const api = new Hono<{ Variables: Variables }>();

api.use("*", withTenantDrizzle);

api.route("/emails", emails);
api.route("/facturas", facturas);
api.route("/whatsapp", whatsapp);

api.get("/", async (c) => {
  const db = c.get("tenantDb");
  const result = await db.select().from(tenantSchema.companies);
  return c.json(result);
});
