import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { cors } from "hono/cors";
import tenants from "./routes/tenants";
import { api } from "./routes/api";
import health from "./routes/health";
import { errorHandler } from "./middleware/error-handler";
import { validateConfig, config } from "./config";
import { logger } from "./lib/logger";

// Validate environment variables on startup
validateConfig();
logger.info("Environment configuration validated successfully");

const app = new Hono();

// Global middleware
app.use("*", errorHandler);
app.use(honoLogger());

// CORS configuration
if (config.cors.allowedOrigins.length > 0) {
  app.use(
    "/*",
    cors({
      origin: config.cors.allowedOrigins,
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "Content-Disposition"],
      credentials: true,
    })
  );
  logger.info("CORS enabled", { origins: config.cors.allowedOrigins });
}

app.get("/", (c) => {
  return c.json({
    message: "Cargo API Server",
    version: "1.0.0",
    status: "running",
  });
});

// Routes
app.route("/health", health);
app.route("/tenants", tenants);
app.route("/api", api);

logger.info("Cargo server initialized successfully", {
  env: config.env,
  port: process.env.PORT || 3000,
});

export default app;
