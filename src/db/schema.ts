import { mysqlTable, int, varchar, timestamp } from "drizzle-orm/mysql-core";

export const clients = mysqlTable("clients", {
  id: int("id").primaryKey().autoincrement(),
  domain: varchar("domain", { length: 255 }).notNull().unique(),
  apiKey: varchar("apiKey", { length: 255 }).notNull().unique(),
  dbUrl: varchar("dbUrl", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").onUpdateNow(),
});

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
