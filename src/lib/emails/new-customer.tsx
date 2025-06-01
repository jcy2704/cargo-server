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
} from "@react-email/components";
import * as React from "react";
import * as tenantSchema from "@/db/tenants/tenants-schema";

export interface NewCustomerEmailProps {
  nombre: string;
  apellido: string;
  casillero: string;
  sucursal: tenantSchema.Sucursales;
  correo: string;
  logo: string;
  cedula: string;
  telefono: string;
}

export const NewCustomerEmail: React.FC<Readonly<NewCustomerEmailProps>> = ({
  nombre,
  apellido,
  casillero,
  sucursal,
  logo,
  cedula,
  telefono,
  correo,
}) => {
  const preview = "Nuevo Casillero Registrado";

  const direccion = {
    direccion1: "7854 NW 46TH ST UNIT 2",
    estado: "FLORIDA",
    ciudad: "MIAMI",
    zip: "33166-5461",
    pais: "UNITED STATES",
    tel: "+1 305-592-4534",
  };

  const fontFamily =
    "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen-Sans,Ubuntu,Cantarell,Helvetica Neue,sans-serif";

  const styles = {
    fontFamily,
    main: {
      backgroundColor: "#f9fafb",
      padding: "40px 0",
      fontFamily,
    },
    container: {
      maxWidth: "600px",
      margin: "0 auto",
      backgroundColor: "#ffffff",
      padding: "40px",
      borderRadius: "8px",
      boxShadow: "0 0 6px rgba(0,0,0,0.1)",
      fontFamily,
    },
    logo: {
      width: "160px",
      height: "auto",
      margin: "0 auto 24px",
      display: "block",
    },
    heading: {
      fontSize: "24px",
      fontWeight: 700,
      color: "#111827",
      marginBottom: "16px",
      fontFamily,
    },
    subheading: {
      fontSize: "20px",
      fontWeight: 600,
      color: "#1f2937",
      marginTop: "32px",
      marginBottom: "20px",
      fontFamily,
    },
    paragraph: {
      fontSize: "16px",
      lineHeight: "1.6",
      color: "#374151",
      marginBottom: "16px",
      fontFamily,
    },
    hr: {
      borderColor: "#e5e7eb",
      margin: "32px 0",
    },
    list: {
      fontSize: "14px",
      color: "#4b5563",
      marginBottom: "20px",
      lineHeight: "1.9",
      fontFamily,
    },
    footer: {
      fontSize: "12px",
      color: "#9ca3af",
      marginTop: "40px",
      fontFamily,
    },
    instagram: {
      display: "block",
      margin: "0 auto",
    },
  };

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Img src={logo} alt="Logo" style={styles.logo} />
          <Heading style={styles.heading}>Nuevo Casillero Registrado</Heading>
          <Text style={styles.paragraph}>
            Un nuevo cliente se ha registrado en la sucursal {sucursal.sucursal}. Debajo
            tendrás la información del casillero del cliente.
          </Text>

          <Hr style={styles.hr} />

          <Section
            style={{
              backgroundColor: "#f3f4f6",
              padding: "24px",
              borderRadius: "8px",
              marginBottom: "24px",
            }}
          >
            <Heading style={{ ...styles.subheading, marginTop: 0 }}>
              Información del Cliente
            </Heading>
            <Text style={{ ...styles.paragraph, marginBottom: 0 }}>
              Nombre: {nombre} {apellido}
              <br />
              Correo: {correo}
              <br />
              Cédula: {cedula}
              <br />
              Teléfono: {telefono}
              <br />
            </Text>
          </Section>

          <Hr style={styles.hr} />

          <Section
            style={{
              backgroundColor: "#f3f4f6",
              padding: "24px",
              borderRadius: "8px",
              marginBottom: "24px",
            }}
          >
            <Heading style={{ ...styles.subheading, marginTop: 0 }}>
              Información del Casillero (Aéreo)
            </Heading>
            <Text style={{ ...styles.paragraph, marginBottom: 0 }}>
              Nombre: {sucursal.codificacion} {nombre} {apellido}
              <br />
              Dirección: {direccion.direccion1} {sucursal.codificacion}
              <br />
              Línea 2: {sucursal.codificacion}
              {casillero}
              <br />
              Ciudad: {direccion.ciudad}
              <br />
              Estado: {direccion.estado}
              <br />
              Código Postal: {direccion.zip}
              <br />
              País: {direccion.pais}
              <br />
              Tel: {direccion.tel}
            </Text>
          </Section>

          <Section>
            <Text style={{ ...styles.footer, textAlign: "center" }}>
              © {new Date().getFullYear()} Todos los derechos reservados.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// NewCustomerEmail.PreviewProps = {
//   nombre: "Juan",
//   apellido: "Pérez",
//   casillero: "12345",
//   sucursal: "Sucursal Central",
//   codigo_de_compania: "ABC123",
//   correo: "TuEmpresa@gmail.com",
//   logo: "https://via.placeholder.com/160x40?text=Logo",
//   cedula: "9-888-888",
//   telefono: "8889-8888",
// } satisfies NewCustomerEmailProps;

export default NewCustomerEmail;
