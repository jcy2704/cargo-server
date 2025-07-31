import { Hono } from "hono";
import type { Variables } from "..";
import {
  facturas as facturasTable,
  sucursales,
  usuarios,
} from "@/db/tenants/tenants-schema";
import { eq, and, desc, lt, or, like, sql, type SQL, count } from "drizzle-orm";

const facturas = new Hono<{ Variables: Variables }>();

facturas.post("/", async (c) => {
  const { cursor, sucursalId } = await c.req.json();

  const conditions = [
    eq(facturasTable.enviado, true),
    lt(facturasTable.facturaId, Number(cursor)),
  ];

  if (sucursalId) {
    conditions.push(eq(facturasTable.sucursalId, Number(sucursalId)));
  }

  const db = c.get("tenantDb");
  const facturasData = await db
    .select({
      fecha: facturasTable.fecha,
      facturaId: facturasTable.facturaId,
      casillero: facturasTable.casillero,
      total: facturasTable.total,
      pagado: facturasTable.pagado,
      retirados: facturasTable.retirados,
      sucursalId: facturasTable.sucursalId,
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
    .orderBy(desc(facturasTable.facturaId));

  return c.json({
    facturas: facturasData,
  });
});

export default facturas;
