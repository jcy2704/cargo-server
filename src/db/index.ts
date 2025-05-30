import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "./schema";
import { createPool } from "mysql2/promise";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const client = createPool(process.env.DATABASE_URL);

export const db: MySql2Database<typeof schema> = drizzle(client, {
  mode: "default",
  schema,
});
