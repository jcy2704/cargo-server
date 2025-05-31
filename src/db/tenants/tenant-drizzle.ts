import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { decrypt } from "@/utils/crypto";

type TenantConnection = {
  pool: mysql.Pool;
  client: MySql2Database<any>;
  lastUsed: number;
};

const tenantPools: Record<string, TenantConnection> = {};

const IDLE_TIMEOUT = 1000 * 60 * 30; // 30 minutes
const CLEANUP_INTERVAL = 60_000; // 1 minute

function createTenantConnection(decryptedUrl: string): TenantConnection {
  const pool = mysql.createPool({ uri: decryptedUrl });
  const client = drizzle(pool);
  return { pool, client, lastUsed: Date.now() };
}

export function getDrizzleForTenant(encryptedUrl: string): MySql2Database<any> {
  const decryptedUrl = decrypt(encryptedUrl);
  const now = Date.now();

  const entry = tenantPools[decryptedUrl];

  if (entry) {
    entry.lastUsed = now;
    return entry.client;
  }

  try {
    const connection = createTenantConnection(decryptedUrl);
    tenantPools[decryptedUrl] = connection;
    return connection.client;
  } catch (err) {
    console.error(`Failed to create DB pool for tenant`, err);
    throw new Error("Failed to create tenant connection");
  }
}

// Cleanup idle pools periodically
setInterval(() => {
  const now = Date.now();
  for (const [url, entry] of Object.entries(tenantPools)) {
    if (now - entry.lastUsed > IDLE_TIMEOUT) {
      console.log(`Closing idle DB pool for tenant: ${url}`);
      entry.pool.end().catch(console.error);
      delete tenantPools[url];
    }
  }
}, CLEANUP_INTERVAL);
