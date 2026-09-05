import { describe, expect, it } from "bun:test";
import {
  encodeWhatsappCredentials,
  readWhatsappCredentials,
  maskWhatsappSettings,
} from "./whatsappCredentials";

const input = {
  phoneNumberId: "1234567890",
  wabaId: "9876543210",
  accessToken: "EAAG-super-secret-meta-token",
};

describe("encodeWhatsappCredentials", () => {
  it("encrypts the access token, never storing it in plaintext", () => {
    const encoded = encodeWhatsappCredentials(input);

    expect(encoded.whatsappPhoneNumberId).toBe(input.phoneNumberId);
    expect(encoded.whatsappWabaId).toBe(input.wabaId);
    expect(encoded.whatsappAccessToken).not.toBe(input.accessToken);
    expect(encoded.whatsappAccessToken).not.toContain(input.accessToken);
  });

  it("produces a different ciphertext each call (random IV)", () => {
    const a = encodeWhatsappCredentials(input);
    const b = encodeWhatsappCredentials(input);
    expect(a.whatsappAccessToken).not.toBe(b.whatsappAccessToken);
  });
});

describe("readWhatsappCredentials", () => {
  it("round-trips: decrypts the token stored by encodeWhatsappCredentials", () => {
    const encoded = encodeWhatsappCredentials(input);

    const creds = readWhatsappCredentials(encoded);

    expect(creds).toEqual({
      phoneNumberId: input.phoneNumberId,
      wabaId: input.wabaId,
      accessToken: input.accessToken,
    });
  });

  it("returns null when credentials are not fully configured", () => {
    expect(
      readWhatsappCredentials({
        whatsappPhoneNumberId: null,
        whatsappWabaId: null,
        whatsappAccessToken: null,
      })
    ).toBeNull();

    const encoded = encodeWhatsappCredentials(input);
    expect(
      readWhatsappCredentials({ ...encoded, whatsappAccessToken: null })
    ).toBeNull();
  });
});

describe("maskWhatsappSettings", () => {
  it("never exposes the access token to the portal", () => {
    const encoded = encodeWhatsappCredentials(input);

    const masked = maskWhatsappSettings({
      ...encoded,
      whatsappEnabled: true,
    });

    expect(masked).toEqual({
      enabled: true,
      phoneNumberId: input.phoneNumberId,
      wabaId: input.wabaId,
      accessTokenSet: true,
    });
    expect(JSON.stringify(masked)).not.toContain(input.accessToken);
    expect(JSON.stringify(masked)).not.toContain(encoded.whatsappAccessToken);
  });

  it("reports accessTokenSet=false and nulls when nothing is configured", () => {
    const masked = maskWhatsappSettings({
      whatsappEnabled: false,
      whatsappPhoneNumberId: null,
      whatsappWabaId: null,
      whatsappAccessToken: null,
    });

    expect(masked).toEqual({
      enabled: false,
      phoneNumberId: null,
      wabaId: null,
      accessTokenSet: false,
    });
  });
});
