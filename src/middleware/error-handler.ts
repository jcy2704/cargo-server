import { MiddlewareHandler } from "hono";
import { AppError } from "@/utils/errors";
import { logger } from "@/lib/logger";

export const errorHandler: MiddlewareHandler = async (c, next) => {
  try {
    await next();
  } catch (err) {
    if (err instanceof AppError) {
      logger.warn("Application error", {
        statusCode: err.statusCode,
        code: err.code,
        message: err.message,
        path: c.req.path,
      });

      return c.json(
        {
          error: err.message,
          code: err.code,
        },
        err.statusCode
      );
    }

    logger.error("Unhandled error", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      path: c.req.path,
    });

    return c.json(
      {
        error: "Internal server error",
      },
      500
    );
  }
};
