import crypto from "crypto";
import jwt, { JwtHeader } from "jsonwebtoken";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";
const MAX_TOKEN_BYTES = 8 * 1024;
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;

type AppleSigningJwk = {
  kid: string;
  kty: "RSA";
  alg?: string;
  use?: string;
  n: string;
  e: string;
};

export interface AppleIdentityPayload {
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  email?: string;
  email_verified?: "true" | "false" | boolean;
  sub?: string;
  nonce?: string;
}

let jwksCache: { keys: AppleSigningJwk[]; expiresAt: number } | null = null;

function decodeJwtHeader(token: string): JwtHeader {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded !== "object" || !("header" in decoded)) {
    throw new Error("Invalid Apple identity token header");
  }

  return decoded.header as JwtHeader;
}

function parseJwksPayload(payload: unknown): AppleSigningJwk[] {
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray((payload as { keys?: unknown[] }).keys)
  ) {
    throw new Error("Invalid Apple JWKS payload");
  }

  return (payload as { keys: unknown[] }).keys.filter(
    (key): key is AppleSigningJwk => {
      if (!key || typeof key !== "object") return false;
      const candidate = key as Partial<AppleSigningJwk>;
      return (
        candidate.kty === "RSA" &&
        typeof candidate.kid === "string" &&
        typeof candidate.n === "string" &&
        typeof candidate.e === "string"
      );
    },
  );
}

async function fetchAppleJwks(
  forceRefresh = false,
): Promise<AppleSigningJwk[]> {
  const now = Date.now();
  if (!forceRefresh && jwksCache && jwksCache.expiresAt > now) {
    return jwksCache.keys;
  }

  const response = await fetch(APPLE_JWKS_URL);
  if (!response.ok) {
    throw new Error(`Unable to fetch Apple JWKS (${response.status})`);
  }

  const raw = await response.json();
  const keys = parseJwksPayload(raw);
  if (keys.length === 0) {
    throw new Error("Apple JWKS returned no usable signing keys");
  }

  jwksCache = {
    keys,
    expiresAt: now + JWKS_CACHE_TTL_MS,
  };

  return keys;
}

function findJwkByKid(
  keys: AppleSigningJwk[],
  kid: string,
): AppleSigningJwk | null {
  return (
    keys.find((key) => key.kid === kid && (!key.use || key.use === "sig")) ??
    null
  );
}

function createApplePublicKeyFromJwk(jwk: AppleSigningJwk): crypto.KeyObject {
  return crypto.createPublicKey({
    key: {
      kty: "RSA",
      kid: jwk.kid,
      n: jwk.n,
      e: jwk.e,
    },
    format: "jwk",
  });
}

export function createAppleAuthState(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function getAppleAuthorizationUrl(state: string): string {
  const clientId = process.env.APPLE_CLIENT_ID;
  const redirectUri = process.env.APPLE_CALLBACK_URL;

  if (!clientId || !redirectUri) {
    throw new Error("Apple OAuth is not configured");
  }

  const params = new URLSearchParams({
    response_type: "code id_token",
    response_mode: "form_post",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "name email",
    state,
  });

  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

export async function verifyAppleIdentityToken(
  identityToken: string,
): Promise<AppleIdentityPayload> {
  if (!identityToken || typeof identityToken !== "string") {
    throw new Error("identityToken is required");
  }

  if (Buffer.byteLength(identityToken, "utf8") > MAX_TOKEN_BYTES) {
    throw new Error("Apple identity token too large");
  }

  const expectedAudience = process.env.APPLE_CLIENT_ID;
  if (!expectedAudience) {
    throw new Error("Apple OAuth is not configured");
  }

  const header = decodeJwtHeader(identityToken);
  if (header.alg !== "RS256") {
    throw new Error("Unsupported Apple token algorithm");
  }
  if (!header.kid) {
    throw new Error("Apple token missing key id");
  }

  let keys = await fetchAppleJwks(false);
  let key = findJwkByKid(keys, header.kid);

  if (!key) {
    keys = await fetchAppleJwks(true);
    key = findJwkByKid(keys, header.kid);
  }

  if (!key) {
    throw new Error("Apple signing key not found");
  }

  const publicKey = createApplePublicKeyFromJwk(key);
  const payload = jwt.verify(identityToken, publicKey, {
    algorithms: ["RS256"],
    issuer: APPLE_ISSUER,
    audience: expectedAudience,
  }) as AppleIdentityPayload;

  if (!payload.sub) {
    throw new Error("Apple subject is required");
  }

  return payload;
}

export function __test_resetAppleJwksCache(): void {
  jwksCache = null;
}
