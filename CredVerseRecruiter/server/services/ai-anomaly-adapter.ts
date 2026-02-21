type AIProviderName = "openai" | "gemini" | "deepseek" | "deterministic";

type AISignalSeverity = "low" | "medium" | "high";

export interface AIAnomalySignal {
  code: string;
  severity: AISignalSeverity;
  message: string;
}

export interface AIAnomalyInput {
  credential: Record<string, unknown>;
  ruleScore: number;
  ruleFlags: string[];
}

export interface AIAnomalyResult {
  version: "ai-risk-v1";
  provider: AIProviderName;
  score: number;
  confidence: number;
  summary: string;
  signals: AIAnomalySignal[];
  reason: string;
}

interface Provider {
  name: Exclude<AIProviderName, "deterministic">;
  score(input: AIAnomalyInput, signal: AbortSignal): Promise<AIAnomalyResult>;
}

interface ProviderOutput {
  score: number;
  confidence: number;
  summary: string;
  signals: Array<{
    code: string;
    severity: AISignalSeverity;
    message: string;
  }>;
}

const providerTimeoutMs = Number(
  process.env.AI_RISK_PROVIDER_TIMEOUT_MS || 3500,
);
const providerRetries = Number(process.env.AI_RISK_PROVIDER_RETRIES || 1);

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

function sanitizeSignals(signals: unknown): AIAnomalySignal[] {
  if (!Array.isArray(signals)) return [];
  return signals
    .filter((item) => item && typeof item === "object")
    .map((item) => item as Record<string, unknown>)
    .map((item) => {
      const rawSeverity =
        typeof item.severity === "string" ? item.severity.toLowerCase() : "low";
      const severity: AISignalSeverity =
        rawSeverity === "high" ||
        rawSeverity === "medium" ||
        rawSeverity === "low"
          ? rawSeverity
          : "low";
      return {
        code:
          typeof item.code === "string" && item.code.trim().length > 0
            ? item.code.trim()
            : "UNSPECIFIED_SIGNAL",
        severity,
        message:
          typeof item.message === "string" && item.message.trim().length > 0
            ? item.message.trim()
            : "No message provided",
      };
    })
    .slice(0, 8);
}

function parseJsonObjectFromText(text: string): ProviderOutput {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("provider_unparseable_response");

  const parsed = JSON.parse(match[0]) as Record<string, unknown>;
  return {
    score: clampScore(Number(parsed.score)),
    confidence: clampConfidence(Number(parsed.confidence)),
    summary:
      typeof parsed.summary === "string"
        ? parsed.summary
        : "No summary returned",
    signals: sanitizeSignals(parsed.signals),
  };
}

function buildPrompt(input: AIAnomalyInput): string {
  const credential = input.credential;
  const issuerRaw = credential.issuer;
  const issuer =
    typeof issuerRaw === "string"
      ? issuerRaw
      : issuerRaw && typeof issuerRaw === "object"
        ? String(
            (issuerRaw as Record<string, unknown>).id ||
              (issuerRaw as Record<string, unknown>).name ||
              "unknown",
          )
        : "unknown";

  const subjectRaw = credential.credentialSubject;
  const subject =
    subjectRaw && typeof subjectRaw === "object"
      ? String(
          (subjectRaw as Record<string, unknown>).id ||
            (subjectRaw as Record<string, unknown>).name ||
            "unknown",
        )
      : String(credential.sub || "unknown");

  const type = Array.isArray(credential.type)
    ? credential.type.filter((entry) => typeof entry === "string").join(",")
    : String(credential.type || "unknown");

  const snapshot = {
    issuer,
    subject,
    type,
    issuanceDate: credential.issuanceDate || credential.iat || null,
    expirationDate: credential.expirationDate || credential.exp || null,
    claimKeys:
      credential.credentialSubject &&
      typeof credential.credentialSubject === "object"
        ? Object.keys(
            credential.credentialSubject as Record<string, unknown>,
          ).slice(0, 20)
        : [],
    ruleScore: input.ruleScore,
    ruleFlags: input.ruleFlags,
  };

  return [
    "You are a credential fraud-risk copilot for a recruiter verification platform.",
    "Return ONLY JSON with this schema:",
    '{"score": number(0-100), "confidence": number(0-1), "summary": string, "signals": [{"code": string, "severity": "low"|"medium"|"high", "message": string}]}',
    "Guidelines:",
    "- Prioritize issuer trust, temporal anomalies, claim consistency, suspicious wording, and replay/tamper patterns.",
    "- Keep signals concise and machine-actionable.",
    "- Do not invent claims outside the provided snapshot.",
    `Snapshot: ${JSON.stringify(snapshot)}`,
  ].join("\n");
}

function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function fetchJson(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`provider_http_${response.status}`);
  }
  return response.json();
}

async function retry<T>(task: () => Promise<T>, retries: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("provider_failed");
}

function getProviderFromEnv(): Provider | undefined {
  if (process.env.OPENAI_API_KEY) {
    return {
      name: "openai",
      async score(input, signal) {
        const response = (await fetchJson(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: process.env.AI_RISK_OPENAI_MODEL || "gpt-4o-mini",
              messages: [{ role: "user", content: buildPrompt(input) }],
              temperature: 0,
            }),
          },
        )) as Record<string, unknown>;

        const text =
          (
            (
              response.choices as Array<Record<string, unknown>> | undefined
            )?.[0]?.message as Record<string, unknown> | undefined
          )?.content ?? "{}";

        return {
          version: "ai-risk-v1",
          provider: "openai",
          reason: "provider_scored",
          ...parseJsonObjectFromText(String(text)),
        };
      },
    };
  }

  if (process.env.GEMINI_API_KEY) {
    return {
      name: "gemini",
      async score(input, signal) {
        const response = (await fetchJson(
          `https://generativelanguage.googleapis.com/v1beta/models/${process.env.AI_RISK_GEMINI_MODEL || "gemini-1.5-flash"}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: buildPrompt(input) }] }],
              generationConfig: { temperature: 0 },
            }),
          },
        )) as Record<string, unknown>;

        const candidates = response.candidates as
          | Array<Record<string, unknown>>
          | undefined;
        const content = candidates?.[0]?.content as
          | Record<string, unknown>
          | undefined;
        const parts = content?.parts as
          | Array<Record<string, unknown>>
          | undefined;
        const text = parts?.[0]?.text ?? "{}";

        return {
          version: "ai-risk-v1",
          provider: "gemini",
          reason: "provider_scored",
          ...parseJsonObjectFromText(String(text)),
        };
      },
    };
  }

  if (process.env.DEEPSEEK_API_KEY) {
    return {
      name: "deepseek",
      async score(input, signal) {
        const response = (await fetchJson(
          "https://api.deepseek.com/v1/chat/completions",
          {
            method: "POST",
            signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
              model: process.env.AI_RISK_DEEPSEEK_MODEL || "deepseek-chat",
              messages: [{ role: "user", content: buildPrompt(input) }],
              temperature: 0,
            }),
          },
        )) as Record<string, unknown>;

        const text =
          (
            (
              response.choices as Array<Record<string, unknown>> | undefined
            )?.[0]?.message as Record<string, unknown> | undefined
          )?.content ?? "{}";

        return {
          version: "ai-risk-v1",
          provider: "deepseek",
          reason: "provider_scored",
          ...parseJsonObjectFromText(String(text)),
        };
      },
    };
  }

  return undefined;
}

function deterministicAnomaly(input: AIAnomalyInput): AIAnomalyResult {
  const seed = JSON.stringify({
    issuer: input.credential.issuer,
    type: input.credential.type,
    subject: input.credential.credentialSubject,
    ruleScore: input.ruleScore,
    ruleFlags: input.ruleFlags,
  });

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const ratio = Math.abs(hash % 1000) / 1000;
  const score = clampScore(input.ruleScore * 0.65 + ratio * 35);

  const signals: AIAnomalySignal[] = input.ruleFlags
    .slice(0, 4)
    .map((flag) => ({
      code: flag,
      severity:
        flag.includes("REVOKED") || flag.includes("INVALID")
          ? "high"
          : "medium",
      message: `Correlated with rule flag ${flag}`,
    }));

  return {
    version: "ai-risk-v1",
    provider: "deterministic",
    score,
    confidence: 0.58,
    summary:
      "Deterministic anomaly estimator used (external AI provider unavailable).",
    signals,
    reason: "deterministic_fallback",
  };
}

export async function analyzeCredentialAnomalyRisk(
  input: AIAnomalyInput,
): Promise<AIAnomalyResult> {
  const provider = getProviderFromEnv();
  if (!provider) {
    return deterministicAnomaly(input);
  }

  try {
    const result = await retry(
      () => provider.score(input, timeoutSignal(providerTimeoutMs)),
      providerRetries,
    );
    return {
      ...result,
      score: clampScore(result.score),
      confidence: clampConfidence(result.confidence),
      signals: sanitizeSignals(result.signals),
      summary: result.summary?.trim() || "AI anomaly analysis completed.",
    };
  } catch (error) {
    console.warn(
      "[AIAnomaly] Provider failed, falling back:",
      error instanceof Error ? error.message : "unknown_error",
    );
    return deterministicAnomaly(input);
  }
}
