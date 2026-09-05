import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import {
  createWhatsAppSender,
  normalizeToE164,
  WhatsAppApiError,
  INVOICE_TEMPLATE_NAME,
  INVOICE_TEMPLATE_LANGUAGE,
  type HttpClient,
} from "./whatsappSender";
import type { WhatsappCredentials } from "@/core/services/whatsappCredentials";

const creds: WhatsappCredentials = {
  phoneNumberId: "PN_1",
  wabaId: "WABA_1",
  accessToken: "SECRET_TOKEN",
};

const BASE = "https://graph.test";
const VERSION = "v21.0";

type RecordedCall = { url: string; init: RequestInit };

/** A fake Meta HTTP boundary: records every request and returns canned replies. */
function fakeHttp(
  handler: (url: string, init: RequestInit) => Response | Promise<Response>
) {
  const calls: RecordedCall[] = [];
  const httpClient: HttpClient = async (url, init = {}) => {
    calls.push({ url, init });
    return handler(url, init);
  };
  return { httpClient, calls };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function makeSender(httpClient: HttpClient) {
  return createWhatsAppSender({
    httpClient,
    graphApiVersion: VERSION,
    graphApiBaseUrl: BASE,
  });
}

function authHeader(init: RequestInit): string | null {
  return new Headers(init.headers).get("authorization");
}

describe("normalizeToE164", () => {
  it("strips formatting and keeps an existing country code", () => {
    expect(normalizeToE164("+1 (415) 555-2671")).toBe("+14155552671");
    expect(normalizeToE164("+14155552671")).toBe("+14155552671");
    expect(normalizeToE164("+507 6000-1234")).toBe("+50760001234");
  });

  it("maps a leading 00 international prefix to +", () => {
    expect(normalizeToE164("0044 20 7946 0958")).toBe("+442079460958");
  });

  it("assumes a bare all-digit number already carries its country code", () => {
    expect(normalizeToE164("50760001234")).toBe("+50760001234");
  });

  it("throws for numbers that cannot be a valid E.164 value", () => {
    expect(() => normalizeToE164("")).toThrow();
    expect(() => normalizeToE164("abc")).toThrow();
    expect(() => normalizeToE164("+12")).toThrow();
    expect(() => normalizeToE164("00")).toThrow();
  });
});

describe("WhatsAppSender.uploadMedia", () => {
  it("uploads the PDF to the phone number's media endpoint and returns the media id", async () => {
    const { httpClient, calls } = fakeHttp(() => json({ id: "MEDIA_123" }));
    const sender = makeSender(httpClient);

    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"
    const mediaId = await sender.uploadMedia(creds, pdf);

    expect(mediaId).toBe("MEDIA_123");
    expect(calls).toHaveLength(1);

    const [call] = calls;
    expect(call.url).toBe(`${BASE}/${VERSION}/${creds.phoneNumberId}/media`);
    expect(call.init.method).toBe("POST");
    expect(authHeader(call.init)).toBe(`Bearer ${creds.accessToken}`);

    const body = call.init.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("messaging_product")).toBe("whatsapp");
    expect(body.get("type")).toBe("application/pdf");
    const file = body.get("file");
    expect(file).toBeInstanceOf(Blob);
    expect((file as Blob).size).toBe(pdf.byteLength);
  });

  it("surfaces a Meta error as a typed WhatsAppApiError, not a raw throw", async () => {
    const { httpClient } = fakeHttp(() =>
      json(
        {
          error: {
            message: "Unsupported post request.",
            type: "OAuthException",
            code: 100,
            fbtrace_id: "Axyz",
          },
        },
        400
      )
    );
    const sender = makeSender(httpClient);

    let caught: unknown;
    try {
      await sender.uploadMedia(creds, new Uint8Array([1, 2, 3]));
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(WhatsAppApiError);
    const error = caught as WhatsAppApiError;
    expect(error.status).toBe(400);
    expect(error.metaCode).toBe(100);
    expect(error.metaType).toBe("OAuthException");
    expect(error.fbtraceId).toBe("Axyz");
    // The raw Response / HTTP internals must not leak through the message.
    expect(error.message).toContain("Unsupported post request.");
  });
});

describe("WhatsAppSender.createInvoiceTemplate", () => {
  it("provisions a utility document+body Template into the Client's WABA", async () => {
    const { httpClient, calls } = fakeHttp(() =>
      json({ id: "TEMPLATE_9", status: "PENDING", category: "UTILITY" })
    );
    const sender = makeSender(httpClient);

    const result = await sender.createInvoiceTemplate(creds);
    expect(result).toEqual({ templateId: "TEMPLATE_9" });

    const [call] = calls;
    expect(call.url).toBe(
      `${BASE}/${VERSION}/${creds.wabaId}/message_templates`
    );
    expect(call.init.method).toBe("POST");
    expect(authHeader(call.init)).toBe(`Bearer ${creds.accessToken}`);
    expect(new Headers(call.init.headers).get("content-type")).toContain(
      "application/json"
    );

    const payload = JSON.parse(call.init.body as string);
    expect(payload.name).toBe(INVOICE_TEMPLATE_NAME);
    expect(payload.category).toBe("UTILITY");
    expect(payload.language).toBe(INVOICE_TEMPLATE_LANGUAGE);

    const header = payload.components.find((c: any) => c.type === "HEADER");
    const bodyComp = payload.components.find((c: any) => c.type === "BODY");
    expect(header.format).toBe("DOCUMENT");
    // Body must carry at least one variable for the Tracking numbers.
    expect(bodyComp.text).toContain("{{1}}");
  });

  it("surfaces a Meta error as a typed WhatsAppApiError", async () => {
    const { httpClient } = fakeHttp(() =>
      json(
        { error: { message: "Template already exists", type: "Api", code: 200 } },
        409
      )
    );
    const sender = makeSender(httpClient);

    await expect(sender.createInvoiceTemplate(creds)).rejects.toBeInstanceOf(
      WhatsAppApiError
    );
  });
});

describe("WhatsAppSender.sendInvoiceTemplate", () => {
  it("sends the utility Template with the PDF header and Tracking body variable to the E.164 number", async () => {
    const { httpClient, calls } = fakeHttp(() =>
      json({
        messaging_product: "whatsapp",
        contacts: [{ wa_id: "14155552671" }],
        messages: [{ id: "wamid.HBgL" }],
      })
    );
    const sender = makeSender(httpClient);

    const result = await sender.sendInvoiceTemplate(creds, "+1 (415) 555-2671", {
      mediaId: "MEDIA_123",
      trackingVars: ["TRK001", "TRK002"],
    });

    expect(result).toEqual({ ok: true, messageId: "wamid.HBgL" });

    const [call] = calls;
    expect(call.url).toBe(`${BASE}/${VERSION}/${creds.phoneNumberId}/messages`);
    expect(call.init.method).toBe("POST");
    expect(authHeader(call.init)).toBe(`Bearer ${creds.accessToken}`);

    const payload = JSON.parse(call.init.body as string);
    expect(payload.messaging_product).toBe("whatsapp");
    // Normalized to E.164 before send.
    expect(payload.to).toBe("+14155552671");
    expect(payload.type).toBe("template");
    expect(payload.template.name).toBe(INVOICE_TEMPLATE_NAME);
    expect(payload.template.language.code).toBe(INVOICE_TEMPLATE_LANGUAGE);

    const header = payload.template.components.find(
      (c: any) => c.type === "header"
    );
    const body = payload.template.components.find((c: any) => c.type === "body");
    // PDF attached as the document header via the uploaded media id.
    expect(header.parameters[0]).toEqual({
      type: "document",
      document: { id: "MEDIA_123" },
    });
    // Tracking numbers populate the body variable.
    const trackingParam = body.parameters[0];
    expect(trackingParam.type).toBe("text");
    expect(trackingParam.text).toContain("TRK001");
    expect(trackingParam.text).toContain("TRK002");
  });

  it("returns { ok: false, error } when Meta rejects the send — no throw, no HTTP leak", async () => {
    const { httpClient } = fakeHttp(() =>
      json(
        {
          error: {
            message: "(#131030) Recipient phone number not in allowed list",
            type: "OAuthException",
            code: 131030,
            error_subcode: 2655007,
            fbtrace_id: "Aabc",
          },
        },
        400
      )
    );
    const sender = makeSender(httpClient);

    const result = await sender.sendInvoiceTemplate(creds, "+14155552671", {
      mediaId: "MEDIA_123",
      trackingVars: ["TRK001"],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.error).toBeInstanceOf(WhatsAppApiError);
    expect(result.error.status).toBe(400);
    expect(result.error.metaCode).toBe(131030);
    expect(result.error.metaSubcode).toBe(2655007);
    expect(result.error.fbtraceId).toBe("Aabc");
  });
});

describe("Meta boundary is isolated to this adapter", () => {
  it("is the only source file that references the Meta Graph host", () => {
    const srcDir = join(process.cwd(), "src");
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules") continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith(".ts")) continue;
        if (entry.name.endsWith(".test.ts")) continue; // tests may fake the boundary
        if (full.endsWith(join("adapters", "whatsappSender.ts"))) continue;
        if (readFileSync(full, "utf8").includes("graph.facebook.com")) {
          offenders.push(full);
        }
      }
    };

    walk(srcDir);
    expect(offenders).toEqual([]);
  });
});
