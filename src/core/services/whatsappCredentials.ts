import { encrypt, decrypt } from "@/utils/crypto";
import type { Client } from "@/db/schema";

/**
 * A Client's WhatsApp Business (WABA) credentials, as entered by a Client admin.
 * Domain vocabulary follows CONTEXT.md: a WABA is the Client's own WhatsApp
 * Business Account + number; phone_number_id is Meta's id for that number.
 */
export type WhatsappCredentialsInput = {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
};

/** Decrypted WABA credentials for server-side use (sending on the Client's behalf). */
export type WhatsappCredentials = WhatsappCredentialsInput;

/** The subset of a `clients` row that holds WABA credentials. */
type WhatsappCredentialColumns = Pick<
  Client,
  "whatsappPhoneNumberId" | "whatsappWabaId" | "whatsappAccessToken"
>;

/** WABA credential columns plus the per-Client on/off toggle. */
type WhatsappSettingColumns = WhatsappCredentialColumns &
  Pick<Client, "whatsappEnabled">;

/**
 * Convert admin-entered credentials into the shape written to the shared
 * `clients` row. The access token is encrypted at rest with AES-256-GCM
 * (utils/crypto) exactly as `dbUrl` is — it is never stored in plaintext.
 */
export function encodeWhatsappCredentials(input: WhatsappCredentialsInput): {
  whatsappPhoneNumberId: string;
  whatsappWabaId: string;
  whatsappAccessToken: string;
} {
  return {
    whatsappPhoneNumberId: input.phoneNumberId,
    whatsappWabaId: input.wabaId,
    whatsappAccessToken: encrypt(input.accessToken),
  };
}

/**
 * Read a Client's WABA credentials back for server-side use, decrypting the
 * access token. Returns null unless all three fields are configured, so callers
 * (e.g. the send worker) can treat "no credentials" as "skip WhatsApp".
 */
export function readWhatsappCredentials(
  client: WhatsappCredentialColumns
): WhatsappCredentials | null {
  const { whatsappPhoneNumberId, whatsappWabaId, whatsappAccessToken } = client;

  if (!whatsappPhoneNumberId || !whatsappWabaId || !whatsappAccessToken) {
    return null;
  }

  return {
    phoneNumberId: whatsappPhoneNumberId,
    wabaId: whatsappWabaId,
    accessToken: decrypt(whatsappAccessToken),
  };
}

/** Portal-safe view of a Client's WhatsApp settings — never includes the token. */
export type MaskedWhatsappSettings = {
  enabled: boolean;
  phoneNumberId: string | null;
  wabaId: string | null;
  accessTokenSet: boolean;
};

/**
 * Project a `clients` row into the portal-safe settings view. The access token
 * is deliberately reduced to a boolean (`accessTokenSet`) so the plaintext or
 * ciphertext token is never sent to the portal.
 */
export function maskWhatsappSettings(
  client: WhatsappSettingColumns
): MaskedWhatsappSettings {
  return {
    enabled: Boolean(client.whatsappEnabled),
    phoneNumberId: client.whatsappPhoneNumberId ?? null,
    wabaId: client.whatsappWabaId ?? null,
    accessTokenSet: Boolean(client.whatsappAccessToken),
  };
}
