import { Context } from "hono";
import { logger } from "@/lib/logger";

/**
 * Creates a logger with tenant context automatically injected
 * Usage in routes:
 *
 * const log = getTenantLogger(c);
 * log.info("User created", { userId: 123 });
 * // Logs: { tenant: "example.com", userId: 123, message: "User created" }
 */
export function getTenantLogger(c: Context) {
  const tenant = c.get("tenantDomain") || "unknown";

  return {
    info: (message: string, meta?: Record<string, any>) => {
      logger.info(message, { tenant, ...meta });
    },
    warn: (message: string, meta?: Record<string, any>) => {
      logger.warn(message, { tenant, ...meta });
    },
    error: (message: string, meta?: Record<string, any>) => {
      logger.error(message, { tenant, ...meta });
    },
    debug: (message: string, meta?: Record<string, any>) => {
      logger.debug(message, { tenant, ...meta });
    },
  };
}
