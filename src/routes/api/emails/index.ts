import { Hono } from "hono";
import * as tenantSchema from "@/db/tenants/tenants-schema";
import { type FacturaWithRelations } from "@/db/tenants/tenants-schema";
import { eq } from "drizzle-orm";
import { type MySql2Database } from "drizzle-orm/mysql2";
import { WelcomeEmail, type WelcomeEmailProps } from "@/lib/emails/welcome";
import { InvoiceEmail } from "@/lib/emails/factura";
import {
  NewCustomerEmail,
  type NewCustomerEmailProps,
} from "@/lib/emails/new-customer";
import resend from "@/lib/resend";
import { getFriendlyUrl } from "@/lib/s3";
import { getFacturas } from "./utils/facturas-utils";
import { generateInvoiceBuffer } from "@/lib/invoices/invoice";
import { emailQueue } from "@/lib/redis";
import { db as sharedDb } from "@/db";
import { clients } from "@/db/schema";
import chunk from "lodash.chunk";

const isProduction = process.env.NODE_ENV === "production";

type Variables = {
  tenantDb: MySql2Database<typeof tenantSchema>;
};

const emails = new Hono<{ Variables: Variables }>();

emails.get("/status/:jobId", async (c) => {
  const jobId = c.req.param("jobId");

  try {
    const job = await emailQueue.getJob(jobId);
    if (!job) return c.json({ status: "not found" }, 404);

    const state = await job.getState();
    const progress = job.progress;
    const attempts = job.attemptsMade;
    const failedReason = job.failedReason;

    return c.json({
      jobId,
      status: state,
      progress,
      attempts,
      failedReason,
      returnValue: job.returnvalue,
    });
  } catch (err) {
    return c.json({ error: "Internal error" }, 500);
  }
});

emails.post("/bienvenida", async (c) => {
  const body = (await c.req.json()) as tenantSchema.NewUsuarios & {
    reenviar?: boolean;
  };
  let {
    nombre,
    apellido,
    casillero,
    sucursalId,
    correo,
    cedula,
    telefono,
    reenviar = false,
  } = body;

  const tenantDb = c.get("tenantDb");

  try {
    const [company, sucursal] = await Promise.all([
      tenantDb
        .select({
          company: tenantSchema.companies.company,
          logo: tenantSchema.companies.logo,
          dominio: tenantSchema.companies.dominio,
        })
        .from(tenantSchema.companies)
        .limit(1)
        .then((res) => res[0]),
      tenantDb
        .select({
          sucursal: tenantSchema.sucursales.sucursal,
          codificacion: tenantSchema.sucursales.codificacion,
          correo: tenantSchema.sucursales.correo,
          telefono: tenantSchema.sucursales.telefono,
        })
        .from(tenantSchema.sucursales)
        .where(eq(tenantSchema.sucursales.sucursalId, sucursalId))
        .limit(1)
        .then((res) => res[0]),
    ]);

    if (!company || !sucursal) {
      return c.json({ error: "Company or Sucursal not found" }, 404);
    }

    const logo = getFriendlyUrl(company.logo as string);

    const compProps = {
      nombre,
      apellido,
      casillero: String(casillero),
      sucursal: sucursal as tenantSchema.Sucursales,
      nombre_de_compania: company.company,
      logo,
    } satisfies WelcomeEmailProps;

    const from = isProduction
      ? `${company.company} <no-reply-info@${company.dominio}>`
      : `${company.company} <no-reply-info@resend.dev>`;

    await resend.emails.send({
      from,
      to: correo,
      subject: `Hola ${nombre}, tu casillero personal está lista!`,
      react: await WelcomeEmail({ ...compProps }),
    });

    const adminTo = isProduction ? sucursal.correo : "sjcydev12@gmail.com";

    if (!reenviar) {
      const adminProps = {
        ...compProps,
        correo,
        cedula,
        telefono,
      } satisfies NewCustomerEmailProps;

      await resend.emails.send({
        from,
        to: adminTo,
        subject: `¡Nuevo Casillero Registrado!`,
        react: await NewCustomerEmail({ ...adminProps }),
      });
    }

    return c.json({ message: "Email sent successfully" }, 200);
  } catch (e) {
    console.log(e);
    return c.json({ error: "Failed to send email" }, 500);
  }
});

emails.post("/send-bulk-facturas", async (c) => {
  const { facturaIds } = (await c.req.json()) as { facturaIds: number[] };
  if (!Array.isArray(facturaIds) || facturaIds.length === 0) {
    return c.json({ error: "Invalid facturaIds" }, 400);
  }

  const apiKey = c.req.header("Authorization")?.replace("Bearer ", "").trim();
  const client = (
    await sharedDb
      .select()
      .from(clients)
      .where(eq(clients.apiKey, apiKey!))
      .limit(1)
  )[0];

  if (!client) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const jobs = [];

  for (const facturaChunk of chunk(facturaIds, 10)) {
    const job = await emailQueue.add("bulk-factura", {
      facturaIds: facturaChunk,
      dbUrl: client.dbUrl,
    });

    jobs.push(job.id);
  }

  return c.json({ message: "Factura jobs queued", jobIds: jobs }, 202);
});

emails.post("/send-factura", async (c) => {
  const { facturaId } = (await c.req.json()) as {
    facturaId: number;
  };

  const tenantDb = c.get("tenantDb");

  const [company, facturas] = await Promise.all([
    tenantDb
      .select({
        company: tenantSchema.companies.company,
        logo: tenantSchema.companies.logo,
        dominio: tenantSchema.companies.dominio,
      })
      .from(tenantSchema.companies)
      .limit(1)
      .then((res) => res[0]),
    getFacturas(tenantDb, [facturaId], c) as Promise<FacturaWithRelations[]>,
  ]);

  if (!company) {
    return c.json({ error: "Company not found" }, 404);
  }
  if (!facturas.length) {
    return c.json({ error: "Factura not found" }, 404);
  }

  queueMicrotask(async () => {
    try {
      const logo = getFriendlyUrl(company.logo as string);
      const factura = facturas[0];

      const pdf = await generateInvoiceBuffer(factura, company.company, logo);

      const from = isProduction
        ? `${company.company} <no-reply-info@${company.dominio}>`
        : `${company.company} <no-reply-info@resend.dev>`;

      const to = isProduction ? factura.cliente!.correo : "sjcydev12@gmail.com";

      await resend.emails.send({
        from,
        to,
        subject: `📦 ¡${factura.trackings.length > 1 ? "Tus paquetes están listos" : "Tu paquete está listo"} para retirar!`,
        react: await InvoiceEmail({
          nombre: factura.cliente!.nombre,
          trackings: factura.trackings,
          casillero: factura.cliente!.casillero!,
          logo,
          company: company.company,
          sucursal: factura.cliente!.sucursal!,
          total: factura.total!,
        }),
        attachments: [
          {
            filename: `Factura-${factura.facturaId}.pdf`,
            content: pdf,
          },
        ],
      });
      return c.json({ message: "Email sent successfully" }, 200);
    } catch (e) {
      console.error(e);
      return c.json({ error: "Failed to send email" }, 500);
    }
  });

  return c.json({ message: "Email sent to background for sending" }, 202);
});

export default emails;
