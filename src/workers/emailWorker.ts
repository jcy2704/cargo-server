import { Worker } from "bullmq";
// import { getDrizzleForTenant } from "@/db/tenants/tenant-drizzle";
import resend from "@/lib/resend";
import { InvoiceEmail } from "@/lib/emails/factura";
import { groupPdfsByClient } from "@/routes/api/emails/utils/facturas-utils";
import { generatePDFBatch } from "@/routes/api/emails/utils/generate-pdf-batch";
import { getFriendlyUrl } from "@/lib/s3";
import * as tenantSchema from "@/db/tenants/tenants-schema";
import { emailQueue } from "@/lib/redis";
import pLimit from "p-limit";
import type { FacturaWithRelations } from "@/db/tenants/tenants-schema";
import { tenantDbFactory } from "@/lib/tenantDbFactory";
import { FacturaRepository } from "@/core/repositories/FacturasRepository";

const isProduction = process.env.NODE_ENV === "production";

new Worker(
  "email-jobs",
  async (job) => {
    const { facturaIds, dbUrl } = job.data;

    try {
      const tenantDb = await tenantDbFactory.getClient(dbUrl);
      const facturaRepo = new FacturaRepository(tenantDb);

      const [{ company, logo, dominio }, facturas] = await Promise.all([
        tenantDb
          .select({
            company: tenantSchema.companies.company,
            logo: tenantSchema.companies.logo,
            dominio: tenantSchema.companies.dominio,
          })
          .from(tenantSchema.companies)
          .limit(1)
          .then(([res]) => ({
            company: res.company,
            logo: getFriendlyUrl(res.logo as string),
            dominio: res.dominio,
          })),
        facturaRepo.getWithRelations(facturaIds),
      ]);

      const pdfs = await generatePDFBatch(
        facturas as FacturaWithRelations[],
        company,
        logo,
      );

      const grouped = groupPdfsByClient(
        facturas as FacturaWithRelations[],
        pdfs,
      );

      const limit = pLimit(2);

      const results = await Promise.allSettled(
        grouped.map((group, index) =>
          limit(async () => {
            await Bun.sleep(index * 500);

            const from = isProduction
              ? `${company} <no-reply@${dominio}>`
              : `${company} <no-reply@resend.dev>`;

            const to = isProduction ? group.correo : "sjcydev12@gmail.com";

            try {
              const response = await resend.emails.send({
                from,
                to,
                subject: `📦 ¡${group.trackings.length > 1 ? "Tus paquetes están listos" : "Tu paquete está listo"} para retirar!`,
                react: await InvoiceEmail({
                  nombre: group.nombre,
                  trackings: group.trackings,
                  casillero: group.casillero,
                  logo,
                  company,
                  sucursal: group.sucursal,
                  total: group.total,
                }),
                attachments: group.pdfs.map((p) => ({
                  filename: `Factura-${p.facturaId}.pdf`,
                  content: p.pdfBuffer,
                })),
              });

              if (response.error) {
                console.error("Response error:", response.error);
                throw response.error;
              }

              await facturaRepo.markAsEnviado(
                group.pdfs.map((p) => p.facturaId),
              );

              return { to, status: "sent" };
            } catch (err) {
              console.error("worker: ", err);
              throw err;
            }
          }),
        ),
      );

      const success = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - success;

      console.log(
        `[email-worker] Job ${job.id} complete — Sent: ${success}, Unsent: ${failed}`,
      );

      return { sent: success, failed };
    } catch (err) {
      console.error(`[email-worker] Fatal job error`, err);
      throw err;
    }
  },
  { connection: emailQueue.opts.connection },
);
