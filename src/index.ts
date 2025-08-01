import { Hono } from "hono";
import tenants from "./routes/tenants";
import { api } from "./routes/api";
// import pdf from './routes/pdf'
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

app.use(logger());
app.use("/*", cors({
  origin: process.env.PUBLIC_ALLOWED_ORIGINS?.split(",") || [],
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "Content-Disposition"],
  credentials: true,
}));


app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("/tenants", tenants);
app.route("/api", api);
// app.route("/pdf", pdf);

export default app;
