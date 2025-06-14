import { generateInvoice } from "./generatePDF";
import type {
  FacturasWithTrackings,
  FacturasWithCliente,
} from "@/db/tenants/tenants-schema";

export default async function generatePdfsInBatches(
  facturas: (FacturasWithTrackings & FacturasWithCliente)[],
  company: string,
  logo: string,
  batchSize = 5
): Promise<{ facturaId: number; pdfBuffer: Buffer }[]> {
  const results: { facturaId: number; pdfBuffer: Buffer }[] = [];

  for (let i = 0; i < facturas.length; i += batchSize) {
    const batch = facturas.slice(i, i + batchSize);
    const settled = await Promise.allSettled(
      batch.map(async (factura) => {
        const pdfBuffer = await generateInvoice({
          info: factura,
          company,
          logo,
        });
        return { facturaId: factura.facturaId, pdfBuffer };
      })
    );

    for (const res of settled) {
      if (res.status === "fulfilled") results.push(res.value);
    }
  }

  return results;
}
