import { TenantDbFactory } from "@/core/factories/TenantDbFactory";
import { redis } from "./redis";

export const tenantDbFactory = new TenantDbFactory(redis);
