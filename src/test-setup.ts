// Preloaded before tests (see bunfig.toml). Guarantees a 32-byte (64 hex char)
// CRYPTO_KEY so utils/crypto.ts can initialize even without a local .env.
if (!process.env.CRYPTO_KEY || process.env.CRYPTO_KEY.length !== 64) {
  process.env.CRYPTO_KEY = "0".repeat(64);
}
