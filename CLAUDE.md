# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cargo-server is a multi-tenant API server for managing shipping/cargo operations. Built with Bun, Hono, and Drizzle ORM, it supports multiple tenants (clients) each with their own isolated database for managing invoices (facturas), trackings, customers (usuarios), and shipping locations (sucursales).

## Development Commands

```bash
# Install dependencies
bun install

# Development (with hot reload)
bun run dev

# Start full stack with Docker (MariaDB + Redis + API + Email Worker)
bun run dev:start

# Production start (runs migrations first)
bun run start

# Database management
bun run db:generate --name <migration_name>  # Generate new migration
bun run db:migrate                           # Run pending migrations
bun run db:studio                           # Open Drizzle Studio

# Email worker (runs separately)
bun run email:worker

# Email development server
bun run email-dev
```

## Architecture

### Multi-Tenant Architecture

The application uses a **two-database architecture**:

1. **Shared Database** (`src/db/schema.ts`): Stores tenant metadata
   - `clients` table: Contains tenant domains, API keys, and encrypted database URLs
   - Each client gets a unique API key for authentication

2. **Tenant Databases** (`src/db/tenants/tenants-schema.ts`): Each tenant has their own isolated database
   - `companies`: Company information and branding
   - `sucursales`: Branch/location management
   - `usuarios`: End customers with locker numbers (casillero)
   - `facturas`: Invoices for package deliveries
   - `trackings`: Individual package tracking numbers
   - `users`: Staff users (admin, secretaria, empleado)
   - `reportes`: Financial reports

### Request Flow

```
Client Request → withTenantDrizzle Middleware → API Route
                 ↓
                 1. Validate Bearer token (API key)
                 2. Lookup client in shared DB
                 3. Get tenant DB connection via TenantDbFactory
                 4. Inject tenantDb into Hono context
                 5. Track usage in Redis
```

### Connection Pooling & Caching

**TenantDbFactory** (`src/core/factories/TenantDbFactory.ts`) implements sophisticated connection management:

- **LRU Cache**: Keeps up to 10 active tenant connections in memory
- **Redis Caching**: Caches decrypted DB URLs (30min TTL) to avoid repeated decryption
- **Connection Reuse**: Fast-path checks for existing healthy connections
- **Distributed Locking**: Uses Redis optimistic spin locks to prevent connection races
- **Idle Cleanup**: Automatically closes connections idle for 30+ minutes
- **Small Pool Size**: Uses `connectionLimit: 2` per tenant to conserve resources

**Important**: When modifying TenantDbFactory, preserve the lock acquisition logic and health checks to prevent connection leaks.

### Email System

Email processing uses **BullMQ** for background job processing:

- **Queues**: Managed via `src/lib/redis.ts` (emailQueue)
- **Worker**: `src/workers/emailWorker.ts` processes jobs independently
- **Rate Limiting**: Uses `p-limit` to control concurrent email sends
- **Job Batching**: Bulk factura emails are chunked (10 per job) for better reliability
- **PDF Generation**: Facturas are converted to PDFs using `@react-pdf/renderer` before attachment

**Email Routes**:
- POST `/api/emails/bienvenida`: Welcome email for new customers
- POST `/api/emails/send-factura`: Single invoice email (queued in microtask)
- POST `/api/emails/send-bulk-facturas`: Bulk invoice emails (BullMQ jobs)
- GET `/api/emails/status/:jobId`: Check job status

### API Structure

```
/tenants          → Tenant management (shared DB)
├── GET  /        → List all tenants
├── POST /        → Create new tenant
└── GET  /usage   → Get usage metrics from Redis

/api              → Tenant-scoped routes (requires Bearer auth)
├── /emails       → Email operations
├── /facturas     → Invoice operations
└── GET  /        → Test route (lists companies)
```

All `/api/*` routes automatically get `tenantDb` injected via `withTenantDrizzle` middleware.

### Environment & Infrastructure

**Required Environment Variables**:
- `DATABASE_URL`: Shared database connection string
- `REDIS_URL`: Redis connection for caching & queues
- `REDIS_PASSWORD`: Redis authentication
- `RESEND_API_KEY`: Email service API key
- `AWS_*`: S3 credentials for file storage
- `ENCRYPTION_KEY`: For encrypting tenant DB URLs
- `PUBLIC_ALLOWED_ORIGINS`: CORS origins (comma-separated)

**Docker Compose Services**:
- `cargo-api`: Main Hono server (port 3000)
- `db`: MariaDB 10.11 (port 3306)
- `redis`: Redis 7 with persistence
- `email-worker`: Dedicated BullMQ worker process
- `redisinsight`: Redis GUI (port 5540)

## Code Patterns

### Accessing Tenant DB in Routes

```typescript
import { type MySql2Database } from "drizzle-orm/mysql2";
import * as tenantSchema from "@/db/tenants/tenants-schema";

type Variables = {
  tenantDb: MySql2Database<typeof tenantSchema>;
};

const myRoute = new Hono<{ Variables: Variables }>();

myRoute.get("/", async (c) => {
  const tenantDb = c.get("tenantDb");
  const results = await tenantDb.select().from(tenantSchema.usuarios);
  return c.json(results);
});
```

### Repository Pattern

Use repositories for complex queries (see `src/core/repositories/FacturasRepository.ts`):

```typescript
export class FacturaRepository {
  constructor(private db: MySql2Database<typeof TenantSchema>) {}

  async getWithRelations(facturaIds: number[]): Promise<FacturaWithRelations[]> {
    // Complex join logic with proper typing
  }
}

// In route:
const facturaRepo = new FacturaRepository(tenantDb);
const facturas = await facturaRepo.getWithRelations([1, 2, 3]);
```

### Database Schema Conventions

- **Timestamps**: All tables use `createdAt` and `updatedAt` (auto-managed by Drizzle)
- **Soft Deletes**: Use `archivado` boolean + `archivadoAt` timestamp
- **Indexing**: Performance-critical tables have composite indexes (see comments in `tenants-schema.ts`)
- **Relations**: Defined using Drizzle's `relations()` for type-safe joins

### Path Aliases

TypeScript is configured with `@/*` alias pointing to `src/*`:

```typescript
import { db } from "@/db";
import { tenantDbFactory } from "@/lib/tenantDbFactory";
import * as tenantSchema from "@/db/tenants/tenants-schema";
```

## Testing & Debugging

**Drizzle Studio**: Run `bun run db:studio` to visually inspect/edit the shared database.

**Redis Debugging**: Access RedisInsight at `http://localhost:5540` when running `docker compose up`.

**Email Worker Logs**: The worker runs as a separate process. Check Docker logs:
```bash
docker compose logs email-worker -f
```

**Database Migrations**: Migrations only apply to the shared database (clients table). Tenant databases are managed separately by each client.

## Performance Considerations

- **Connection Limits**: Tenant DB pools are limited to 2 connections each. Avoid long-running queries that block the pool.
- **Index Awareness**: Check `tenants-schema.ts` for indexed columns before adding filters/sorts.
- **Caching**: Decrypted URLs and usage counts are Redis-cached. Don't bypass these caches.
- **Email Batching**: Always use bulk endpoints for sending multiple emails to leverage BullMQ chunking.
