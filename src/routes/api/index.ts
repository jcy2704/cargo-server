import { Hono } from "hono";
import { withTenantDrizzle } from "@/middleware";
import { type MySql2Database } from "drizzle-orm/mysql2";
import * as tenantSchema from "@/db/tenants/tenants-schema";

import emails from "./emails";
import clientes from "./clientes";
import facturas from "./facturas";

export type Variables = {
  tenantDb: MySql2Database<typeof tenantSchema>;
};

export const api = new Hono<{ Variables: Variables }>();

api.use("*", withTenantDrizzle);

api.route("/emails", emails);
api.route("/clientes", clientes);
api.route("/facturas", facturas);

api.get("/", async (c) => {
  const db = c.get("tenantDb");
  const result = await db.select().from(tenantSchema.companies);
  return c.json(result);
});
