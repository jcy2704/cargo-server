import {
  mysqlTable,
  int,
  varchar,
  timestamp,
  boolean,
} from "drizzle-orm/mysql-core";

export const clients = mysqlTable("clients", {
  id: int("id").primaryKey().autoincrement(),
  domain: varchar("domain", { length: 255 }).notNull().unique(),
  apiKey: varchar("apiKey", { length: 255 }).notNull().unique(),
  dbUrl: varchar("dbUrl", { length: 500 }).notNull(),
  // WhatsApp (WABA) delivery credentials — tenant metadata, like dbUrl/apiKey.
  // whatsappAccessToken is encrypted at rest with utils/crypto (AES-256-GCM),
  // never stored in plaintext. See .scratch/whatsapp-invoice.
  whatsappEnabled: boolean("whatsapp_enabled").notNull().default(false),
  whatsappPhoneNumberId: varchar("whatsapp_phone_number_id", { length: 255 }),
  whatsappWabaId: varchar("whatsapp_waba_id", { length: 255 }),
  whatsappAccessToken: varchar("whatsapp_access_token", { length: 1024 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").onUpdateNow(),
});

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
