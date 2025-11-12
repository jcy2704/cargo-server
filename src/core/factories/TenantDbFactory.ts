import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import Redis from "ioredis";
import QuickLRU from "quick-lru";
import { encrypt, decrypt } from "@/utils/crypto";
import { logger } from "@/lib/logger";
import { TENANT_CONFIG } from "@/config/constants";

type TenantConnection = {
  decryptedUrl: string;
  pool: mysql.Pool;
  client: MySql2Database<any>;
  lastUsed: number;
};

export class TenantDbFactory {
  private tenantCache = new QuickLRU<string, TenantConnection>({
    maxSize: TENANT_CONFIG.CACHE_MAX_SIZE,
  });
  private readonly IDLE_TIMEOUT = TENANT_CONFIG.IDLE_TIMEOUT_MS;
  private readonly CLEANUP_INTERVAL = TENANT_CONFIG.CLEANUP_INTERVAL_MS;
  private cleanupTimer: NodeJS.Timeout;

  constructor(private redis: Redis) {
    this.cleanupTimer = setInterval(
      () => this.cleanupIdleConnections(),
      this.CLEANUP_INTERVAL
    );
  }

  async getClient(encryptedUrl: string): Promise<MySql2Database<any>> {
    if (!encryptedUrl) throw new Error("No encrypted DB URL provided");

    const redisKey = `tenant:conn:${encryptedUrl}`;

    // Fast-path: check LRU cache with reverse map
    for (const [url, conn] of this.tenantCache.entries()) {
      if (encrypt(url) === encryptedUrl) {
        try {
          await conn.pool.query("SELECT 1");
          conn.lastUsed = Date.now();
          return conn.client;
        } catch (err) {
          logger.warn("Stale tenant connection detected, removing from cache", {
            encryptedUrl: encryptedUrl.substring(0, 20) + "...",
          });
          await conn.pool.end().catch((e) =>
            logger.error("Failed to close stale connection", { error: e })
          );
          this.tenantCache.delete(url);
        }
        break;
      }
    }

    // Resolve decrypted URL
    let decryptedUrl = await this.redis.get(redisKey);
    if (!decryptedUrl) {
      decryptedUrl = decrypt(encryptedUrl);
      if (!decryptedUrl) throw new Error("Failed to decrypt DB URL");
      await this.redis.set(
        redisKey,
        decryptedUrl,
        "EX",
        TENANT_CONFIG.REDIS_TTL_SECONDS
      );
    }

    const lockKey = `lock:tenant:${decryptedUrl}`;

    // Optimistic spin lock with exponential backoff
    let acquired = false;
    for (let i = 0; i < 5 && !acquired; i++) {
      const result = await this.redis.call(
        "SET",
        lockKey,
        "1",
        "NX",
        "PX",
        "5000"
      );
      if (result === "OK") acquired = true;
      else await Bun.sleep(100 * 2 ** i); // faster backoff
    }
    if (!acquired) throw new Error("Could not acquire DB connection lock");

    try {
      const pool = mysql.createPool({
        uri: decryptedUrl,
        connectionLimit: TENANT_CONFIG.CONNECTION_POOL_SIZE,
        waitForConnections: true,
        queueLimit: 10,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });

      logger.debug("Creating new tenant database connection", {
        encryptedUrl: encryptedUrl.substring(0, 20) + "...",
      });

      const client = drizzle(pool);
      const connection: TenantConnection = {
        decryptedUrl,
        pool,
        client,
        lastUsed: Date.now(),
      };
      this.tenantCache.set(decryptedUrl, connection);
      return client;
    } catch (err) {
      logger.error("Failed to connect to tenant database", {
        encryptedUrl: encryptedUrl.substring(0, 20) + "...",
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      await this.redis.del(lockKey).catch((e) =>
        logger.error("Failed to release connection lock", {
          lockKey,
          error: e,
        })
      );
    }
  }

  cleanupIdleConnections(): void {
    const now = Date.now();
    for (const [url, conn] of this.tenantCache.entries()) {
      if (now - conn.lastUsed > this.IDLE_TIMEOUT) {
        logger.info("Closing idle tenant connection", {
          idleTime: Math.round((now - conn.lastUsed) / 1000) + "s",
        });
        conn.pool.end().catch((e) =>
          logger.error("Failed to close idle connection", { error: e })
        );
        this.tenantCache.delete(url);
      }
    }
  }

  destroy(): void {
    logger.info("Destroying TenantDbFactory, closing all connections");
    clearInterval(this.cleanupTimer);
    for (const [, conn] of this.tenantCache) {
      conn.pool.end().catch((e) =>
        logger.error("Failed to close connection on destroy", { error: e })
      );
    }
  }
}
