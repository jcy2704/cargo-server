import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { encrypt, decrypt } from "@/utils/crypto";
import { redis } from "@/lib/redis";
import QuickLRU from "quick-lru";

type TenantConnection = {
  decryptedUrl: string;
  pool: mysql.Pool;
  client: MySql2Database<any>;
  lastUsed: number;
};

const tenantCache = new QuickLRU<string, TenantConnection>({
  maxSize: 10, // adjust based on expected tenant volume
});
const IDLE_TIMEOUT = 1000 * 60 * 30;
const CLEANUP_INTERVAL = 60_000;

async function createTenantConnection(
  decryptedUrl: string
): Promise<TenantConnection> {
  const pool = mysql.createPool({
    uri: decryptedUrl,
    connectionLimit: 3,
  });
  const client = drizzle(pool);
  return { decryptedUrl, pool, client, lastUsed: Date.now() };
}

export async function getDrizzleForTenant(
  encryptedUrl: string
): Promise<MySql2Database<any>> {
  if (!encryptedUrl) throw new Error("No encrypted DB URL provided");

  const redisKey = `tenant:conn:${encryptedUrl}`;

  // Check cache
  const cached = Array.from(tenantCache.values()).find(
    (entry) => encrypt(entry.decryptedUrl) === encryptedUrl
  );
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.client;
  }

  // Try Redis first
  let decryptedUrl: string | null = await redis.get(redisKey);
  if (!decryptedUrl) {
    decryptedUrl = decrypt(encryptedUrl);
    if (!decryptedUrl) throw new Error("Failed to decrypt DB URL");
    await redis.set(redisKey, decryptedUrl, "EX", 1800); // Cache 30 mins
  }

  // Prevent race conditions with Redis lock
  const lockKey = `lock:tenant:${decryptedUrl}`;
  let locked = false;

  for (let i = 0; i < 5; i++) {
    const lock = await redis.call("SET", lockKey, "1", "NX", "PX", "5000");
    if (lock) {
      locked = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  if (!locked) {
    throw new Error("Could not acquire DB connection lock");
  }

  try {
    const connection = await createTenantConnection(decryptedUrl);
    tenantCache.set(decryptedUrl, connection);
    return connection.client;
  } catch (err) {
    throw new Error("Failed to connect to tenant DB");
  } finally {
    await redis.del(lockKey);
  }
}

// Auto-cleanup of idle pools
setInterval(() => {
  const now = Date.now();
  for (const [url, conn] of tenantCache.entries()) {
    if (now - conn.lastUsed > IDLE_TIMEOUT) {
      conn.pool.end().catch(console.error);
      tenantCache.delete(url);
      console.log(`[tenant] Disconnected idle pool: ${url}`);
    }
  }
}, CLEANUP_INTERVAL);
