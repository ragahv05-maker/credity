import { z } from 'zod';

const sidecarTimeoutMs = Number(process.env.MODEL_SIDECAR_TIMEOUT_MS || 5000);

const embeddingSchema = z.array(z.number().finite()).min(4);

const livenessInferenceSchema = z.object({
  isReal: z.boolean(),
  confidence: z.number().min(0).max(1),
  spoofingDetected: z.boolean(),
  faceDetected: z.boolean(),
  reasoning: z.string().min(1),
  embedding: embeddingSchema.optional(),
});

function requireSidecarConfig(): { url: string; apiKey: string } {
  const url = process.env.MODEL_SIDECAR_URL;
  const apiKey = process.env.MODEL_SIDECAR_API_KEY;
  if (!url || !apiKey) {
    throw new Error('model_sidecar_not_configured');
  }
  return { url, apiKey };
}

async function postSidecar(path: string, payload: unknown): Promise<unknown> {
  const { url, apiKey } = requireSidecarConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), sidecarTimeoutMs);
  try {
    const res = await fetch(`${url}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`model_sidecar_http_${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function inferLivenessAndEmbedding(input: {
  frameData: string;
  challengeType: string;
  cameraEvidence: Record<string, unknown>;
  sessionId: string;
  userId: string;
}): Promise<z.infer<typeof livenessInferenceSchema>> {
  const payload = await postSidecar('/v1/biometrics/liveness-infer', input);
  return livenessInferenceSchema.parse(payload);
}

export async function extractEmbedding(input: {
  frameData: string;
  source: 'enrollment' | 'verification';
  sessionId?: string;
  userId: string;
}): Promise<number[]> {
  const payload = await postSidecar('/v1/biometrics/embedding-extract', input);
  return embeddingSchema.parse((payload as any)?.embedding);
}
