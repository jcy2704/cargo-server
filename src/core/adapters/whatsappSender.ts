import type { WhatsappCredentials } from "@/core/services/whatsappCredentials";

/**
 * WhatsAppSender — the single deep module that wraps every Meta Cloud API call
 * behind a small interface (ADR-0001; spec "The seam").
 *
 * It is the ONLY code in cargo-server that talks to Meta. Everything else (the
 * whatsapp-jobs worker, the send routes) goes through this adapter, so the whole
 * WhatsApp feature can be tested by faking a single boundary: the injectable
 * `httpClient`. Nothing here reaches out to Meta on its own — callers inject a
 * fetch-shaped client, and tests inject a fake one.
 */

/** A fetch-shaped HTTP client. The real one is `globalThis.fetch`; tests fake it. */
export type HttpClient = (
  url: string,
  init?: RequestInit
) => Promise<Response>;

export interface WhatsAppSenderDeps {
  /** Injectable Meta HTTP boundary. Defaults to the global `fetch`. */
  httpClient?: HttpClient;
  /** Meta Graph API version segment, e.g. "v21.0". */
  graphApiVersion?: string;
  /** Meta Graph API origin. Overridable so tests never need real hostnames. */
  graphApiBaseUrl?: string;
}

export interface SendInvoiceTemplateArgs {
  /** Media id from `uploadMedia`, used as the Template's document header. */
  mediaId: string;
  /** Package Tracking numbers, rendered into the Template's body variable. */
  trackingVars: string[];
}

/** Send outcome — a typed union so a Meta error never leaks as a raw throw. */
export type SendInvoiceResult =
  | { ok: true; messageId: string }
  | { ok: false; error: WhatsAppApiError };

export interface WhatsAppSender {
  /**
   * Provision the predetermined utility invoice Template into the Client's WABA.
   * Called once when a Client connects their WABA. Returns Meta's template id.
   */
  createInvoiceTemplate(
    creds: WhatsappCredentials
  ): Promise<{ templateId: string }>;

  /** Upload an invoice PDF to Meta's media endpoint; returns the media id. */
  uploadMedia(creds: WhatsappCredentials, pdf: Uint8Array): Promise<string>;

  /**
   * Send the utility invoice Template to a Usuario. Normalizes `toPhone` to
   * E.164, attaches the PDF (via `mediaId`) as the document header, and fills
   * the Tracking body variable. Meta errors surface as `{ ok: false, error }`.
   */
  sendInvoiceTemplate(
    creds: WhatsappCredentials,
    toPhone: string,
    args: SendInvoiceTemplateArgs
  ): Promise<SendInvoiceResult>;
}

/**
 * A typed Meta API error. Carries Meta's own error fields (code/type/subcode/
 * fbtrace_id) and the HTTP status, so callers get a domain error instead of a
 * raw `Response` or a low-level fetch throw leaking out of the seam.
 */
export class WhatsAppApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly metaCode?: number,
    public readonly metaType?: string,
    public readonly metaSubcode?: number,
    public readonly fbtraceId?: string
  ) {
    super(message);
    this.name = "WhatsAppApiError";
  }
}

/** Meta-approved name of the phase-1 predetermined utility invoice Template. */
export const INVOICE_TEMPLATE_NAME = "cargo_invoice_delivery";

/** Language code the invoice Template is authored in. */
export const INVOICE_TEMPLATE_LANGUAGE = "es";

const DEFAULT_GRAPH_BASE_URL = "https://graph.facebook.com";
const DEFAULT_GRAPH_VERSION = "v21.0";

/**
 * Normalize a raw phone number (free-text `usuarios.telefono`) to E.164:
 * `+` followed by 7–15 digits. Strips spaces/dashes/parens/dots, maps a leading
 * `00` international prefix to `+`, and assumes a bare all-digit string already
 * carries its country code (we cannot invent one). Throws for an unusable value.
 */
export function normalizeToE164(raw: string): string {
  const cleaned = String(raw ?? "").replace(/[\s\-().]/g, "");

  let candidate: string;
  if (cleaned.startsWith("+")) {
    candidate = cleaned;
  } else if (cleaned.startsWith("00")) {
    candidate = "+" + cleaned.slice(2);
  } else {
    candidate = "+" + cleaned;
  }

  // E.164: leading '+', a non-zero country-code digit, total 7–15 digits.
  if (!/^\+[1-9]\d{6,14}$/.test(candidate)) {
    throw new Error(`Cannot normalize "${raw}" to an E.164 phone number`);
  }

  return candidate;
}

/**
 * Body copy for the predetermined utility Template. Minimal fixed framing text
 * (Meta rejects a bare-variable body) plus one variable, {{1}}, for the Tracking
 * numbers. The PDF rides along as the document header, not in the body.
 */
const INVOICE_TEMPLATE_BODY_TEXT =
  "Tu factura está adjunta. Números de seguimiento: {{1}}.";

/**
 * The Template-create payload sent to `/{waba_id}/message_templates`.
 *
 * NOTE: Meta may require an `example.header_handle` on a DOCUMENT header for the
 * Template to pass review. Producing that handle needs Meta's resumable upload
 * API at provision time; it's deferred to the provisioning wiring (ticket 3+),
 * which owns the real WABA-connection call — this adapter just shapes the
 * request. See spec "Template shape".
 */
function buildInvoiceTemplateDefinition() {
  return {
    name: INVOICE_TEMPLATE_NAME,
    language: INVOICE_TEMPLATE_LANGUAGE,
    category: "UTILITY",
    components: [
      { type: "HEADER", format: "DOCUMENT" },
      {
        type: "BODY",
        text: INVOICE_TEMPLATE_BODY_TEXT,
        example: { body_text: [["ABC123, DEF456"]] },
      },
    ],
  };
}

/** Meta's error envelope: `{ error: { message, type, code, ... } }`. */
type MetaErrorEnvelope = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

/**
 * Parse a non-2xx Meta response into a typed `WhatsAppApiError`. Reads Meta's
 * error envelope when present and never lets the raw `Response` escape the seam.
 */
async function toApiError(res: Response): Promise<WhatsAppApiError> {
  let envelope: MetaErrorEnvelope | null = null;
  try {
    envelope = (await res.json()) as MetaErrorEnvelope;
  } catch {
    // Non-JSON error body (e.g. an HTML gateway page); fall back to the status.
  }

  const metaError = envelope?.error;
  const message =
    metaError?.message ?? `Meta API request failed with status ${res.status}`;

  return new WhatsAppApiError(
    message,
    res.status,
    metaError?.code,
    metaError?.type,
    metaError?.error_subcode,
    metaError?.fbtrace_id
  );
}

export function createWhatsAppSender(
  deps: WhatsAppSenderDeps = {}
): WhatsAppSender {
  const httpClient: HttpClient = deps.httpClient ?? fetch;
  const version = deps.graphApiVersion ?? DEFAULT_GRAPH_VERSION;
  const baseUrl = (deps.graphApiBaseUrl ?? DEFAULT_GRAPH_BASE_URL).replace(
    /\/+$/,
    ""
  );

  const graphUrl = (path: string) => `${baseUrl}/${version}/${path}`;
  const authHeaders = (creds: WhatsappCredentials) => ({
    Authorization: `Bearer ${creds.accessToken}`,
  });

  return {
    async createInvoiceTemplate(creds) {
      const res = await httpClient(
        graphUrl(`${creds.wabaId}/message_templates`),
        {
          method: "POST",
          headers: {
            ...authHeaders(creds),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildInvoiceTemplateDefinition()),
        }
      );

      if (!res.ok) throw await toApiError(res);

      const data = (await res.json()) as { id: string };
      return { templateId: data.id };
    },

    async uploadMedia(creds, pdf) {
      const form = new FormData();
      form.append("messaging_product", "whatsapp");
      form.append("type", "application/pdf");
      form.append(
        "file",
        new Blob([pdf as BlobPart], { type: "application/pdf" }),
        "factura.pdf"
      );

      const res = await httpClient(graphUrl(`${creds.phoneNumberId}/media`), {
        method: "POST",
        headers: authHeaders(creds), // let fetch set the multipart Content-Type
        body: form,
      });

      if (!res.ok) throw await toApiError(res);

      const data = (await res.json()) as { id: string };
      return data.id;
    },

    async sendInvoiceTemplate(creds, toPhone, { mediaId, trackingVars }) {
      const to = normalizeToE164(toPhone);
      const trackingText = trackingVars.join(", ");

      const res = await httpClient(
        graphUrl(`${creds.phoneNumberId}/messages`),
        {
          method: "POST",
          headers: {
            ...authHeaders(creds),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
              name: INVOICE_TEMPLATE_NAME,
              language: { code: INVOICE_TEMPLATE_LANGUAGE },
              components: [
                {
                  type: "header",
                  parameters: [
                    { type: "document", document: { id: mediaId } },
                  ],
                },
                {
                  type: "body",
                  parameters: [{ type: "text", text: trackingText }],
                },
              ],
            },
          }),
        }
      );

      if (!res.ok) {
        return { ok: false, error: await toApiError(res) };
      }

      const data = (await res.json()) as { messages?: { id: string }[] };
      const messageId = data.messages?.[0]?.id;
      if (!messageId) {
        return {
          ok: false,
          error: new WhatsAppApiError(
            "Meta accepted the request but returned no message id",
            res.status
          ),
        };
      }

      return { ok: true, messageId };
    },
  };
}
