import type { MySql2Database } from "drizzle-orm/mysql2";
import {
  facturas as tenantFacturas,
  usuarios,
  sucursales,
  trackings,
} from "@/db/tenants/tenants-schema";
import * as tenantSchema from "@/db/tenants/tenants-schema";
import type {
  FacturaWithRelations,
  UsuariosWithSucursal,
  Sucursales,
} from "@/db/tenants/tenants-schema";
import { eq, inArray } from "drizzle-orm";
import type { Context } from "hono";

export const getFacturas = async (
  tenantDb: MySql2Database<typeof tenantSchema>,
  facturaIds: number[],
  c?: Context<{ Variables: { tenantDb: MySql2Database<typeof tenantSchema> } }>
) => {
  const dbFacturas = await tenantDb
    .select({
      factura: {
        facturaId: tenantFacturas.facturaId,
        fecha: tenantFacturas.fecha,
        total: tenantFacturas.total,
        casillero: tenantFacturas.casillero,
      },
      cliente: {
        nombre: usuarios.nombre,
        apellido: usuarios.apellido,
        correo: usuarios.correo,
        casillero: usuarios.casillero,
      },
      sucursal: {
        telefono: sucursales.telefono,
        direccion: sucursales.direccion,
        maps: sucursales.maps,
        sucursal: sucursales.sucursal,
        correo: sucursales.correo,
      },
      trackings: {
        trackingId: trackings.trackingId,
        numeroTracking: trackings.numeroTracking,
        precio: trackings.precio,
        peso: trackings.peso,
      },
    })
    .from(tenantFacturas)
    .where(inArray(tenantFacturas.facturaId, facturaIds))
    .leftJoin(usuarios, eq(tenantFacturas.clienteId, usuarios.id))
    .leftJoin(sucursales, eq(usuarios.sucursalId, sucursales.sucursalId))
    .leftJoin(trackings, eq(tenantFacturas.facturaId, trackings.facturaId));

  if (!dbFacturas.length) {
    const errMsg = "No facturas found for the provided IDs.";
    if (c) {
      return c.json({ error: errMsg }, 400);
    } else {
      throw new Error(errMsg);
    }
  }

  type TrackingRow = (typeof dbFacturas)[number]["trackings"];

  const facturasMap = new Map<
    number,
    {
      cliente: UsuariosWithSucursal;
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
        } as UsuariosWithSucursal,
        trackings: [],
      });
    }

    if (row.trackings?.trackingId) {
      facturasMap.get(facturaId)!.trackings.push(row.trackings);
    }
  });

  return Array.from(facturasMap.values()) as FacturaWithRelations[];
};

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
      sucursal: Sucursales;
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
