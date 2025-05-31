import { Hono } from "hono";
import tenants from "./routes/tenants";
import { api } from "./routes/api";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("/tenants", tenants);
app.route("/api", api);

export default app;
