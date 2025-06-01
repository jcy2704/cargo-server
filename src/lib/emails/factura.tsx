import {
  Body,
  Button,
  Container,
  Column,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
  Hr,
  Link,
} from "@react-email/components";
import * as tenantSchema from "@/db/tenants/tenants-schema";
import * as React from "react";

export interface InvoiceEmailProps {
  nombre: string;
  trackings: tenantSchema.Trackings[];
  casillero: number;
  logo: string;
  company: string;
  sucursal: tenantSchema.Sucursales;
  total: number;
}

export const InvoiceEmail: React.FC<Readonly<InvoiceEmailProps>> = ({
  nombre = "kev",
  trackings = [
    {
      trackingId: 1,
      numeroTracking: "123",
      precio: 12,
      peso: 12,
    },
  ] as tenantSchema.Trackings[],
  casillero = 123,
  logo = "https://via.placeholder.com/200",
  company = "Heavy Cargo Service",
  sucursal = {
    direccion: "123 Main St",
    maps: "https://google.com",
    telefono: "123-456-7890",
    sucursal: "Dos Mares",
    correo: "kev@kev.com",
  } as tenantSchema.Sucursales,
  total = 12,
}: InvoiceEmailProps) => {
  const previewText = `¡Tu orden está lista para retirar! Casillero ${casillero}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Row>
              <Column align="center">
                <Img src={logo} alt="Logo" style={logoStyle} />
              </Column>
            </Row>
            <Section style={statusBadge}>
              <Text style={statusText}>✅ ¡Ya puedes retirar tu orden!</Text>
            </Section>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            {/* Greeting */}
            <Heading style={greeting}>Hola {nombre},</Heading>
            <Text style={paragraph}>
              Esperamos que te encuentres bien. Tu orden llegó a Panamá y está
              lista para retirar en nuestra sucursal{" "}
              <strong>{sucursal.sucursal}</strong>. Al llegar a la sucursal,
              presenta el número de casillero que se indica a continuación.
            </Text>

            {/* Location Card */}
            <Section style={locationCard}>
              <Row>
                <Column>
                  <Text style={locationTitle}>📍 Ubicación de retiro</Text>
                  <Text style={locationAddress}>
                    <Link href={sucursal.maps!}>{sucursal.direccion}</Link>
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Package Information */}
            <Section style={packageSection}>
              <Heading style={sectionTitle}>
                📦 Información de tus Paquetes
              </Heading>

              {/* Casillero Highlight */}
              <Section style={cardsContainer}>
                <Row>
                  <Column style={{ width: "50%", paddingRight: "8px" }}>
                    <Section style={casilleroCard}>
                      <Text style={casilleroLabel}>CASILLERO</Text>
                      <Text style={casilleroNumber}>{casillero}</Text>
                    </Section>
                  </Column>
                  <Column style={{ width: "50%", paddingLeft: "8px" }}>
                    <Section style={totalCard}>
                      <Text style={totalLabel}>TOTAL</Text>
                      <Text style={totalNumber}>${total}</Text>
                    </Section>
                  </Column>
                </Row>
              </Section>

              {/* Package Details Table */}
              <Section style={table}>
                {/* Table Header */}
                <Row style={tableHeader}>
                  <Column style={{ ...tableHeaderCell, width: "50%" }}>
                    <Text style={tableHeaderText}>Número de Tracking</Text>
                  </Column>
                  <Column
                    style={{
                      ...tableHeaderCell,
                      width: "25%",
                      textAlign: "center",
                    }}
                  >
                    <Text style={{ ...tableHeaderText, textAlign: "center" }}>
                      Peso (lbs)
                    </Text>
                  </Column>
                  <Column
                    style={{
                      ...tableHeaderCell,
                      width: "25%",
                      textAlign: "right",
                    }}
                  >
                    <Text style={{ ...tableHeaderText, textAlign: "right" }}>
                      Precio
                    </Text>
                  </Column>
                </Row>

                {/* Table Row */}
                {trackings.map((tracking) => (
                  <Row key={tracking.trackingId} style={tableRow}>
                    <Column style={{ ...tableCell, width: "50%" }}>
                      <Text style={tableCellText}>
                        {tracking.numeroTracking}
                      </Text>
                    </Column>
                    <Column
                      style={{
                        ...tableCell,
                        width: "25%",
                        textAlign: "center",
                      }}
                    >
                      <Text style={{ ...tableCellText, textAlign: "center" }}>
                        {tracking.peso}
                      </Text>
                    </Column>
                    <Column
                      style={{ ...tableCell, width: "25%", textAlign: "right" }}
                    >
                      <Text style={{ ...priceText, textAlign: "right" }}>
                        ${tracking.precio}
                      </Text>
                    </Column>
                  </Row>
                ))}
              </Section>
            </Section>

            {/* Additional Info */}
            <Section style={infoCard}>
              <Text style={infoText}>
                Puedes encontrar también adjuntado la factura con más detalles
                de tu envío.
              </Text>
            </Section>

            {/* Thank You */}
            <Section style={thankYou}>
              <Text style={thankYouText}>
                ¡Gracias por preferir Heavy Cargo Service!
              </Text>
            </Section>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>¿Necesitas ayuda? Contáctanos</Text>
            <Row>
              <Column align="right" style={{ width: "45%" }}>
                <Link href={`mailto:${sucursal.correo}`} style={footerLink}>
                  {sucursal.correo}
                </Link>
              </Column>
              <Column style={{ width: "10%" }}>
                <Text style={footerSeparator}>|</Text>
              </Column>
              <Column align="left" style={{ width: "45%" }}>
                <Link href={`tel:${sucursal.telefono}`} style={footerLink}>
                  {sucursal.telefono}
                </Link>
              </Column>
            </Row>
            <Text style={copyright}>
              © 2025 Todos los derechos reservados.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default InvoiceEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "0px 0 32px",
  marginBottom: "64px",
  maxWidth: "600px",
  borderRadius: "12px",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
};

const header = {
  backgroundColor: "#1e40af",
  padding: "32px 24px",
  textAlign: "center" as const,
  borderTopLeftRadius: "12px",
  borderTopRightRadius: "12px",
};

const logoStyle = {
  width: "200px",
  height: "auto",
  margin: "0 auto 24px",
  display: "block",
  backgroundColor: "rgba(255, 255, 255, 0.8)",
  borderRadius: "10px",
};

const statusBadge = {
  backgroundColor: "rgba(255, 255, 255, 0.15)",
  borderRadius: "8px",
  padding: "12px 20px",
  display: "inline-block",
  margin: "0 auto",
};

const statusText = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0",
};

const content = {
  padding: "32px 24px",
  paddingBottom: 0,
};

const greeting = {
  color: "#1f2937",
  fontSize: "20px",
  fontWeight: "600",
  margin: "0 0 16px 0",
};

const paragraph = {
  color: "#6b7280",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 32px 0",
};

const locationCard = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "20px",
  margin: "0 0 32px 0",
  border: "1px solid #e5e7eb",
};

const locationTitle = {
  color: "#1f2937",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 8px 0",
};

const locationAddress = {
  color: "#4b5563",
  fontSize: "15px",
  fontWeight: "500",
  margin: "0",
};

const packageSection = {
  margin: "0 0 32px 0",
};

const sectionTitle = {
  color: "#1f2937",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 20px 0",
};

const casilleroCard = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  padding: "12px 16px",
  margin: "0",
  textAlign: "center" as const,
  width: "100%",
  boxSizing: "border-box" as const,
};

const casilleroLabel = {
  backgroundColor: "#3b82f6",
  color: "#ffffff",
  borderRadius: "4px",
  padding: "3px 12px",
  fontSize: "10px",
  fontWeight: "600",
  margin: "0 0 4px 0",
  display: "inline-block",
};

const casilleroNumber = {
  color: "#1e40af",
  fontSize: "18px",
  fontWeight: "700",
  margin: "0",
};

const table = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  overflow: "hidden",
  width: "100%",
};

const tableHeader = {
  backgroundColor: "#f9fafb",
};

const tableHeaderCell = {
  padding: "12px 16px",
  borderBottom: "1px solid #e5e7eb",
  textAlign: "left" as const,
};

const tableHeaderText = {
  color: "#6b7280",
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0",
};

const tableRow = {
  backgroundColor: "#ffffff",
};

const tableCell = {
  padding: "16px",
  textAlign: "left" as const,
  borderBottom: "1px solid #f3f4f6",
};

const tableCellText = {
  color: "#1f2937",
  fontSize: "14px",
  fontWeight: "500",
  margin: "0",
};

const priceText = {
  color: "#059669",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0",
};

const totalCard = {
  backgroundColor: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "8px",
  padding: "12px 16px",
  margin: "0",
  textAlign: "center" as const,
  width: "100%",
  boxSizing: "border-box" as const,
};

const totalLabel = {
  backgroundColor: "#059669",
  color: "#ffffff",
  borderRadius: "4px",
  padding: "3px 12px",
  fontSize: "10px",
  fontWeight: "600",
  margin: "0 0 4px 0",
  display: "inline-block",
};

const totalNumber = {
  color: "#166534",
  fontSize: "18px",
  fontWeight: "700",
  margin: "0",
};

const cardsContainer = {
  margin: "0 0 20px 0",
};

const infoCard = {
  backgroundColor: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "8px",
  padding: "16px",
  margin: "0 0 32px 0",
};

const infoText = {
  color: "#166534",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0",
};

const thankYou = {
  textAlign: "center" as const,
};

const thankYouText = {
  color: "#1f2937",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footer = {
  textAlign: "center" as const,
  padding: "0 24px",
};

const footerText = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0 0 12px 0",
};

const footerLink = {
  color: "#3b82f6",
  fontSize: "14px",
  fontWeight: "500",
  textDecoration: "none",
};

const footerSeparator = {
  color: "#d1d5db",
  margin: "0 8px",
  fontSize: "14px",
};

const copyright = {
  color: "#9ca3af",
  fontSize: "12px",
  margin: "16px 0 0 0",
  paddingTop: "16px",
};
