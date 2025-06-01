import type { MySql2Database } from "drizzle-orm/mysql2";
import * as tenantSchema from "@/db/tenants/tenants-schema";
import { eq, inArray } from "drizzle-orm";
import type { Context } from "hono";

export const getFacturas = async (
  tenantDb: MySql2Database<any>,
  facturaIds: number[],
  c: Context<{ Variables: { tenantDb: MySql2Database<any> } }>
) => {
  const dbFacturas = await tenantDb
    .select({
      factura: {
        facturaId: tenantSchema.facturas.facturaId,
        fecha: tenantSchema.facturas.fecha,
        total: tenantSchema.facturas.total,
        casillero: tenantSchema.facturas.casillero,
      },
      cliente: {
        nombre: tenantSchema.usuarios.nombre,
        apellido: tenantSchema.usuarios.apellido,
        correo: tenantSchema.usuarios.correo,
        casillero: tenantSchema.usuarios.casillero,
      },
      sucursal: {
        telefono: tenantSchema.sucursales.telefono,
        direccion: tenantSchema.sucursales.direccion,
        maps: tenantSchema.sucursales.maps,
        sucursal: tenantSchema.sucursales.sucursal,
        correo: tenantSchema.sucursales.correo,
      },
      trackings: {
        trackingId: tenantSchema.trackings.trackingId,
        numeroTracking: tenantSchema.trackings.numeroTracking,
        precio: tenantSchema.trackings.precio,
        peso: tenantSchema.trackings.peso,
      },
    })
    .from(tenantSchema.facturas)
    .where(inArray(tenantSchema.facturas.facturaId, facturaIds))
    .leftJoin(
      tenantSchema.usuarios,
      eq(tenantSchema.facturas.clienteId, tenantSchema.usuarios.id)
    )
    .leftJoin(
      tenantSchema.sucursales,
      eq(tenantSchema.usuarios.sucursalId, tenantSchema.sucursales.sucursalId)
    )
    .leftJoin(
      tenantSchema.trackings,
      eq(tenantSchema.facturas.facturaId, tenantSchema.trackings.facturaId)
    );

  if (!dbFacturas.length) {
    return c.json({ error: "Facturas not found" }, 400);
  }

  type TrackingRow = (typeof dbFacturas)[number]["trackings"];

  const facturasMap = new Map<
    number,
    {
      cliente: tenantSchema.UsuariosWithSucursal;
      trackings: TrackingRow[];
    }
  >();

  dbFacturas.forEach((row) => {
    const facturaId = row.factura.facturaId;

    if (!facturasMap.has(facturaId)) {
      facturasMap.set(facturaId, {
        ...row.factura,
        cliente: {
          ...row.cliente,
          sucursal: row.sucursal,
        } as tenantSchema.UsuariosWithSucursal,
        trackings: [],
      });
    }

    if (row.trackings?.trackingId) {
      facturasMap.get(facturaId)!.trackings.push(row.trackings);
    }
  });

  // Final grouped result
  const facturas = Array.from(facturasMap.values());

  return facturas;
};

type FacturaWithRelations = tenantSchema.FacturasWithTrackings &
  tenantSchema.FacturasWithCliente;

type PdfWithMeta = {
  facturaId: number;
  pdfBuffer: Buffer;
};

export function groupPdfsByClient(
  facturas: FacturaWithRelations[],
  pdfs: PdfWithMeta[]
) {
  const emailMap = new Map<
    string,
    {
      correo: string;
      pdfs: PdfWithMeta[];
      nombre: string;
      total: number;
      trackings: FacturaWithRelations["trackings"];
      casillero: number;
      sucursal: tenantSchema.Sucursales;
    }
  >();

  for (const factura of facturas) {
    const { facturaId, trackings } = factura;
    const { correo, nombre, casillero } = factura.cliente!;
    const pdf = pdfs.find((p) => p.facturaId === facturaId);
    if (!pdf) continue;

    if (!emailMap.has(correo)) {
      emailMap.set(correo, {
        correo,
        pdfs: [],
        nombre,
        total: 0,
        trackings: [],
        casillero: casillero!,
        sucursal: factura.cliente!.sucursal!,
      });
    }

    emailMap.get(correo)!.pdfs.push(pdf);
    emailMap.get(correo)!.total += factura.total!;
    emailMap.get(correo)!.trackings.push(...trackings);
  }

  return Array.from(emailMap.values());
}
