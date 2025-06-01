import {
  mysqlTable,
  varchar,
  datetime,
  int,
  timestamp,
  float,
  boolean,
  json,
  longtext,
} from "drizzle-orm/mysql-core";

import { relations } from "drizzle-orm";
import type { InferResultType } from "./extras";

export const companies = mysqlTable("companies", {
  companyId: int("companyId").autoincrement().primaryKey(),
  company: varchar("company", {
    length: 255,
  }).notNull(),
  logo: varchar("logo", {
    length: 255,
  }),
  dominio: varchar("dominio", {
    length: 255,
  }).notNull(),
  sucursalesLimit: int("sucursalesLimit").default(1),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").onUpdateNow(),
});

export const sucursales = mysqlTable("sucursales", {
  sucursalId: int("sucursalId").autoincrement().primaryKey(),
  sucursal: varchar("nombre", { length: 255 }).notNull(),
  direccion: varchar("direccion", { length: 255 }).notNull(),
  maps: varchar("maps", { length: 255 }),
  telefono: varchar("telefono", { length: 255 }).notNull(),
  precio: float("precio").default(2.75).notNull(),
  codificacion: varchar("codificacion", { length: 4 }).notNull(),
  correo: varchar("correo", { length: 255 }).notNull(),
  companyId: int("company").references(() => companies.companyId),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").onUpdateNow(),
});

export const users = mysqlTable("users", {
  id: varchar("id", {
    length: 255,
  }).primaryKey(),
  nombre: varchar("nombre", { length: 100 }),
  apellido: varchar("apellido", { length: 100 }),
  username: varchar("username", {
    length: 100,
  }).unique(),
  passwordHash: varchar("passwordHash", {
    length: 255,
  }).notNull(),
  passwordUpdated: boolean("passwordUpdated").default(false),
  correo: varchar("correo", { length: 255 }).notNull(),
  rol: varchar("rol", {
    length: 10,
    enum: ["ADMIN", "SECRETARIA", "EMPLEADO"],
  })
    .default("EMPLEADO")
    .notNull(),
  sucursalId: int("sucursalId").references(() => sucursales.sucursalId),
  companyId: int("company").references(() => companies.companyId),
  archivado: boolean("archivado").default(false),
  archivadoAt: timestamp("archivadoAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").onUpdateNow(),
});

export const session = mysqlTable("session", {
  id: varchar("id", {
    length: 255,
  }).primaryKey(),
  userId: varchar("user_id", {
    length: 255,
  })
    .notNull()
    .references(() => users.id),
  expiresAt: datetime("expires_at").notNull(),
});

export const usuarios = mysqlTable("usuarios", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  apellido: varchar("apellido", { length: 100 }).notNull(),
  cedula: varchar("cedula", { length: 20 }).notNull(),
  telefono: varchar("telefono", { length: 25 }).notNull(),
  casillero: int("casillero").unique(),
  sucursalId: int("sucursalId")
    .references(() => sucursales.sucursalId)
    .notNull(),
  nacimiento: datetime("nacimiento").notNull(),
  correo: varchar("correo", { length: 255 }).notNull(),
  sexo: varchar("sexo", {
    enum: ["Masculino", "Femenino", "Otros"],
    length: 9,
  }).default("Otros"),
  precio: float("precio").default(2.75),
  tipo: varchar("tipo", {
    enum: ["REGULAR", "ESPECIAL", "CORPORATIVO"],
    length: 11,
  })
    .default("REGULAR")
    .notNull(),
  archivado: boolean("archivado").default(false),
  archivadoAt: timestamp("archivadoAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").onUpdateNow(),
});

export const facturas = mysqlTable("facturas", {
  facturaId: int("facturaId").autoincrement().primaryKey(),
  casillero: int("casillero"),
  fecha: varchar("fecha", { length: 50 }).notNull(),
  pagado: boolean("pagado").default(false),
  clienteId: int("clienteId")
    .references(() => usuarios.id)
    .notNull(),
  total: float("total").default(0),
  metodoDePago: varchar("metodoDePago", {
    length: 15,
    enum: [
      "transferencia",
      "efectivo",
      "yappy",
      "tarjeta",
      "otros",
      "no_pagado",
    ],
  })
    .default("no_pagado")
    .notNull(),
  pagadoAt: timestamp("pagadoAt"),
  sucursalId: int("sucursalId")
    .references(() => sucursales.sucursalId)
    .notNull(),
  empleadoId: varchar("empleadoId", { length: 255 })
    .references(() => users.id)
    .notNull(),
  retirados: boolean("retirados").default(false),
  enviado: boolean("enviado").default(false),
  cancelada: boolean("cancelada").default(false),
  canceladaAt: timestamp("canceladaAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").onUpdateNow(),
});

export const reportes = mysqlTable("reportes", {
  reporteId: int("reporteId").autoincrement().primaryKey(),
  fechaInicial: datetime("fechaInicial"),
  fechaFinal: datetime("fechaFinal"),
  facturas: int("facturas"),
  facturasIds: longtext("facturasIds"),
  total: float("total"),
  empleadoId: varchar("empleadoId", { length: 255 }).references(() => users.id),
  sucursalId: int("sucursalId").references(() => sucursales.sucursalId),
  metodoDePago: longtext("metodoDePago"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").onUpdateNow(),
});

export const trackings = mysqlTable("trackings", {
  trackingId: int("trackingId").autoincrement().primaryKey(),
  facturaId: int("facturaId").references(() => facturas.facturaId),
  numeroTracking: varchar("numeroTracking", { length: 255 }),
  peso: int("peso"),
  base: float("base"),
  precio: float("precio"),
  sucursalId: int("sucursalId").references(() => sucursales.sucursalId),
  retirado: boolean("retirado").default(false),
  retiradoAt: timestamp("retiradoAt"),
  cancelada: boolean("cancelada").default(false),
  canceladaAt: timestamp("canceladaAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").onUpdateNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  sucursal: one(sucursales, {
    fields: [users.sucursalId],
    references: [sucursales.sucursalId],
  }),
  facturas: many(facturas),
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.companyId],
  }),
}));

export const usuariosRelations = relations(usuarios, ({ many, one }) => ({
  facturas: many(facturas),
  sucursal: one(sucursales, {
    fields: [usuarios.sucursalId],
    references: [sucursales.sucursalId],
  }),
}));

export const facturasRelations = relations(facturas, ({ one, many }) => ({
  cliente: one(usuarios, {
    fields: [facturas.casillero],
    references: [usuarios.casillero],
  }),
  trackings: many(trackings),
  sucursal: one(sucursales, {
    fields: [facturas.sucursalId],
    references: [sucursales.sucursalId],
  }),
  empleado: one(users, {
    fields: [facturas.empleadoId],
    references: [users.id],
  }),
}));

export const trackingsRelations = relations(trackings, ({ one }) => ({
  factura: one(facturas, {
    fields: [trackings.facturaId],
    references: [facturas.facturaId],
  }),
  sucursal: one(sucursales, {
    fields: [trackings.sucursalId],
    references: [sucursales.sucursalId],
  }),
}));

export const sucursalesRelations = relations(sucursales, ({ many, one }) => ({
  usuarios: many(usuarios),
  user: many(users),
  facturas: many(facturas),
  company: one(companies, {
    fields: [sucursales.companyId],
    references: [companies.companyId],
  }),
  trackings: many(trackings),
}));

export const reportesRelations = relations(reportes, ({ one }) => ({
  empleado: one(users, {
    fields: [reportes.empleadoId],
    references: [users.id],
  }),
  sucursal: one(sucursales, {
    fields: [reportes.sucursalId],
    references: [sucursales.sucursalId],
  }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  sucursales: many(sucursales),
  users: many(users),
}));

export type Companies = typeof companies.$inferSelect;
export type NewCompanies = typeof companies.$inferInsert;
export type Sucursales = typeof sucursales.$inferSelect;
export type NewSucursales = typeof sucursales.$inferInsert;
export type Usuarios = typeof usuarios.$inferSelect;
export type NewUsuarios = typeof usuarios.$inferInsert;
export type Facturas = typeof facturas.$inferSelect;
export type NewFacturas = typeof facturas.$inferInsert;
export type Trackings = typeof trackings.$inferSelect;
export type NewTrackings = typeof trackings.$inferInsert;
export type Reportes = typeof reportes.$inferSelect;
export type NewReportes = typeof reportes.$inferInsert;

export type UsuariosWithSucursal = InferResultType<
  "usuarios",
  { sucursal: true }
>;

export type FacturasWithTrackings = InferResultType<
  "facturas",
  { trackings: true }
>;

export type FacturasWithCliente = InferResultType<
  "facturas",
  { cliente: { with: { sucursal: true } } }
>;

export type TrackingsWithSucursal = InferResultType<
  "trackings",
  { sucursal: true }
>;

export type Session = typeof session.$inferSelect;
export type Users = typeof users.$inferSelect;
