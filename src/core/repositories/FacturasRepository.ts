import { inArray, eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import type {
  FacturaWithRelations,
  UsuariosWithSucursal,
} from "@/db/tenants/tenants-schema";
import * as TenantSchema from "@/db/tenants/tenants-schema";
import {
  facturas,
  usuarios,
  sucursales,
  trackings,
} from "@/db/tenants/tenants-schema";

export class FacturaRepository {
  constructor(private db: MySql2Database<typeof TenantSchema>) {}

  async getWithRelations(
    facturaIds: number[],
  ): Promise<FacturaWithRelations[]> {
    const dbFacturas = await this.db
      .select({
        factura: {
          facturaId: facturas.facturaId,
          fecha: facturas.fecha,
          total: facturas.total,
          casillero: facturas.casillero,
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
      .from(facturas)
      .where(inArray(facturas.facturaId, facturaIds))
      .leftJoin(usuarios, eq(facturas.clienteId, usuarios.id))
      .leftJoin(sucursales, eq(usuarios.sucursalId, sucursales.sucursalId))
      .leftJoin(trackings, eq(facturas.facturaId, trackings.facturaId));

    if (!dbFacturas.length) {
      const errMsg = "No facturas found for the provided IDs.";
      throw new Error(errMsg);
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
  }

  async markAsEnviado(facturaIds: number[]): Promise<void> {
    await this.db
      .update(facturas)
      .set({ enviado: true })
      .where(inArray(facturas.facturaId, facturaIds));
  }
}
