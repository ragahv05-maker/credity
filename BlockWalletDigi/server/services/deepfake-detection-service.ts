import { z } from "zod";
import { retry } from "../utils/retry";

export interface DeepfakeDetectionResult {
  verdict: "real" | "fake" | "unknown";
  confidence: number | null;
  provider: string;
  reason?: string;
}

const requestSchema = z.string().url();

export async function detectDeepfakeFromUrl(
  url: string,
): Promise<DeepfakeDetectionResult> {
  const endpoint = process.env.DEEPFAKE_API_URL;
  const apiKey = process.env.DEEPFAKE_API_KEY;

  try {
    requestSchema.parse(url);
  } catch {
    return {
      verdict: "unknown",
      confidence: null,
      provider: "validation",
      reason: "invalid_url",
    };
  }

  if (!endpoint || !apiKey) {
    return {
      verdict: "unknown",
      confidence: null,
      provider: "not_configured",
      reason: "DEEPFAKE_API_URL or DEEPFAKE_API_KEY not configured",
    };
  }

  try {
    const response = await retry(
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          Number(process.env.DEEPFAKE_TIMEOUT_MS || 5000),
        );
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ url }),
          });
          if (res.status >= 500) throw new Error(`provider_http_${res.status}`);
          return res;
        } finally {
          clearTimeout(timeout);
        }
      },
      {
        maxRetries: Number(process.env.DEEPFAKE_RETRIES || 1),
        initialDelayMs: 250,
        retryCondition: (e) =>
          /provider_http_5|abort|network|fetch/i.test(e.message),
      },
    );

    if (!response.ok) {
      return {
        verdict: "unknown",
        confidence: null,
        provider: "remote_api",
        reason: `provider_http_${response.status}`,
      };
    }

    const data = await response.json();
    const score = typeof data.score === "number" ? data.score : null;
    const isFake =
      data.isFake === true || (typeof score === "number" && score >= 0.7);
    return {
      verdict: isFake ? "fake" : "real",
      confidence: score,
      provider: data.provider || "remote_api",
    };
  } catch (error: any) {
    return {
      verdict: "unknown",
      confidence: null,
      provider: "remote_api",
      reason: `provider_error:${error?.message || "request_failed"}`,
    };
  }
}
