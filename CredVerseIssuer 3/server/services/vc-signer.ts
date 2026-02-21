import {
  sign,
  verify,
  generateEd25519KeyPair,
  sha256,
  encrypt,
  decrypt,
  type EncryptedData,
} from "./crypto-utils";

/**
 * VC Signer Service for CredVerse Issuer
 * Handles cryptographic signing of Verifiable Credentials using Ed25519
 *
 * Key management notes:
 * - In production, ISSUER_KEY_ENCRYPTION must be a strong 64-char hex secret.
 * - To support encryption-key rotation without breaking existing keys, older
 *   keys can be supplied via ISSUER_KEY_ENCRYPTION_PREVIOUS (comma-separated).
 */

interface IssuerSigningKey {
  kid: string;
  publicKey: string;
  encryptedPrivateKey: EncryptedData;
  createdAt: Date;
  retiredAt?: Date;
}

interface IssuerKeyStore {
  activeKid: string;
  keys: IssuerSigningKey[];
  createdAt: Date;
  updatedAt: Date;
}

// In-memory key store (in production, use secure vault like HashiCorp Vault)
const issuerKeys = new Map<string, IssuerKeyStore>();

const DEV_FALLBACK_ENCRYPTION_KEY = "0".repeat(64);

function isValidHexKey(value: string | undefined): value is string {
  return typeof value === "string" && /^[a-fA-F0-9]{64}$/.test(value);
}

function parseLegacyKeys(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

const configuredPrimaryEncryptionKey =
  process.env.ISSUER_KEY_ENCRYPTION?.trim();
const configuredLegacyEncryptionKeys = parseLegacyKeys(
  process.env.ISSUER_KEY_ENCRYPTION_PREVIOUS,
);
const isProduction = process.env.NODE_ENV === "production";

let warnedAboutUnsafeDefaults = false;

function resolveEncryptionKeyRing(): {
  activeKey: string;
  fallbackKeys: string[];
} {
  const validLegacyKeys = configuredLegacyEncryptionKeys.filter(isValidHexKey);
  const invalidLegacyCount =
    configuredLegacyEncryptionKeys.length - validLegacyKeys.length;

  if (invalidLegacyCount > 0) {
    console.warn(
      "[VCSigner] Ignoring invalid entries in ISSUER_KEY_ENCRYPTION_PREVIOUS (expected 64-char hex values).",
    );
  }

  if (isValidHexKey(configuredPrimaryEncryptionKey)) {
    const dedupedFallbacks = validLegacyKeys.filter(
      (key) => key !== configuredPrimaryEncryptionKey,
    );
    if (
      configuredPrimaryEncryptionKey === DEV_FALLBACK_ENCRYPTION_KEY &&
      isProduction
    ) {
      throw new Error(
        "FATAL: ISSUER_KEY_ENCRYPTION must not use an unsafe default value in production",
      );
    }
    return {
      activeKey: configuredPrimaryEncryptionKey,
      fallbackKeys: dedupedFallbacks,
    };
  }

  if (isProduction) {
    throw new Error(
      "FATAL: ISSUER_KEY_ENCRYPTION must be set to a valid 64-char hex key in production",
    );
  }

  if (!warnedAboutUnsafeDefaults) {
    warnedAboutUnsafeDefaults = true;
    if (configuredPrimaryEncryptionKey) {
      console.warn(
        "[VCSigner] WARNING: Invalid ISSUER_KEY_ENCRYPTION in development; falling back to unsafe default.",
      );
    } else {
      console.warn(
        "[VCSigner] WARNING: ISSUER_KEY_ENCRYPTION is unset; using unsafe development fallback key.",
      );
    }
    console.warn(
      "[VCSigner] WARNING: Set ISSUER_KEY_ENCRYPTION (and optional ISSUER_KEY_ENCRYPTION_PREVIOUS) to test rotation paths.",
    );
  }

  return {
    activeKey: DEV_FALLBACK_ENCRYPTION_KEY,
    fallbackKeys: validLegacyKeys,
  };
}

const ENCRYPTION_KEY_RING = resolveEncryptionKeyRing();

function decryptWithAnyKnownKey(encrypted: EncryptedData): string {
  const candidates = [
    ENCRYPTION_KEY_RING.activeKey,
    ...ENCRYPTION_KEY_RING.fallbackKeys,
  ];

  for (const key of candidates) {
    try {
      return decrypt(encrypted, key);
    } catch {
      // try next key
    }
  }

  throw new Error(
    "Unable to decrypt issuer private key with active or legacy encryption keys",
  );
}

function buildKid(issuerId: string, sequence: number): string {
  return `${issuerId}#keys-${sequence}`;
}

function createSigningKey(
  issuerId: string,
  sequence: number,
): IssuerSigningKey {
  const keyPair = generateEd25519KeyPair();
  return {
    kid: buildKid(issuerId, sequence),
    publicKey: keyPair.publicKey,
    encryptedPrivateKey: encrypt(
      keyPair.privateKey,
      ENCRYPTION_KEY_RING.activeKey,
    ),
    createdAt: new Date(),
  };
}

function getOrCreateIssuerStore(issuerId: string): IssuerKeyStore {
  const existing = issuerKeys.get(issuerId);
  if (existing) return existing;

  const initialKey = createSigningKey(issuerId, 1);
  const store: IssuerKeyStore = {
    activeKid: initialKey.kid,
    keys: [initialKey],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  issuerKeys.set(issuerId, store);
  console.log(
    `[VCSigner] Generated initial keypair for issuer ${issuerId} (${initialKey.kid})`,
  );
  return store;
}

/**
 * Get or create active issuer keypair
 */
export function getOrCreateIssuerKey(issuerId: string): {
  kid: string;
  publicKey: string;
  privateKey: string;
} {
  const keyStore = getOrCreateIssuerStore(issuerId);
  const activeKey = keyStore.keys.find(
    (entry) => entry.kid === keyStore.activeKid,
  );

  if (!activeKey) {
    throw new Error(
      `Active key ${keyStore.activeKid} not found for issuer ${issuerId}`,
    );
  }

  return {
    kid: activeKey.kid,
    publicKey: activeKey.publicKey,
    privateKey: decryptWithAnyKnownKey(activeKey.encryptedPrivateKey),
  };
}

/**
 * Rotate issuer signing key (keeps historical public keys for verification)
 */
export function rotateIssuerSigningKey(issuerId: string): {
  kid: string;
  publicKey: string;
  createdAt: Date;
} {
  const keyStore = getOrCreateIssuerStore(issuerId);
  const sequence = keyStore.keys.length + 1;

  const existingActive = keyStore.keys.find(
    (entry) => entry.kid === keyStore.activeKid,
  );
  if (existingActive) {
    existingActive.retiredAt = new Date();
  }

  const nextKey = createSigningKey(issuerId, sequence);
  keyStore.keys.push(nextKey);
  keyStore.activeKid = nextKey.kid;
  keyStore.updatedAt = new Date();

  console.warn(
    `[VCSigner] Rotated signing key for issuer ${issuerId}. New active key: ${nextKey.kid}`,
  );

  return {
    kid: nextKey.kid,
    publicKey: nextKey.publicKey,
    createdAt: nextKey.createdAt,
  };
}

/**
 * Re-encrypt all in-memory issuer private keys using the currently active encryption key.
 * Useful after updating ISSUER_KEY_ENCRYPTION + ISSUER_KEY_ENCRYPTION_PREVIOUS.
 */
export function rotateIssuerEncryptionKeys(): {
  issuersUpdated: number;
  keysReencrypted: number;
} {
  let issuersUpdated = 0;
  let keysReencrypted = 0;

  for (const [, keyStore] of issuerKeys) {
    let storeChanged = false;

    keyStore.keys = keyStore.keys.map((entry) => {
      const privateKey = decryptWithAnyKnownKey(entry.encryptedPrivateKey);
      keysReencrypted += 1;
      storeChanged = true;
      return {
        ...entry,
        encryptedPrivateKey: encrypt(privateKey, ENCRYPTION_KEY_RING.activeKey),
      };
    });

    if (storeChanged) {
      keyStore.updatedAt = new Date();
      issuersUpdated += 1;
    }
  }

  if (issuersUpdated > 0) {
    console.warn(
      `[VCSigner] Re-encrypted ${keysReencrypted} signing keys across ${issuersUpdated} issuers using active encryption key.`,
    );
  }

  return { issuersUpdated, keysReencrypted };
}

/**
 * Sign a VC-JWT with Ed25519
 * Creates a proper JWT with cryptographic signature
 */
export async function signVcJwt(
  payload: any,
  issuerDid: string,
): Promise<string> {
  const { privateKey, kid } = getOrCreateIssuerKey(issuerDid);

  const header = {
    alg: "EdDSA",
    typ: "JWT",
    kid,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    "base64url",
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = sign(signingInput, privateKey);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify a VC-JWT signature
 */
export async function verifyVcJwt(
  jwt: string,
  publicKey: string,
): Promise<{ valid: boolean; payload?: any; error?: string }> {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) {
      return { valid: false, error: "Invalid JWT format" };
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const isValid = verify(signingInput, signature, publicKey);

    if (!isValid) {
      return { valid: false, error: "Invalid signature" };
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString(),
    );

    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return { valid: false, error: "Token expired" };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: "Failed to verify JWT" };
  }
}

/**
 * Get issuer public key by optional key id.
 * If kid is omitted, returns active key.
 */
export function getIssuerPublicKey(
  issuerId: string,
  kid?: string,
): string | null {
  const keyStore = issuerKeys.get(issuerId);
  if (!keyStore) return null;

  const resolvedKid = kid || keyStore.activeKid;
  const key = keyStore.keys.find((entry) => entry.kid === resolvedKid);

  return key?.publicKey || null;
}

/**
 * Hash credential data for blockchain anchoring
 */
export function hashCredential(credentialData: any): string {
  const canonical = JSON.stringify(
    credentialData,
    Object.keys(credentialData).sort(),
  );
  return sha256(canonical);
}

/**
 * Small introspection helper for tests/diagnostics.
 */
export function getKeyManagementStatus(issuerId: string): {
  issuerId: string;
  activeKid: string | null;
  keyCount: number;
  encryptionFallbackKeys: number;
} {
  const keyStore = issuerKeys.get(issuerId);
  return {
    issuerId,
    activeKid: keyStore?.activeKid ?? null,
    keyCount: keyStore?.keys.length ?? 0,
    encryptionFallbackKeys: ENCRYPTION_KEY_RING.fallbackKeys.length,
  };
}
