import { Hono } from "hono";
import tenants from "./routes/tenants";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("/tenants", tenants);

export default app;
