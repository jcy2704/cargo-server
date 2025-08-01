import { Hono } from "hono";
import type { Variables } from "..";
import {
  companies,
  facturas as facturasTable,
  sucursales,
  usuarios,
} from "@/db/tenants/tenants-schema";
import { eq, and, desc, lt } from "drizzle-orm";
import { generateInvoiceStream } from "@/lib/invoices/invoice";
import { FacturaRepository } from "@/core/repositories/FacturasRepository";
import { getFriendlyUrl } from "@/lib/s3";

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

facturas.get("/descargar/:facturaId", async (c) => {
  const { facturaId } = c.req.param();

  const db = c.get("tenantDb");
  const facturaRepo = new FacturaRepository(db);

  const [{ company, logo }, factura] = await Promise.all([
    db
      .select({
        company: companies.company,
        logo: companies.logo,
      })
      .from(companies)
      .limit(1)
      .then(([res]) => ({
        company: res.company,
        logo: getFriendlyUrl(res.logo as string),
      })),
    facturaRepo.getWithRelations([Number(facturaId)]),
  ]);

  const pdfBuffer = await generateInvoiceStream(factura[0], company, logo);

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Factura-${facturaId}.pdf"`,
    },
  });

});

export default facturas;
