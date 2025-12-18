import { Hono } from "hono";
import * as tenantSchema from "@/db/tenants/tenants-schema";
import { eq } from "drizzle-orm";
import { type MySql2Database } from "drizzle-orm/mysql2";
import { WelcomeEmail, type WelcomeEmailProps } from "@/lib/emails/welcome";
import {
  NewCustomerEmail,
  type NewCustomerEmailProps,
} from "@/lib/emails/new-customer";
import resend from "@/lib/resend";
import { getFriendlyUrl } from "@/lib/s3";
import { emailQueue } from "@/lib/redis";
import chunk from "lodash.chunk";
import { getTenantLogger } from "@/utils/tenant-logger";
import { EMAIL_CONFIG } from "@/config/constants";
import {
  NotFoundError,
  ValidationError,
  InternalServerError,
} from "@/utils/errors";
import type { Client } from "@/db/schema";

const isProduction = process.env.NODE_ENV === "production";

type Variables = {
  tenantDb: MySql2Database<typeof tenantSchema>;
  client: Client;
};

const emails = new Hono<{ Variables: Variables }>();

emails.get("/status/:jobId", async (c) => {
  const jobId = c.req.param("jobId");

  const job = await emailQueue.getJob(jobId);
  if (!job) {
    throw new NotFoundError("Email job");
  }

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
});

emails.post("/bienvenida", async (c) => {
  const log = getTenantLogger(c);
  const body = (await c.req.json()) as tenantSchema.NewUsuarios & {
    reenviar?: boolean;
  };
  const {
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
        sucursalId: tenantSchema.sucursales.sucursalId,
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

  const direcciones = await tenantDb
    .select({
      addressId: tenantSchema.addresses.addressId,
      name: tenantSchema.addresses.name,
      address1: tenantSchema.addresses.address1,
      address2: tenantSchema.addresses.address2,
      zipcode: tenantSchema.addresses.zipcode,
      state: tenantSchema.addresses.state,
      city: tenantSchema.addresses.city,
      country: tenantSchema.addresses.country,
      tel: tenantSchema.addresses.tel,
      suffix: tenantSchema.addresses.suffix
    })
    .from(tenantSchema.addresses)
    .innerJoin(
      tenantSchema.sucursalToAddress,
      eq(
        tenantSchema.addresses.addressId,
        tenantSchema.sucursalToAddress.addressId,
      ),
    )
    .where(eq(tenantSchema.sucursalToAddress.sucursalId, sucursal.sucursalId));

  if (!company) {
    throw new NotFoundError("Company");
  }
  if (!sucursal) {
    throw new NotFoundError("Sucursal");
  }

  const logo = getFriendlyUrl(company.logo as string);

  const compProps = {
    nombre,
    apellido,
    casillero: String(casillero),
    sucursal: sucursal as tenantSchema.Sucursales,
    nombre_de_compania: company.company,
    logo,
    direcciones: direcciones as tenantSchema.Addresses[],
  } satisfies WelcomeEmailProps;

  const from = isProduction
    ? `${company.company} <no-reply-info@${company.dominio}>`
    : `${company.company} <no-reply-info@resend.dev>`;

  try {
    await resend.emails.send({
      from,
      to: correo,
      subject: `Hola ${nombre}, tu casillero personal está lista!`,
      react: await WelcomeEmail({ ...compProps }),
    });

    log.info("Welcome email sent", { correo, casillero });

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

      log.info("New customer notification sent", { adminTo, casillero });
    }

    return c.json({ message: "Email sent successfully" }, 200);
  } catch (err) {
    log.error("Failed to send welcome email", {
      correo,
      casillero,
      error: err instanceof Error ? err.message : String(err),
    });
    throw new InternalServerError("Failed to send email");
  }
});

emails.post("/send-bulk-facturas", async (c) => {
  const log = getTenantLogger(c);
  const { facturaIds } = (await c.req.json()) as { facturaIds: number[] };

  if (!Array.isArray(facturaIds) || facturaIds.length === 0) {
    throw new ValidationError("facturaIds must be a non-empty array");
  }

  // Get client from middleware context (already authenticated)
  const client = c.get("client");

  const jobs = [];

  for (const facturaChunk of chunk(facturaIds, EMAIL_CONFIG.CHUNK_SIZE)) {
    const job = await emailQueue.add("bulk-factura", {
      facturaIds: facturaChunk,
      dbUrl: client.dbUrl,
    });

    jobs.push(job.id);
  }

  log.info("Bulk factura jobs queued", {
    totalFacturas: facturaIds.length,
    jobCount: jobs.length,
  });

  return c.json({ message: "Factura jobs queued", jobIds: jobs }, 202);
});

emails.post("/send-factura", async (c) => {
  const log = getTenantLogger(c);
  const { facturaId } = (await c.req.json()) as {
    facturaId: number;
  };

  if (!facturaId || typeof facturaId !== "number") {
    throw new ValidationError("facturaId must be a valid number");
  }

  // Get client from middleware context
  const client = c.get("client");

  // Queue the email job instead of using queueMicrotask
  const job = await emailQueue.add("bulk-factura", {
    facturaIds: [facturaId],
    dbUrl: client.dbUrl,
  });

  log.info("Single factura email queued", {
    facturaId,
    jobId: job.id,
  });

  return c.json(
    {
      message: "Email queued for sending",
      jobId: job.id,
    },
    202,
  );
});

export default emails;
