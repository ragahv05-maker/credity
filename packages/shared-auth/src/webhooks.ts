import crypto from "crypto";

export interface SignedWebhookPayload {
  payload: string;
  timestamp: string;
  signature: string;
}

function hmac(secret: string, message: string): string {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

export function signWebhook(
  body: unknown,
  secret: string,
  timestamp = Date.now().toString(),
): SignedWebhookPayload {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  const signature = hmac(secret, `${timestamp}.${payload}`);
  return { payload, timestamp, signature };
}

export function verifyWebhookSignature(params: {
  rawBody: string;
  timestamp: string;
  signature: string;
  secret: string;
  toleranceSeconds?: number;
}): boolean {
  const tolerance = params.toleranceSeconds ?? 300;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const timestampSeconds = Math.floor(Number(params.timestamp) / 1000);

  if (!Number.isFinite(timestampSeconds)) {
    return false;
  }
  if (Math.abs(nowSeconds - timestampSeconds) > tolerance) {
    return false;
  }

  const expected = hmac(params.secret, `${params.timestamp}.${params.rawBody}`);
  const received = params.signature.toLowerCase().replace(/^sha256=/, "");
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");
  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
