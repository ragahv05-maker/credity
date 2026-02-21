export type SynthIdVerdict =
  | "watermark_detected"
  | "not_detected"
  | "unsupported"
  | "unavailable"
  | "error";

export interface SynthIdAssessment {
  version: "synthid-v1";
  verdict: SynthIdVerdict;
  confidence: number | null;
  provider: "google_synthid" | "not_configured" | "fallback";
  reason: string;
}

export interface SynthIdInput {
  mediaType: "image" | "video" | "document";
  url: string;
  metadata?: Record<string, unknown>;
}

interface DetectorResponse {
  verdict?: string;
  confidence?: number;
}

const DEFAULT_TIMEOUT_MS = Number(process.env.SYNTHID_TIMEOUT_MS || 2500);

function clampConfidence(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

function timeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

function unavailable(reason: string): SynthIdAssessment {
  return {
    version: "synthid-v1",
    verdict: "unavailable",
    confidence: null,
    provider: "not_configured",
    reason,
  };
}

export async function assessSynthIdWatermark(
  input: SynthIdInput,
  options?: { endpoint?: string; apiKey?: string; timeoutMs?: number },
): Promise<SynthIdAssessment> {
  if (input.mediaType === "document") {
    return {
      version: "synthid-v1",
      verdict: "unsupported",
      confidence: null,
      provider: "fallback",
      reason:
        "SynthID watermark checks apply to AI-generated media, not scanned documents.",
    };
  }

  const endpoint = options?.endpoint ?? process.env.SYNTHID_DETECTOR_ENDPOINT;
  const apiKey = options?.apiKey ?? process.env.SYNTHID_API_KEY;

  if (!endpoint) {
    return unavailable("Detector endpoint not configured.");
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: timeoutSignal(options?.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        url: input.url,
        mediaType: input.mediaType,
        metadata: input.metadata || {},
      }),
    });

    if (!response.ok) {
      return {
        version: "synthid-v1",
        verdict: "error",
        confidence: null,
        provider: "fallback",
        reason: `Detector returned HTTP ${response.status}`,
      };
    }

    const parsed = (await response.json()) as DetectorResponse;
    const verdict = parsed.verdict;

    if (
      verdict !== "watermark_detected" &&
      verdict !== "not_detected" &&
      verdict !== "unsupported"
    ) {
      return {
        version: "synthid-v1",
        verdict: "error",
        confidence: null,
        provider: "fallback",
        reason: "Detector response schema unsupported.",
      };
    }

    return {
      version: "synthid-v1",
      verdict,
      confidence: clampConfidence(parsed.confidence),
      provider: "google_synthid",
      reason: "Detector response accepted.",
    };
  } catch (error) {
    return {
      version: "synthid-v1",
      verdict: "unavailable",
      confidence: null,
      provider: "fallback",
      reason: error instanceof Error ? error.message : "detector_error",
    };
  }
}
