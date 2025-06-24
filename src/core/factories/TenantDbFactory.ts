import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import Redis from "ioredis";
import QuickLRU from "quick-lru";
import { encrypt, decrypt } from "@/utils/crypto";

type TenantConnection = {
  decryptedUrl: string;
  pool: mysql.Pool;
  client: MySql2Database<any>;
  lastUsed: number;
};

export class TenantDbFactory {
  private tenantCache = new QuickLRU<string, TenantConnection>({ maxSize: 10 });
  private IDLE_TIMEOUT = 1000 * 60 * 30;
  private CLEANUP_INTERVAL = 60_000;
  private cleanupTimer: NodeJS.Timeout;

  constructor(private redis: Redis) {
    this.cleanupTimer = setInterval(() => this.cleanupIdleConnections(), this.CLEANUP_INTERVAL);
  }

  async getClient(encryptedUrl: string): Promise<MySql2Database<any>> {
    if (!encryptedUrl) throw new Error("No encrypted DB URL provided");

    const redisKey = `tenant:conn:${encryptedUrl}`;

    // Try to get from LRU cache
    const cached = Array.from(this.tenantCache.values()).find(
      (entry) => encrypt(entry.decryptedUrl) === encryptedUrl
    );
    if (cached) {
      cached.lastUsed = Date.now();
      return cached.client;
    }

    // Try Redis
    let decryptedUrl = await this.redis.get(redisKey);
    if (!decryptedUrl) {
      decryptedUrl = decrypt(encryptedUrl);
      if (!decryptedUrl) throw new Error("Failed to decrypt DB URL");
      await this.redis.set(redisKey, decryptedUrl, "EX", 1800);
    }

    // Lock
    const lockKey = `lock:tenant:${decryptedUrl}`;
    let acquired = false;

    for (let i = 0; i < 5; i++) {
      const result = await this.redis.call(
        "SET",
        lockKey,
        "1",
        "NX",
        "PX",
        "5000"
      );
      if (result === "OK") {
        acquired = true;
        break;
      }
      await new Promise((res) => setTimeout(res, 300));
    }

    if (!acquired) throw new Error("Could not acquire DB connection lock");

    try {
      const pool = mysql.createPool({ uri: decryptedUrl, connectionLimit: 3 });
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
      throw new Error("Failed to connect to tenant DB");
    } finally {
      await this.redis.del(lockKey);
    }
  }

  cleanupIdleConnections(): void {
    const now = Date.now();
    for (const [url, conn] of this.tenantCache.entries()) {
      if (now - conn.lastUsed > this.IDLE_TIMEOUT) {
        conn.pool.end().catch(console.error);
        this.tenantCache.delete(url);
        console.log(`[TenantDbFactory] Disconnected idle pool: ${url}`);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
  }
}
