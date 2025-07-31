import { Hono } from "hono";
import type { Variables } from "../index";
import { usuarios, sucursales } from "@/db/tenants/tenants-schema";
import { eq, or, like, and, count, desc, sql, lt } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

const clientes = new Hono<{ Variables: Variables }>();

clientes.post("/all", async (c) => {
  const db = c.get("tenantDb");
  const { cursor } = await c.req.json();

  const clientes = await db.select({
    id: usuarios.id,
    nombre: usuarios.nombre,
    apellido: usuarios.apellido,
    correo: usuarios.correo,
    casillero: usuarios.casillero,
    cedula: usuarios.cedula,
    telefono: usuarios.telefono,
    nacimiento: usuarios.nacimiento,
    sexo: usuarios.sexo,
    sucursal: sucursales.sucursal,
    sucursalId: sucursales.sucursalId
  })
    .from(usuarios)
    .where(and(eq(usuarios.archivado, false), lt(usuarios.casillero, cursor)))
    .leftJoin(sucursales, eq(usuarios.sucursalId, sucursales.sucursalId))
    .orderBy(desc(usuarios.casillero))

  return c.json({ clientes });
})

clientes.get("/", async (c) => {
  const search = c.req.query("search") ?? null;
  let page = Number(c.req.query("page")) ?? 1;
  const limit = Number(c.req.query("limit")) ?? 10;
  let offset = (page - 1) * limit;
  const sucursalId = Number(c.req.query("sucursalId")) ?? null;

  const db = c.get("tenantDb");

  const conditions = [eq(usuarios.archivado, false)];

  if (sucursalId) {
    conditions.push(eq(usuarios.sucursalId, sucursalId));
  }

  let pattern = search;
  if (search?.trim()) {
    const pattern = `%${search.trim()}%`;

    conditions.push(
      or(
        sql`${usuarios.casillero} = ${parseInt(search) || 0}`,
        like(usuarios.nombre, pattern),
        like(usuarios.apellido, pattern),
      ) as SQL<unknown>
    );
  }

  const [{ count: total }] = await db
    .select({ count: count() })
    .from(usuarios)
    .where(and(...conditions));

  if (total < offset) {
    offset = 0;
    page = 1;
  }

  const [sucursalesData, clientes] = await Promise.all([
    db
      .select({
        sucursalId: sucursales.sucursalId,
        sucursal: sucursales.sucursal,
      })
      .from(sucursales),
    db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        apellido: usuarios.apellido,
        correo: usuarios.correo,
        casillero: usuarios.casillero,
        cedula: usuarios.cedula,
        telefono: usuarios.telefono,
        nacimiento: usuarios.nacimiento,
        sexo: usuarios.sexo,
        sucursal: sucursales.sucursal,
        relevance: sql<number>`
          CASE 
            WHEN ${usuarios.casillero} = ${search ? parseInt(search) || 0 : 0} THEN 100
            WHEN ${usuarios.nombre} LIKE ${pattern} THEN 80
            WHEN ${usuarios.apellido} LIKE ${pattern} THEN 75
            ELSE 0
          END
        `.as('relevance')
      })
      .from(usuarios)
      .where(and(...conditions))
      .leftJoin(sucursales, eq(usuarios.sucursalId, sucursales.sucursalId))
      .orderBy(desc(usuarios.casillero))
      .limit(limit)
      .offset(offset),
  ]);

  const totalPages = Math.ceil(total / limit);

  return c.json({
    clientes,
    sucursales: sucursalesData,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
});

export default clientes;
