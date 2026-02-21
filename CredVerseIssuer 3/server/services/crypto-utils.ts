import crypto from "crypto";

/**
 * Crypto utilities for CredVerse Issuer
 * Provides Ed25519 signing for Verifiable Credentials
 */

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  algorithm: "Ed25519";
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
}

// AES-256-GCM encryption
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

/**
 * Generate Ed25519 keypair for issuer signing
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
