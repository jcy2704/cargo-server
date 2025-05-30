import { randomBytes } from "crypto";

export function generateApiKey(): string {
  return randomBytes(32).toString("hex"); // 64-char hex string
}
