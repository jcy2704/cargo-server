import { Worker } from "bullmq";
import resend from "@/lib/resend";
import { InvoiceEmail } from "@/lib/emails/factura";
import { groupPdfsByClient } from "@/routes/api/emails/utils/facturas-utils";
import { generatePDFBatch } from "@/routes/api/emails/utils/generate-pdf-batch";
import { getFriendlyUrl } from "@/lib/s3";
import * as tenantSchema from "@/db/tenants/tenants-schema";
import { emailQueue, redis } from "@/lib/redis";
import pLimit from "p-limit";
import type { FacturaWithRelations } from "@/db/tenants/tenants-schema";
import { tenantDbFactory } from "@/lib/tenantDbFactory";
import { FacturaRepository } from "@/core/repositories/FacturasRepository";
import { logger } from "@/lib/logger";
import { EMAIL_CONFIG } from "@/config/constants";

const isProduction = process.env.NODE_ENV === "production";

const worker = new Worker(
  "email-jobs",
  async (job) => {
    const { facturaIds, dbUrl } = job.data;

    logger.info("Processing email job", {
      jobId: job.id,
      facturaCount: facturaIds.length,
    });

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

      const limit = pLimit(EMAIL_CONFIG.CONCURRENCY);

      const results = await Promise.allSettled(
        grouped.map((group, index) =>
          limit(async () => {
            await Bun.sleep(index * EMAIL_CONFIG.STAGGER_MS);

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
                logger.error("Email send failed", {
                  to,
                  error: response.error,
                });
                throw response.error;
              }

              await facturaRepo.markAsEnviado(
                group.pdfs.map((p) => p.facturaId),
              );

              logger.info("Email sent successfully", { to });
              return { to, status: "sent" };
            } catch (err) {
              logger.error("Email send error", {
                to,
                error: err instanceof Error ? err.message : String(err),
              });
              throw err;
            }
          }),
        ),
      );

      const success = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - success;

      logger.info("Email job completed", {
        jobId: job.id,
        sent: success,
        failed,
      });

      return { sent: success, failed };
    } catch (err) {
      logger.error("Fatal email job error", {
        jobId: job.id,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },
  {
    connection: emailQueue.opts.connection,
    concurrency: EMAIL_CONFIG.CONCURRENCY,
  }
);

// Graceful shutdown handlers
const shutdown = async (signal: string) => {
  logger.info("Received shutdown signal, closing worker gracefully", {
    signal,
  });
  await worker.close();
  await redis.quit();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

worker.on("failed", (job, err) => {
  logger.error("Worker job failed", {
    jobId: job?.id,
    error: err instanceof Error ? err.message : String(err),
  });
});

worker.on("error", (err) => {
  logger.error("Worker error", {
    error: err instanceof Error ? err.message : String(err),
  });
});

worker.on("stalled", (jobId) => {
  logger.warn("Worker job stalled", { jobId });
});

worker.on("completed", (job) => {
  logger.info("Worker job completed", {
    jobId: job.id,
    returnValue: job.returnvalue
  });
});

// Handle Redis connection errors gracefully
redis.on("error", (err) => {
  logger.error("Worker Redis connection error", {
    error: err.message,
    workerActive: worker.isRunning()
  });
});

redis.on("close", () => {
  logger.warn("Worker Redis connection closed - will auto-retry");
});

redis.on("reconnecting", () => {
  logger.info("Worker Redis reconnecting...");
});

logger.info("Email worker started successfully");
