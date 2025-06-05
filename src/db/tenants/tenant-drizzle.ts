import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { decrypt } from "@/utils/crypto";
import { redis } from "@/lib/redis";

type TenantConnection = {
  pool: mysql.Pool;
  client: MySql2Database<any>;
  lastUsed: number;
};

const tenantPools: Record<string, TenantConnection> = {};
const IDLE_TIMEOUT = 1000 * 60 * 30;
const CLEANUP_INTERVAL = 60_000;

async function createTenantConnection(
  decryptedUrl: string
): Promise<TenantConnection> {
  const pool = mysql.createPool({ uri: decryptedUrl });
  const client = drizzle(pool);
  return { pool, client, lastUsed: Date.now() };
}

export async function getDrizzleForTenant(
  encryptedUrl: string
): Promise<MySql2Database<any>> {
  if (!encryptedUrl) throw new Error("No encrypted DB URL provided");

  const redisKey = `tenant:conn:${encryptedUrl}`;

  let decryptedUrl: string | null = null;

  try {
    decryptedUrl = await redis.get(redisKey);

    if (!decryptedUrl) {
      decryptedUrl = decrypt(encryptedUrl);

      if (!decryptedUrl) {
        throw new Error("Failed to decrypt tenant DB URL");
      }

      await redis.set(redisKey, decryptedUrl, "EX", 1800);
    }
  } catch (err) {
    throw new Error("Could not resolve tenant DB URL");
  }

  const now = Date.now();
  const cached = tenantPools[decryptedUrl];
  if (cached) {
    cached.lastUsed = now;
    return cached.client;
  }

  const lockKey = `lock:tenant:${decryptedUrl}`;
  const lock = await redis.call("SET", lockKey, "1", "NX", "PX", "5000");
  if (!lock) {
    await new Promise((r) => setTimeout(r, 300));
    return getDrizzleForTenant(encryptedUrl); // recursive retry
  }

  try {
    const connection = await createTenantConnection(decryptedUrl);
    tenantPools[decryptedUrl] = connection;
    return connection.client;
  } catch (err) {
    throw new Error("Failed to connect to tenant database");
  } finally {
    await redis.del(lockKey);
  }
}

// Cleanup idle pools
setInterval(() => {
  const now = Date.now();
  for (const [url, conn] of Object.entries(tenantPools)) {
    if (now - conn.lastUsed > IDLE_TIMEOUT) {
      conn.pool.end().catch(console.error);
      delete tenantPools[url];
    }
  }
}, CLEANUP_INTERVAL);
