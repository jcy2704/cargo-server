export const TENANT_CONFIG = {
  CACHE_MAX_SIZE: Number(process.env.TENANT_CACHE_SIZE) || 50,
  IDLE_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  CLEANUP_INTERVAL_MS: 60 * 1000, // 1 minute
  REDIS_TTL_SECONDS: 30 * 60, // 30 minutes
  CONNECTION_POOL_SIZE: 2,
} as const;

export const EMAIL_CONFIG = {
  CONCURRENCY: 1,
  STAGGER_MS: 500,
  CHUNK_SIZE: 10,
  RETRY_ATTEMPTS: 3,
  RETRY_BACKOFF_MS: 5000,
} as const;

export const CACHE_CONFIG = {
  COMPANY_INFO_TTL: 3600, // 1 hour
  API_KEY_LOOKUP_TTL: 300, // 5 minutes
} as const;
