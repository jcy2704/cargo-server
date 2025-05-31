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

interface WelcomeEmailProps {
  nombre: string;
  apellido: string;
  casillero: string;
  sucursal: string;
  codigo_de_compania: string;
  nombre_de_compania: string;
  logo: string;
  instagramUrl?: string;
}

export const WelcomeEmail = ({
  nombre,
  apellido,
  casillero,
  sucursal,
  codigo_de_compania,
  nombre_de_compania,
  logo,
  instagramUrl,
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
          <Heading style={styles.heading}>
            Bienvenido a {nombre_de_compania} ({codigo_de_compania})!
          </Heading>
          <Text style={styles.paragraph}>Hola {nombre},</Text>
          <Text style={styles.paragraph}>
            Te haz registrado exitosamente en la sucursal {sucursal} (
            {codigo_de_compania}). Nuestra empresa está enfocada en brindar un
            servicio de alta calidad, personalizado y eficiente. Ofrecemos
            transporte de carga aérea y marítima de Miami a Panamá. Aquí tienes
            la información de tu casillero:
          </Text>

          <Hr style={styles.hr} />

          <Heading style={styles.subheading}>
            Información del Casillero (Aéreo)
          </Heading>
          <Text style={styles.paragraph}>
            Nombre: {codigo_de_compania} {nombre} {apellido}
            <br />
            Dirección: {direccion.direccion1} {codigo_de_compania}
            <br />
            Línea 2: {codigo_de_compania}
            {casillero}
            <br />
            Ciudad: {direccion.ciudad}, Estado: {direccion.estado}
            <br />
            Código Postal: {direccion.zip}
            <br />
            País: {direccion.pais}
            <br />
            Tel: {direccion.tel}
          </Text>

          <Text style={styles.paragraph}>
            Usa esta información cada vez que realices una compra por internet.
            Por favor asegúrate de incluir tu casillero{" "}
            <strong>
              ({codigo_de_compania}
              {casillero})
            </strong>{" "}
            en todas tus compras en línea. Sin este número, no podremos rastrear
            tu paquete cuando llegue a Panamá.
          </Text>

          <Text style={styles.paragraph}>
            <strong>
              Atención: Esta dirección es solo para compras aéreas. Para
              dirección marítima, contáctanos directamente.
            </strong>
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.subheading}>Términos y Condiciones</Text>
          <ul style={styles.list}>
            <li>
              En caso de solicitar asegurar su mercancía de alto valor, se
              cobrará el 20% del valor de su factura comercial (previo aviso).
            </li>
            <li>
              En caso de pérdida, nos haremos responsables al 100% si hay
              constancia firmada por nuestro personal. De lo contrario, cubrimos
              solo el 25%.
            </li>
            <li>No nos responsabilizamos por paquetes entregados por USPS.</li>
            <li>No nos responsabilizamos por mercancía mal empacada.</li>
            <li>
              No nos responsabilizamos por paquetes no retirados tras 1 mes.
            </li>
          </ul>

          {instagramUrl ? (
            <Section style={{ marginTop: "40px" }}>
              <Row align="center">
                <Column>
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg
                      role="img"
                      viewBox="0 0 24 24"
                      width={26}
                      height={26}
                      xmlns="http://www.w3.org/2000/svg"
                      style={styles.instagram}
                    >
                      <title>Instagram</title>
                      <path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077" />
                    </svg>
                  </a>
                </Column>
                <Column>
                  <div
                    style={{ borderLeft: "1px solid #d1d5db", height: "24px" }}
                  ></div>
                </Column>
                <Column>
                  <Text
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      margin: 0,
                      marginLeft: "10px",
                    }}
                  >
                    © {new Date().getFullYear()} Todos los derechos reservados.
                  </Text>
                </Column>
              </Row>
            </Section>
          ) : (
            <Section>
              <Text style={{ ...styles.footer, textAlign: "center" }}>
                © {new Date().getFullYear()} Todos los derechos reservados.
              </Text>
            </Section>
          )}
        </Container>
      </Body>
    </Html>
  );
};

WelcomeEmail.PreviewProps = {
  nombre: "Juan",
  apellido: "Pérez",
  casillero: "12345",
  sucursal: "Sucursal Central",
  codigo_de_compania: "ABC123",
  nombre_de_compania: "TuEmpresa",
  logo: "https://via.placeholder.com/160x40?text=Logo",
  instagramUrl: "https://instagram.com/tuempresa",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
