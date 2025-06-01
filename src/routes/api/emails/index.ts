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
import { getFacturas, groupPdfsByClient } from "./utils/facturas-utils";
import generatePdfsInBatches from "./utils/generate-pdf-batch";
import { generateInvoice } from "./utils/generatePDF";

type Variables = {
  tenantDb: MySql2Database<typeof tenantSchema>;
};

const emails = new Hono<{ Variables: Variables }>();

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

    await resend.emails.send({
      from: `${company.company} <no-reply-info@resend.dev>`, // TODO: change to company email before prod
      to: correo,
      subject: `Hola ${nombre}, tu casillero personal está lista!`,
      react: await WelcomeEmail({ ...compProps }),
    });

    if (!reenviar) {
      const adminProps = {
        ...compProps,
        correo,
        cedula,
        telefono,
      } satisfies NewCustomerEmailProps;

      await resend.emails.send({
        from: `${company.company} <no-reply-info@resend.dev>`, // TODO: change to company email before prod
        to: correo, // TODO: change to sucursal email before prod
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
  const { facturaIds } = (await c.req.json()) as {
    facturaIds: number[];
  };

  if (!Array.isArray(facturaIds) || facturaIds.length === 0) {
    return c.json({ error: "Invalid facturaIds" }, 400);
  }

  const tenantDb = c.get("tenantDb");

  queueMicrotask(async () => {
    try {
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
        getFacturas(tenantDb, facturaIds, c),
      ]);

      if (!company) {
        return c.json({ error: "Company not found" }, 404);
      }

      const logo = getFriendlyUrl(company.logo as string);
      const pdfs = await generatePdfsInBatches(
        facturas as FacturaWithRelations[],
        company.company,
        logo
      );
      const grouped = groupPdfsByClient(
        facturas as FacturaWithRelations[],
        pdfs
      );

      for (let i = 0; i < grouped.length; i += 5) {
        const batch = grouped.slice(i, i + 5);

        await Promise.allSettled(
          batch.map(
            async ({
              correo,
              pdfs,
              nombre,
              total,
              trackings,
              casillero,
              sucursal,
            }) =>
              resend.emails.send({
                from: `${company.company} <no-reply-info@resend.dev>`, // TODO: change to company email before prod
                to: "sjcydev12@gmail.com", // TODO: change to client email before prod
                subject: `📦 ¡${trackings.length > 1 ? "Tus paquetes están listos" : "Tu paquete está listo"} para retirar!`,
                react: await InvoiceEmail({
                  nombre,
                  casillero,
                  trackings,
                  total,
                  logo,
                  company: company.company,
                  sucursal,
                }),
                attachments: pdfs.map((p) => ({
                  filename: `Factura-${p.facturaId}.pdf`,
                  content: p.pdfBuffer,
                })),
              })
          )
        );
      }

      return c.json({ message: "Emails sent successfully" }, 200);
    } catch (e) {
      console.error(e);
      return c.json({ error: "Failed to send emails" }, 500);
    }
  });

  return c.json({ message: "Emails sent to background for sending" }, 202);
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

      const pdf = await generateInvoice({
        info: factura,
        company: company.company,
        logo,
      });

      await resend.emails.send({
        from: `${company.company} <no-reply-info@resend.dev>`, // TODO: change to company email before prod
        to: "sjcydev12@gmail.com", // TODO: change to client email before prod
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
