import crypto from "crypto";

// DigiSigner gateway (CLAUDE.md Phase 5). Code against an interface; isolate the
// vendor wire format. Simulated locally unless USE_SIMULATED_PROVIDERS=false.

const SIMULATED = process.env.USE_SIMULATED_PROVIDERS !== "false";

export interface SendFromTemplateParams {
  templateId: string; // DigiSigner template id
  signerEmail: string;
  signerName?: string;
  fields: Record<string, unknown>; // mapped CRM → field_api_ids
}

export interface SignatureGateway {
  sendFromTemplate(params: SendFromTemplateParams): Promise<{ requestId: string }>;
  getSignedDocument(requestId: string): Promise<{ url: string }>;
  sign(rawBody: string): string;
}

class SimulatedDigiSigner implements SignatureGateway {
  async sendFromTemplate(params: SendFromTemplateParams): Promise<{ requestId: string }> {
    return { requestId: `ds_${params.templateId}_${Date.now().toString(36)}` };
  }
  async getSignedDocument(requestId: string): Promise<{ url: string }> {
    return { url: `/api/documents/signed/${requestId}.pdf` };
  }
  sign(rawBody: string): string {
    const secret = process.env.DIGISIGNER_WEBHOOK_SECRET ?? "";
    return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  }
}

class LiveDigiSigner implements SignatureGateway {
  // >>> FILL IN <<< real DigiSigner HTTP calls (DIGISIGNER_API_KEY) here.
  async sendFromTemplate(): Promise<{ requestId: string }> {
    throw new Error("DigiSigner live mode not configured");
  }
  async getSignedDocument(): Promise<{ url: string }> {
    throw new Error("DigiSigner live mode not configured");
  }
  sign(rawBody: string): string {
    const secret = process.env.DIGISIGNER_WEBHOOK_SECRET ?? "";
    return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  }
}

export const digisigner: SignatureGateway = SIMULATED
  ? new SimulatedDigiSigner()
  : new LiveDigiSigner();
