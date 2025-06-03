import { Hono } from "hono";
import type { Variables } from "..";
import {
  facturas as facturasTable,
  sucursales,
  usuarios,
} from "@/db/tenants/tenants-schema";
import { eq, and, desc, or, like, sql, type SQL, count } from "drizzle-orm";

const facturas = new Hono<{ Variables: Variables }>();

facturas.get("/", async (c) => {
  let page = Number(c.req.query("page")) ?? 1;
  const limit = Number(c.req.query("limit")) ?? 10;
  let offset = (page - 1) * limit;
  const search = c.req.query("search") ?? null;
  const sucursalId = Number(c.req.query("sucursalId")) ?? null;

  const tenantDb = c.get("tenantDb");

  const conditions = [
    eq(facturasTable.cancelada, false),
    eq(facturasTable.enviado, true),
  ];

  if (sucursalId) {
    conditions.push(eq(facturasTable.sucursalId, sucursalId));
  }

  if (search?.trim()) {
    const pattern = `%${search.trim()}%`;

    conditions.push(
      or(
        sql`CAST(${facturasTable.casillero} AS CHAR) LIKE ${pattern}`,
        sql`CAST(${facturasTable.facturaId} AS CHAR) LIKE ${pattern}`,
        like(usuarios.cedula, pattern),
        like(usuarios.nombre, pattern),
        like(usuarios.apellido, pattern)
      ) as SQL<unknown>
    );
  }

  const [{ count: total }] = await tenantDb
    .select({ count: count() })
    .from(facturasTable)
    .leftJoin(usuarios, eq(facturasTable.clienteId, usuarios.id))
    .where(and(...conditions));

  if (total < offset) {
    offset = 0;
    page = 1;
  }

  const [sucursalesData, facturasData] = await Promise.all([
    tenantDb
      .select({
        sucursalId: sucursales.sucursalId,
        sucursal: sucursales.sucursal,
      })
      .from(sucursales),
    tenantDb
      .select({
        fecha: facturasTable.fecha,
        facturaId: facturasTable.facturaId,
        casillero: facturasTable.casillero,
        total: facturasTable.total,
        pagado: facturasTable.pagado,
        retirados: facturasTable.retirados,
        cliente: {
          nombre: usuarios.nombre,
          apellido: usuarios.apellido,
          cedula: usuarios.cedula,
          telefono: usuarios.telefono,
          sucursal: sucursales.sucursal,
        },
      })
      .from(facturasTable)
      .where(and(...conditions))
      .leftJoin(usuarios, eq(facturasTable.clienteId, usuarios.id))
      .leftJoin(sucursales, eq(facturasTable.sucursalId, sucursales.sucursalId))
      .orderBy(desc(facturasTable.facturaId))
      .limit(limit)
      .offset(offset),
  ]);

  const totalPages = Math.ceil(total / limit);

  return c.json({
    facturas: facturasData,
    sucursales: sucursalesData,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
});

facturas.get("/no-enviados", async (c) => {
  let page = Number(c.req.query("page")) ?? 1;
  const limit = Number(c.req.query("limit")) ?? 10;
  let offset = (page - 1) * limit;
  const search = c.req.query("search") ?? null;
  const sucursalId = Number(c.req.query("sucursalId")) ?? null;

  const tenantDb = c.get("tenantDb");

  const conditions = [
    eq(facturasTable.cancelada, false),
    eq(facturasTable.enviado, false),
  ];

  if (sucursalId) {
    conditions.push(eq(facturasTable.sucursalId, sucursalId));
  }

  if (search?.trim()) {
    const pattern = `%${search.trim()}%`;

    conditions.push(
      or(
        sql`CAST(${facturasTable.casillero} AS CHAR) LIKE ${pattern}`,
        sql`CAST(${facturasTable.facturaId} AS CHAR) LIKE ${pattern}`,
        like(usuarios.cedula, pattern),
        like(usuarios.nombre, pattern),
        like(usuarios.apellido, pattern)
      ) as SQL<unknown>
    );
  }

  const [{ count: total }] = await tenantDb
    .select({ count: count() })
    .from(facturasTable)
    .leftJoin(usuarios, eq(facturasTable.clienteId, usuarios.id))
    .where(and(...conditions));

  if (total < offset) {
    offset = 0;
    page = 1;
  }

  const [sucursalesData, facturasData] = await Promise.all([
    tenantDb
      .select({
        sucursalId: sucursales.sucursalId,
        sucursal: sucursales.sucursal,
      })
      .from(sucursales),
    tenantDb
      .select({
        fecha: facturasTable.fecha,
        facturaId: facturasTable.facturaId,
        casillero: facturasTable.casillero,
        total: facturasTable.total,
        pagado: facturasTable.pagado,
        retirados: facturasTable.retirados,
        cliente: {
          nombre: usuarios.nombre,
          apellido: usuarios.apellido,
          cedula: usuarios.cedula,
          telefono: usuarios.telefono,
          sucursal: sucursales.sucursal,
        },
      })
      .from(facturasTable)
      .where(and(...conditions))
      .leftJoin(usuarios, eq(facturasTable.clienteId, usuarios.id))
      .leftJoin(sucursales, eq(facturasTable.sucursalId, sucursales.sucursalId))
      .orderBy(desc(facturasTable.facturaId))
      .limit(limit)
      .offset(offset),
  ]);

  const totalPages = Math.ceil(total / limit);

  return c.json({
    facturas: facturasData,
    sucursales: sucursalesData,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
});

export default facturas;
