import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Image,
  Font
} from '@react-pdf/renderer';
import type {
  Sucursales,
  FacturaWithRelations,
} from "@/db/tenants/tenants-schema";
import chunk from 'lodash.chunk';
import { readableStreamToArrayBuffer } from 'bun';


Font.register({
  family: "Inter", fonts: [
    {
      src: 'https://fonts.gstatic.com/s/inter/v19/UcCO3FwrK3iLTeHuS_nVMrMxCp50ujIw2boKoduKmMEVuLyfMZg.ttf', // Regular 400
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v19/UcCO3FwrK3iLTeHuS_nVMrMxCp50qjIw2boKoduKmMEVuI6fMZg.ttf', // Medium 500
      fontWeight: 500,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v19/UcCO3FwrK3iLTeHuS_nVMrMxCp50yjIw2boKoduKmMEVuI6fMZg.ttf', // Semi Bold 600
      fontWeight: 600,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v19/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf', // Bold 700
      fontWeight: 700,
    },
  ]
})

// Color palette
const colors = {
  primary: '#2563eb',      // Blue
  secondary: '#64748b',    // Slate gray
  accent: '#f59e0b',       // Amber
  success: '#10b981',      // Emerald
  danger: '#ef4444',       // Red
  dark: '#1e293b',         // Dark slate
  light: '#f8fafc',        // Very light gray
  white: '#ffffff',
  border: '#e2e8f0',       // Light border
  textPrimary: '#0f172a',  // Almost black
  textSecondary: '#475569', // Medium gray
  textMuted: '#94a3b8',    // Light gray
};

// Modern styles with better spacing and typography
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: colors.white,
    padding: 0,
    fontFamily: 'Inter',
    fontSize: 10,
    lineHeight: 1.4,
  },

  // Header section with gradient-like effect
  header: {
    padding: "25px 32px",
    paddingBottom: 0,
    marginBottom: 0,
  },

  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  logo: {
    width: "auto",
    maxWidth: 190,
    height: 60,
    objectFit: 'contain',
  },

  companyInfo: {
    alignItems: 'flex-end',
    justifyContent: "center",
    color: colors.white,
  },

  companyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black'
  },

  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: "black",
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  invoiceSubitle: {
    fontSize: 14,
    color: "red",
    fontWeight: 600,
    letterSpacing: 0.7,
    opacity: 0.9,
  },

  // Main content container
  content: {
    padding: 32,
  },

  // Invoice details section
  invoiceDetails: {
    flexDirection: 'row',
    alignItems: "center",
    justifyContent: 'space-between',
    marginBottom: 32,
    backgroundColor: colors.light,
    padding: 24,
    borderRadius: 8,
  },

  detailsLeft: {
    flex: 1,
  },

  detailsRight: {
    alignItems: 'flex-end',
    flex: 1,
  },

  invoiceNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },

  invoiceDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
  },

  statusBadge: {
    backgroundColor: colors.success,
    color: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Client information section
  clientSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 32,
  },

  clientCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 8,
    border: `1 solid ${colors.border}`,
  },

  cardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  clientName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },

  clientDetail: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },

  totalCard: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },

  totalLabel: {
    fontSize: 12,
    color: colors.light,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },

  titleTable: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  // Modern table styles
  tableContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    border: `1 solid ${colors.border}`,
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.dark,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  tableHeaderCell: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderBottom: `1 solid ${colors.border}`,
    alignItems: "center",
  },

  tableRowAlternate: {
    backgroundColor: colors.light,
  },

  tableCell: {
    fontSize: 11,
    color: colors.textPrimary,
    paddingRight: 8,
  },

  tableCellBold: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: 'bold',
    paddingRight: 8,
  },

  tableCellRight: {
    fontSize: 11,
    color: colors.textPrimary,
    textAlign: 'right',
    paddingRight: 8,
  },

  // Column widths
  colTracking: { flex: 2 },
  colWeight: { flex: 1 },
  colPrice: { flex: 1, color: colors.primary },

  // Summary section
  summarySection: {
    alignItems: 'flex-end',
  },

  summaryContainer: {
    width: 280,
    backgroundColor: colors.light,
    borderRadius: 8,
    padding: 20,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },

  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTop: `2 solid ${colors.primary}`,
    marginTop: 8,
  },

  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  summaryValue: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: 'bold',
  },

  summaryTotalLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: 'bold',
  },

  summaryTotalValue: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
  },

  // Terms section
  termsSection: {
    backgroundColor: colors.light,
    padding: 24,
    borderRadius: 8,
    borderLeft: `4 solid ${colors.accent}`,
  },

  termsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  termItem: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 8,
    paddingLeft: 12,
    lineHeight: 1.5,
  },

  // Footer
  footer: {
    backgroundColor: colors.dark,
    padding: 24,
    marginTop: 'auto',
  },

  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  footerText: {
    fontSize: 10,
    color: colors.light,
    lineHeight: 1.5,
  },

  footerBrand: {
    fontSize: 12,
    color: colors.white,
    fontWeight: 'bold',
  },

  // Utility styles
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },

  spacer: {
    height: 16,
  },

  badge: {
    backgroundColor: colors.accent,
    color: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});

// Interfaces
interface ProcessedInvoiceData {
  facturaId: string;
  fecha: string;
  clientName: string;
  casillero: string;
  total: string;
  subtotal: string;
  trackings: Array<{
    numeroTracking: string;
    peso: string;
    precio: string;
  }>;
  sucursal: Sucursales;
}

// Utility functions
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// Modern Invoice Document Component
const ModernInvoiceDocument = ({
  data,
  company,
  logo
}: {
  data: ProcessedInvoiceData;
  company: string;
  logo?: string;
}) => {

  const trackingsData = chunk(data.trackings, 20);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header} fixed>
          <View style={styles.headerContent}>
            {logo ? <Image style={styles.logo} src={logo} />
              : <Text style={styles.companyTitle}>{company}</Text>}
            <View style={styles.companyInfo}>
              <Text style={styles.invoiceTitle}>FACTURA</Text>
              <Text style={styles.invoiceSubitle}>Nº {data.facturaId}</Text>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Invoice Details */}
          <View style={styles.invoiceDetails}>
            <View style={styles.detailsLeft}>
              <Text style={styles.invoiceNumber}>Nº {data.facturaId}</Text>
              <Text style={styles.invoiceDate}>
                Total de paquetes: {data.trackings.length}
              </Text>
              {/* <View style={styles.statusBadge}> */}
              {/*   <Text>Pagado</Text> */}
              {/* </View> */}
            </View>
            <View style={styles.detailsRight}>
              <Text style={[styles.clientDetail, { textAlign: 'right' }]}>
                Fecha de emisión
              </Text>
              <Text style={[styles.invoiceDate, { textAlign: 'right', fontWeight: 'bold' }]}>
                {data.fecha}
              </Text>
            </View>
          </View>

          {/* Client Information */}
          <View style={styles.clientSection}>
            <View style={styles.clientCard}>
              <Text style={styles.cardTitle}>Facturado a</Text>
              <Text style={styles.clientName}>{data.clientName}</Text>
              <Text style={styles.clientDetail}>Casillero: {data.casillero}</Text>
              <Text style={styles.clientDetail}>Sucursal: {data.sucursal.sucursal}</Text>
            </View>

            <View style={[styles.clientCard, styles.totalCard]}>
              <Text style={styles.totalLabel}>Total a pagar</Text>
              <Text style={styles.totalAmount}>{data.total}</Text>
            </View>
          </View>

          {/* Terms and Conditions */}
          <View style={styles.termsSection}>
            <Text style={styles.termsTitle}>Términos y Condiciones</Text>
            <Text style={styles.termItem}>
              • {company} aplica cargos por peso o volumen para cargas extra dimensionadas.
            </Text>
            <Text style={styles.termItem}>
              • {company} no se hará responsable por daño en mercancía mal empacada por exportación.
            </Text>
            <Text style={styles.termItem}>
              • {company} no se hace responsable por mercancía extraviada entregada por USPS.
            </Text>
            <Text style={styles.termItem}>
              • {company} no se hace responsable por paquetes después de 1 mes de no ser retirados en la oficina.
            </Text>
          </View>
        </View>



        {trackingsData.map((chunk, indexChunk) => (
          <View key={indexChunk} style={[styles.content, { padding: "10px 32px" }]} break>
            {/* Items Table */}
            <Text style={styles.titleTable}>Detalles de los paquetes</Text>

            <View style={styles.tableContainer}>

              <View style={styles.tableHeader} fixed>
                <Text style={[styles.tableHeaderCell, styles.colTracking]}>
                  Número de Tracking
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colWeight, { textAlign: "right" }]}>
                  Peso (lbs)
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colPrice, { textAlign: "right", color: 'white' }]}>
                  Precio
                </Text>
              </View>

              {chunk.map((tracking, index) => (
                <View
                  key={index}
                  style={[
                    styles.tableRow,
                    index % 2 === 1 ? styles.tableRowAlternate : {}
                  ]}
                >
                  <Text style={[styles.tableCell, styles.colTracking, { fontWeight: 'bold' }]}>
                    {tracking.numeroTracking}
                  </Text>
                  <Text style={[styles.tableCellRight, styles.colWeight]}>
                    {tracking.peso}
                  </Text>
                  <Text style={[styles.tableCellRight, styles.colPrice, { fontWeight: 'bold' }]}>
                    {tracking.precio}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}


        {/* Summary Section */}
        <View style={{ padding: 32 }} wrap={false}>

          <View style={styles.summarySection}>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{data.subtotal}</Text>
              </View>
              {/* <View style={styles.summaryRow}> */}
              {/*   <Text style={styles.summaryLabel}>Impuestos</Text> */}
              {/*   <Text style={styles.summaryValue}>$0.00</Text> */}
              {/* </View> */}
              {/* <View style={styles.summaryRow}> */}
              {/*   <Text style={styles.summaryLabel}>Descuentos</Text> */}
              {/*   <Text style={styles.summaryValue}>-$0.00</Text> */}
              {/* </View> */}
              <View style={styles.summaryRowTotal}>
                <Text style={styles.summaryTotalLabel}>Total</Text>
                <Text style={styles.summaryTotalValue}>{data.total}</Text>
              </View>
            </View>
          </View>

        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerContent}>
            <View>
              <Text style={styles.footerBrand}>{company}</Text>
              <Text style={styles.footerText}>
                Gracias por confiar en nuestros servicios
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.footerText}>
                Teléfono: {data.sucursal.telefono}
              </Text>
              <Text style={styles.footerText}>
                {data.sucursal.direccion}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// Updated preprocessing function
function preprocessInvoiceData(invoice: FacturaWithRelations): ProcessedInvoiceData {
  const total = invoice.total || 0;
  const subtotal = total; // Assuming no taxes for now

  return {
    facturaId: String(invoice.facturaId),
    fecha: invoice.fecha!,
    clientName: `${invoice.cliente!.nombre} ${invoice.cliente!.apellido}`,
    casillero: String(invoice.casillero),
    total: formatCurrency(total),
    subtotal: formatCurrency(subtotal),
    trackings: invoice.trackings.map(t => ({
      numeroTracking: t.numeroTracking as string,
      peso: String(t.peso),
      precio: formatCurrency(t.precio!),
    })),
    sucursal: invoice.cliente!.sucursal,
  };
}
// Export function to generate PDF buffer
export async function generateInvoiceBuffer(
  data: FacturaWithRelations,
  company: string,
  logo?: string
): Promise<Buffer> {
  const processed = preprocessInvoiceData(data);

  const pdfDocument = <ModernInvoiceDocument data={processed} company={company} logo={logo} />;
  const pdfBuffer = await pdf(pdfDocument).toBlob();

  return Buffer.from(await pdfBuffer.arrayBuffer());
}
