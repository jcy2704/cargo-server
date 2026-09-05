import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db as sharedDb } from "@/db";
import { clients, type Client } from "@/db/schema";
import { encrypt } from "@/utils/crypto";
import { maskWhatsappSettings } from "@/core/services/whatsappCredentials";
import { ValidationError } from "@/utils/errors";
import { getTenantLogger } from "@/utils/tenant-logger";
import { withClient } from "@/middleware";

type Variables = {
  client: Client;
};

const whatsapp = new Hono<{ Variables: Variables }>();

// Shared-DB credentials — authenticate the Client without a tenant connection.
whatsapp.use("*", withClient);

/**
 * GET /api/whatsapp — the calling Client's WhatsApp settings.
 *
 * The Client is resolved from the API key by `withTenantDrizzle`, so one Client
 * can only ever read its own settings. The access token is masked out; only its
 * presence (`accessTokenSet`) is reported.
 */
whatsapp.get("/", (c) => {
  const client = c.get("client");
  return c.json(maskWhatsappSettings(client));
});

/**
 * PUT /api/whatsapp — update the calling Client's WhatsApp settings.
 *
 * Partial update, so the masked portal form can save the toggle or edit the
 * phone_number_id/waba_id without re-sending the secret token. A field is only
 * written when a non-empty value is provided; the access token is (re)encrypted
 * at rest and never stored in plaintext.
 */
whatsapp.put("/", async (c) => {
  const log = getTenantLogger(c);
  const client = c.get("client");

  const body = (await c.req.json()) as {
    enabled?: boolean;
    phoneNumberId?: string;
    wabaId?: string;
    accessToken?: string;
  };

  const updates: Partial<
    Pick<
      Client,
      | "whatsappEnabled"
      | "whatsappPhoneNumberId"
      | "whatsappWabaId"
      | "whatsappAccessToken"
    >
  > = {};

  if (typeof body.enabled === "boolean") {
    updates.whatsappEnabled = body.enabled;
  }
  if (typeof body.phoneNumberId === "string" && body.phoneNumberId.trim()) {
    updates.whatsappPhoneNumberId = body.phoneNumberId.trim();
  }
  if (typeof body.wabaId === "string" && body.wabaId.trim()) {
    updates.whatsappWabaId = body.wabaId.trim();
  }
  if (typeof body.accessToken === "string" && body.accessToken.trim()) {
    updates.whatsappAccessToken = encrypt(body.accessToken.trim());
  }

  if (Object.keys(updates).length === 0) {
    throw new ValidationError("No WhatsApp settings provided to update");
  }

  // Guard: don't let the channel be enabled without complete credentials.
  const merged = { ...client, ...updates };
  const willBeEnabled = merged.whatsappEnabled;
  if (
    willBeEnabled &&
    (!merged.whatsappPhoneNumberId ||
      !merged.whatsappWabaId ||
      !merged.whatsappAccessToken)
  ) {
    throw new ValidationError(
      "Cannot enable WhatsApp without phone_number_id, waba_id, and an access token"
    );
  }

  await sharedDb.update(clients).set(updates).where(eq(clients.id, client.id));

  log.info("WhatsApp settings updated", {
    enabled: merged.whatsappEnabled,
    credentialsChanged:
      "whatsappPhoneNumberId" in updates ||
      "whatsappWabaId" in updates ||
      "whatsappAccessToken" in updates,
  });

  return c.json(maskWhatsappSettings(merged));
});

export default whatsapp;
