import crypto from "crypto";

/**
 * Crypto utilities for CredVerse Wallet
 * Provides encryption, signing, and key management
 */

// AES-256-GCM encryption
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  algorithm: "Ed25519" | "secp256k1";
}

/**
 * Generate a random encryption key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString("hex");
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(plaintext: string, keyHex: string): EncryptedData {
  const key = Buffer.from(keyHex, "hex");
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(encrypted: EncryptedData, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(encrypted.iv, "hex");
  const authTag = Buffer.from(encrypted.authTag, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(encrypted.ciphertext, "hex", "utf8");
  plaintext += decipher.final("utf8");

  return plaintext;
}

/**
 * Generate Ed25519 keypair for DIDs
 */
export function generateEd25519KeyPair(): KeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");

  return {
    publicKey: publicKey
      .export({ type: "spki", format: "der" })
      .toString("base64url"),
    privateKey: privateKey
      .export({ type: "pkcs8", format: "der" })
      .toString("base64url"),
    algorithm: "Ed25519",
  };
}

/**
 * Sign data using Ed25519 private key
 */
export function sign(data: string, privateKeyBase64: string): string {
  const privateKeyDer = Buffer.from(privateKeyBase64, "base64url");
  const privateKey = crypto.createPrivateKey({
    key: privateKeyDer,
    format: "der",
    type: "pkcs8",
  });

  const signature = crypto.sign(null, Buffer.from(data), privateKey);
  return signature.toString("base64url");
}

/**
 * Verify signature using Ed25519 public key
 */
export function verify(
  data: string,
  signature: string,
  publicKeyBase64: string,
): boolean {
  try {
    const publicKeyDer = Buffer.from(publicKeyBase64, "base64url");
    const publicKey = crypto.createPublicKey({
      key: publicKeyDer,
      format: "der",
      type: "spki",
    });

    return crypto.verify(
      null,
      Buffer.from(data),
      publicKey,
      Buffer.from(signature, "base64url"),
    );
  } catch {
    return false;
  }
}

/**
 * Hash data using SHA-256
 */
export function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Generate a multibase-encoded public key (for did:key)
 */
export function toMultibase(publicKey: string): string {
  // Ed25519 multicodec prefix: 0xed01
  const multicodecPrefix = Buffer.from([0xed, 0x01]);
  const publicKeyBytes = Buffer.from(publicKey, "base64url");
  const multicodec = Buffer.concat([multicodecPrefix, publicKeyBytes]);

  // Base58btc encoding with 'z' prefix
  return "z" + base58Encode(multicodec);
}

/**
 * Simple Base58 encoding (Bitcoin alphabet)
 */
function base58Encode(buffer: Buffer): string {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

  let num = BigInt("0x" + buffer.toString("hex"));
  let result = "";

  while (num > 0) {
    const remainder = Number(num % BigInt(58));
    num = num / BigInt(58);
    result = ALPHABET[remainder] + result;
  }

  // Handle leading zeros
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    result = "1" + result;
  }

  return result;
}

/**
 * Generate a random nonce
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Generate a time-limited access token
 */
export function generateAccessToken(
  payload: object,
  expiryMinutes: number,
): { token: string; expiry: Date } {
  const expiry = new Date(Date.now() + expiryMinutes * 60 * 1000);
  const tokenData = {
    ...payload,
    exp: expiry.getTime(),
    nonce: generateNonce(),
  };

  const token = Buffer.from(JSON.stringify(tokenData)).toString("base64url");
  return { token, expiry };
}

/**
 * Validate access token
 */
export function validateAccessToken(token: string): {
  valid: boolean;
  payload?: any;
  expired?: boolean;
} {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64url").toString());

    if (payload.exp && Date.now() > payload.exp) {
      return { valid: false, expired: true };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}
