export const config = {
  database: {
    url: process.env.DATABASE_URL || "",
  },
  redis: {
    url: process.env.REDIS_URL || "",
    password: process.env.REDIS_PASSWORD,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || "",
  },
  blackblaze: {
    keyId: process.env.BLACKBLAZE_KEY_ID || "",
    apiKey: process.env.BLACKBLAZE_API_KEY || "",
    bucketName: process.env.B2_BUCKET_NAME || "",
  },
  crypto: {
    key: process.env.CRYPTO_KEY || "",
  },
  cors: {
    allowedOrigins: process.env.PUBLIC_ALLOWED_ORIGINS?.split(",") || [],
  },
  env: process.env.NODE_ENV || "development",
} as const;

export function validateConfig(): void {
  const required = [
    "DATABASE_URL",
    "CRYPTO_KEY",
    "REDIS_URL",
    "RESEND_API_KEY",
    "BLACKBLAZE_KEY_ID",
    "BLACKBLAZE_API_KEY",
    "B2_BUCKET_NAME"
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  // Validate CRYPTO_KEY format
  const cryptoKey = process.env.CRYPTO_KEY;
  if (cryptoKey && cryptoKey.length !== 64) {
    throw new Error("CRYPTO_KEY must be 64 hex characters (32 bytes)");
  }
}

export * from "./constants";
