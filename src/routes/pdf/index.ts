
import { FacturaWithRelations, Sucursales, Trackings } from "@/db/tenants/tenants-schema";
import { Hono } from "hono";
import { generateInvoiceBuffer } from "@/lib/invoices/invoice";

const app = new Hono();

const createTestInvoiceData = (): FacturaWithRelations => ({
  facturaId: 12345,
  fecha: new Date().toISOString().split('T')[0],
  total: 387.50,
  casillero: 4512,
  cliente: {
    nombre: 'María Elena',
    apellido: 'Rodríguez Silva',
    sucursal: {
      sucursal: "El Dorado",
      telefono: '+507 6858-1291',
      direccion: 'Ricardo J. Alfaro, Dorado City Center, Piso 1, Local 113A'
    } as Sucursales
  },
  trackings: [
    {
      numeroTracking: '1Z999AA1234567890',
      peso: 2.5,
      precio: 89.75
    },
    {
      numeroTracking: '1Z999BB9876543210',
      peso: 4.8,
      precio: 142.25
    },
    {
      numeroTracking: '1Z999CC5555666777',
      peso: 1.2,
      precio: 45.50
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
        
        {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
        {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
        {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },
    {
      numeroTracking: '1Z999DD8888999000',
      peso: 3.7,
      precio: 110.00
    },


  ] as Trackings[]
});

app.get('/test-invoice', async (c) => {
  try {
    console.log('Generating test invoice...');
    const testData = createTestInvoiceData();
    const startTime = Date.now();

    const pdfBuffer = await generateInvoiceBuffer(
      testData, "Panabox Logistics", "https://f005.backblazeb2.com/file/CargoSoftware/Sakura+Box+PTY/logo-16fb75f0-3810-41e8-ac14-c63286575788.png"
    );

    const endTime = Date.now();
    console.log(`Test PDF generated in ${endTime - startTime}ms`);

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="test-invoice-${testData.facturaId}.pdf"`,
      },
    });


  } catch (error) {
    console.error('Test PDF generation failed:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Test PDF generation failed'
      },
      500
    );
  }
});

export default app;
