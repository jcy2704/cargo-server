import { mysqlTable, int, varchar, timestamp } from "drizzle-orm/mysql-core";

export const clients = mysqlTable("clients", {
  id: int("id").primaryKey().autoincrement(),
  domain: varchar("domain", { length: 255 }).notNull().unique(),
  apiKey: varchar("api_key", { length: 255 }).notNull().unique(),
  dbUrl: varchar("db_url", { length: 500 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").onUpdateNow(),
});
