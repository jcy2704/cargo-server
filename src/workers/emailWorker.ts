import { Worker } from "bullmq";
import { getDrizzleForTenant } from "@/db/tenants/tenant-drizzle";
import resend from "@/lib/resend";
import { InvoiceEmail } from "@/lib/emails/factura";
import {
  getFacturas,
  groupPdfsByClient,
} from "@/routes/api/emails/utils/facturas-utils";
import generatePdfsInBatches from "@/routes/api/emails/utils/generate-pdf-batch";
import { getFriendlyUrl } from "@/lib/s3";
import * as tenantSchema from "@/db/tenants/tenants-schema";
import { emailQueue } from "@/lib/redis";
import pLimit from "p-limit";
import type { FacturaWithRelations } from "@/db/tenants/tenants-schema";
import { inArray } from "drizzle-orm";

new Worker(
  "email-jobs",
  async (job) => {
    const { facturaIds, dbUrl } = job.data;

    try {
      const tenantDb = await getDrizzleForTenant(dbUrl);

      const [company, facturas] = await Promise.all([
        tenantDb
          .select({
            company: tenantSchema.companies.company,
            logo: tenantSchema.companies.logo,
          })
          .from(tenantSchema.companies)
          .limit(1)
          .then((res) => res[0]),
        getFacturas(tenantDb, facturaIds),
      ]);

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

      const limit = pLimit(2);

      const results = await Promise.allSettled(
        grouped.map((group) =>
          limit(async () => {
            const to = "sjcydev12@gmail.com"; // TODO: change to group.correo before prod
            try {
              const response = await resend.emails.send({
                from: `${company.company} <no-reply@resend.dev>`,
                to,
                subject: `📦 ¡${group.trackings.length > 1 ? "Tus paquetes están listos" : "Tu paquete está listo"} para retirar!`,
                react: await InvoiceEmail({
                  nombre: group.nombre,
                  trackings: group.trackings,
                  casillero: group.casillero,
                  logo,
                  company: company.company,
                  sucursal: group.sucursal,
                  total: group.total,
                }),
                attachments: group.pdfs.map((p) => ({
                  filename: `Factura-${p.facturaId}.pdf`,
                  content: p.pdfBuffer,
                })),
              });

              if (response.error) {
                throw response.error;
              }

              const facturaIds = group.pdfs.map((p) => p.facturaId);

              await tenantDb
                .update(tenantSchema.facturas)
                .set({ enviado: true })
                .where(inArray(tenantSchema.facturas.facturaId, facturaIds));

              return { to, status: "sent" };
            } catch (err) {
              throw err;
            }
          })
        )
      );

      const success = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - success;

      console.log(
        `[email-worker] Job ${job.id} complete — Sent: ${success}, Failed: ${failed}`
      );

      return { sent: success, failed };
    } catch (err) {
      console.error(`[email-worker] Fatal job error`, err);
      throw err;
    }
  },
  { connection: emailQueue.opts.connection }
);
