import { retry } from "../utils/retry";

export interface ConfidenceScoringInput {
  claimType: string;
  claimAmount?: number;
  description: string;
  timelineCount: number;
  evidenceCount: number;
}

export interface ConfidenceScoringResult {
  version: "confidence-v1";
  provider: "deepseek" | "gemini" | "openai" | "deterministic";
  confidence: number;
  reason: string;
}

interface ConfidenceProvider {
  name: "deepseek" | "gemini" | "openai";
  score(input: ConfidenceScoringInput, signal: AbortSignal): Promise<number>;
}

interface ScoreOptions {
  timeoutMs?: number;
  retries?: number;
  provider?: ConfidenceProvider;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function deterministicConfidence(input: ConfidenceScoringInput): number {
  const seed = `${input.claimType}|${input.claimAmount ?? 0}|${input.timelineCount}|${input.evidenceCount}|${input.description.slice(0, 512)}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const ratio = Math.abs(hash % 1000) / 1000;
  return Number((0.45 + ratio * 0.5).toFixed(3));
}

function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function fetchJson(url: string, init: RequestInit): Promise<any> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`provider_http_${response.status}`);
  return response.json();
}

function parseConfidenceFromText(text: string): number {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("provider_unparseable_response");
  const parsed = JSON.parse(match[0]);
  return clamp01(Number(parsed.confidence));
}

function buildPrompt(input: ConfidenceScoringInput): string {
  return [
    'Return ONLY JSON: {"confidence": number}.',
    "Estimate authenticity confidence (0..1) for this claim description.",
    `claimType=${input.claimType}`,
    `claimAmount=${input.claimAmount ?? 0}`,
    `timelineCount=${input.timelineCount}`,
    `evidenceCount=${input.evidenceCount}`,
    `description=${input.description}`,
  ].join("\n");
}

function getProviderFromEnv(): ConfidenceProvider | undefined {
  const promptFor = (input: ConfidenceScoringInput) => buildPrompt(input);

  if (process.env.DEEPSEEK_API_KEY) {
    return {
      name: "deepseek",
      async score(input, signal) {
        const data = await fetchJson(
          "https://api.deepseek.com/v1/chat/completions",
          {
            method: "POST",
            signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
              model: "deepseek-chat",
              messages: [{ role: "user", content: promptFor(input) }],
              temperature: 0,
            }),
          },
        );
        return parseConfidenceFromText(
          data?.choices?.[0]?.message?.content ?? "{}",
        );
      },
    };
  }

  if (process.env.GEMINI_API_KEY) {
    return {
      name: "gemini",
      async score(input, signal) {
        const data = await fetchJson(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptFor(input) }] }],
              generationConfig: { temperature: 0 },
            }),
          },
        );
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
        return parseConfidenceFromText(text);
      },
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      name: "openai",
      async score(input, signal) {
        const data = await fetchJson(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: promptFor(input) }],
              temperature: 0,
            }),
          },
        );
        return parseConfidenceFromText(
          data?.choices?.[0]?.message?.content ?? "{}",
        );
      },
    };
  }

  return undefined;
}

export async function scoreClaimConfidence(
  input: ConfidenceScoringInput,
  options: ScoreOptions = {},
): Promise<ConfidenceScoringResult> {
  const timeoutMs =
    options.timeoutMs ??
    Number(process.env.CONFIDENCE_PROVIDER_TIMEOUT_MS || 3500);
  const retries =
    options.retries ?? Number(process.env.CONFIDENCE_PROVIDER_RETRIES || 1);
  const provider = options.provider ?? getProviderFromEnv();

  if (provider) {
    try {
      const confidence = await retry(
        () => provider.score(input, timeoutSignal(timeoutMs)),
        {
          maxRetries: retries,
          initialDelayMs: 100,
          maxDelayMs: 500,
          retryCondition: (error) =>
            /provider_http_5|abort|timeout|fetch|network/i.test(error.message),
        },
      );

      return {
        version: "confidence-v1",
        provider: provider.name,
        confidence: clamp01(confidence),
        reason: "provider_scored",
      };
    } catch (error) {
      console.warn(
        "[ConfidenceScoring] Provider failed, using deterministic fallback:",
        (error as Error).message,
      );
    }
  }

  return {
    version: "confidence-v1",
    provider: "deterministic",
    confidence: deterministicConfidence(input),
    reason: "deterministic_fallback",
  };
}
