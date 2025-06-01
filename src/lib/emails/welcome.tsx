import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Img,
  Heading,
  Text,
  Hr,
  Preview,
  Column,
  Row,
  Link,
} from "@react-email/components";
import * as React from "react";
import * as tenantSchema from "@/db/tenants/tenants-schema";

export interface WelcomeEmailProps {
  nombre: string;
  apellido: string;
  casillero: string;
  sucursal: tenantSchema.Sucursales;
  nombre_de_compania: string;
  logo: string;
}

export const WelcomeEmail: React.FC<Readonly<WelcomeEmailProps>> = ({
  nombre,
  apellido,
  casillero,
  sucursal,
  nombre_de_compania,
  logo,
}: WelcomeEmailProps) => {
  const preview = "Correo de Bienvenida e Información del Casillero";

  const direccion = {
    direccion1: "7854 NW 46TH ST UNIT 2",
    estado: "FLORIDA",
    ciudad: "MIAMI",
    zip: "33166-5461",
    pais: "UNITED STATES",
    tel: "+1 305-592-4534",
  };

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
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
              <Text style={statusText}>
                🎉 ¡Bienvenido a {nombre_de_compania}!
              </Text>
            </Section>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            {/* Greeting */}
            <Heading style={greeting}>Hola {nombre},</Heading>
            <Text style={paragraph}>
              Te has registrado exitosamente en la sucursal{" "}
              <strong>
                {sucursal.sucursal} ({sucursal.codificacion})
              </strong>
              . Nuestra empresa está enfocada en brindar un servicio de alta
              calidad, personalizado y eficiente. Ofrecemos transporte de carga
              aérea y marítima de Miami a Panamá.
            </Text>

            {/* Casillero Information Card */}
            <Section style={packageSection}>
              <Heading style={sectionTitle}>
                📦 Información del Casillero (Aéreo)
              </Heading>

              {/* Casillero Highlight */}
              <Section style={cardsContainer}>
                <Row>
                  <Column style={{ width: "100%" }}>
                    <Section style={casilleroCard}>
                      <Text style={casilleroLabel}>TU CASILLERO</Text>
                      <Text style={casilleroNumber}>
                        {sucursal.codificacion}
                        {casillero}
                      </Text>
                    </Section>
                  </Column>
                </Row>
              </Section>

              {/* Address Information */}
              <Section style={addressCard}>
                <Text style={addressTitle}>📍 Dirección de Envío</Text>
                <Text style={addressText}>
                  <strong>Nombre:</strong> {sucursal.codificacion} {nombre}{" "}
                  {apellido}
                  <br />
                  <strong>Dirección:</strong> {direccion.direccion1}{" "}
                  {sucursal.codificacion}
                  <br />
                  <strong>Línea 2:</strong> {sucursal.codificacion}
                  {casillero}
                  <br />
                  <strong>Ciudad:</strong> {direccion.ciudad}
                  <br />
                  <strong>Estado:</strong> {direccion.estado}
                  <br />
                  <strong>Código Postal:</strong> {direccion.zip}
                  <br />
                  <strong>País:</strong> {direccion.pais}
                  <br />
                  <strong>Tel:</strong> {direccion.tel}
                </Text>
              </Section>
            </Section>

            {/* Important Instructions */}
            <Section style={infoCard}>
              <Text style={infoText}>
                <strong>Importante:</strong> Usa esta información cada vez que
                realices una compra por internet. Por favor asegúrate de incluir
                tu casillero{" "}
                <strong>
                  ({sucursal.codificacion}
                  {casillero})
                </strong>{" "}
                en todas tus compras en línea. Sin este número, no podremos
                rastrear tu paquete cuando llegue a Panamá.
              </Text>
            </Section>

            {/* Warning */}
            <Section style={warningCard}>
              <Text style={warningText}>
                ⚠️ <strong>Atención:</strong> Esta dirección es solo para
                compras aéreas. Para dirección marítima, contáctanos
                directamente.
              </Text>
            </Section>

            <Hr style={hr} />

            {/* Terms and Conditions */}
            <Section style={termsSection}>
              <Heading style={sectionTitle}>📋 Términos y Condiciones</Heading>
              <Section style={termsCard}>
                <Text style={termsText}>
                  • En caso de solicitar asegurar su mercancía de alto valor, se
                  cobrará el 20% del valor de su factura comercial (previo
                  aviso).
                  <br />
                  <br />
                  • En caso de pérdida, nos haremos responsables al 100% si hay
                  constancia firmada por nuestro personal. De lo contrario,
                  cubrimos solo el 25%.
                  <br />
                  <br />
                  • No nos responsabilizamos por paquetes entregados por USPS.
                  <br />
                  <br />
                  • No nos responsabilizamos por mercancía mal empacada.
                  <br />
                  <br />• No nos responsabilizamos por paquetes no retirados
                  tras 1 mes.
                </Text>
              </Section>
            </Section>

            {/* Thank You */}
            <Section style={thankYou}>
              <Text style={thankYouText}>
                ¡Gracias por elegir {nombre_de_compania}!
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
              © {new Date().getFullYear()} Todos los derechos reservados.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// WelcomeEmail.PreviewProps = {
//   nombre: "Juan",
//   apellido: "Pérez",
//   casillero: "12345",
//   sucursal: {
//     sucursal: "Sucursal Central",
//     codificacion: "ABC123",
//     correo: "contacto@tuempresa.com",
//     telefono: "+123456789",
//     direccion: "7854 NW 46TH ST UNIT 2",
//     maps: "https://google.com",
//   } as tenantSchema.Sucursales,
//   nombre_de_compania: "TuEmpresa",
//   logo: "https://via.placeholder.com/160x40?text=Logo",
// } satisfies WelcomeEmailProps;

export default WelcomeEmail;

// Styles matching factura.tsx
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
  padding: "16px",
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
  margin: "0 0 8px 0",
  display: "inline-block",
};

const casilleroNumber = {
  color: "#1e40af",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0",
};

const addressCard = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "20px",
  border: "1px solid #e5e7eb",
};

const addressTitle = {
  color: "#1f2937",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 12px 0",
};

const addressText = {
  color: "#4b5563",
  fontSize: "14px",
  lineHeight: "1.6",
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
  margin: "0 0 24px 0",
};

const infoText = {
  color: "#166534",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0",
};

const warningCard = {
  backgroundColor: "#fef3c7",
  border: "1px solid #fbbf24",
  borderRadius: "8px",
  padding: "16px",
  margin: "0 0 32px 0",
};

const warningText = {
  color: "#92400e",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0",
};

const termsSection = {
  margin: "0 0 32px 0",
};

const termsCard = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "20px",
  margin: "0",
};

const termsText = {
  color: "#475569",
  fontSize: "14px",
  lineHeight: "1.6",
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
