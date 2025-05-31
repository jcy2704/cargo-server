import { Hono } from "hono";
import * as tenantSchema from "@/db/tenants/tenants-schema";
import { eq } from "drizzle-orm";
import { type MySql2Database } from "drizzle-orm/mysql2";
import { WelcomeEmail, type WelcomeEmailProps } from "@/lib/emails/welcome";
import {
  NewCustomerEmail,
  type NewCustomerEmailProps,
} from "@/lib/emails/new-customer";
import resend from "@/lib/resend";
import { getFriendlyUrl } from "@/lib/s3";

type Variables = {
  tenantDb: MySql2Database<typeof tenantSchema>;
};

const emails = new Hono<{ Variables: Variables }>();

emails.post("/bienvenida", async (c) => {
  const body = (await c.req.json()) as tenantSchema.NewUsuarios & {
    reenviar?: boolean;
  };
  let {
    nombre,
    apellido,
    casillero,
    sucursalId,
    correo,
    cedula,
    telefono,
    reenviar = false,
  } = body;

  const tenantDb = c.get("tenantDb");

  try {
    const [company, sucursal] = await Promise.all([
      tenantDb
        .select()
        .from(tenantSchema.companies)
        .limit(1)
        .then((res) => res[0]),
      tenantDb
        .select()
        .from(tenantSchema.sucursales)
        .where(eq(tenantSchema.sucursales.sucursalId, sucursalId))
        .limit(1)
        .then((res) => res[0]),
    ]);

    if (!company || !sucursal) {
      return c.json({ error: "Company or Sucursal not found" }, 404);
    }

    const logo = getFriendlyUrl(company.logo as string);

    const compProps = {
      nombre,
      apellido,
      casillero: String(casillero),
      sucursal: sucursal.sucursal,
      codigo_de_compania: sucursal.codificacion as string,
      nombre_de_compania: company.company,
      logo,
    } satisfies WelcomeEmailProps;

    await resend.emails.send({
      from: `${company.company} <no-reply-info@resend.dev>`, // TODO: change to company email before prod
      to: correo,
      subject: `Hola ${nombre}, tu casillero personal está lista!`,
      react: await WelcomeEmail({ ...compProps }),
    });

    if (!reenviar) {
      const adminProps = {
        ...compProps,
        correo,
        cedula,
        telefono,
      } satisfies NewCustomerEmailProps;

      await resend.emails.send({
        from: `${company.company} <no-reply-info@resend.dev>`, // TODO: change to company email before prod
        to: correo, // TODO: change to sucursal email before prod
        subject: `¡Nuevo Casillero Registrado!`,
        react: await NewCustomerEmail({ ...adminProps }),
      });
    }

    return c.json({ message: "Email sent successfully" }, 200);
  } catch (e) {
    console.log(e);
    return c.json({ error: "Failed to send email" }, 500);
  }
});

export default emails;
