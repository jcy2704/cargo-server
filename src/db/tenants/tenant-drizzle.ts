import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { decrypt } from '@/utils/crypto';

const tenantPools: Record<string, {
  pool: mysql.Pool;
  client: MySql2Database<any>;
  lastUsed: number;
}> = {};

const IDLE_TIMEOUT = 1000 * 60 * 30; // 30 minutes

export function getDrizzleForTenant(encryptedUrl: string): MySql2Database<any> {
  const now = Date.now();
  const decryptedUrl = decrypt(encryptedUrl);

  if (!tenantPools[decryptedUrl]) {
    const pool = mysql.createPool({ uri: decryptedUrl });
    const client = drizzle(pool);
    tenantPools[decryptedUrl] = { pool, client, lastUsed: now };
  } else {
    tenantPools[decryptedUrl].lastUsed = now;
  }

  return tenantPools[decryptedUrl].client;
}

// Background cleanup
setInterval(() => {
  const now = Date.now();
  for (const [url, entry] of Object.entries(tenantPools)) {
    if (now - entry.lastUsed > IDLE_TIMEOUT) {
      entry.pool.end();
      delete tenantPools[url];
    }
  }
}, 60_000);
