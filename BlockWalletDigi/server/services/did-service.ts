import {
  generateEd25519KeyPair,
  toMultibase,
  sign,
  verify,
  encrypt,
  decrypt,
  generateEncryptionKey,
  sha256,
} from "./crypto-utils";

/**
 * DID Service for CredVerse Wallet
 * Implements did:key method for decentralized identifiers
 */

export interface DIDDocument {
  "@context": string[];
  id: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  assertionMethod: string[];
  keyAgreement?: string[];
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase: string;
}

export interface DIDKeyPair {
  did: string;
  publicKey: string;
  encryptedPrivateKey: {
    ciphertext: string;
    iv: string;
    authTag: string;
  };
  algorithm: string;
  createdAt: Date;
}

export interface DIDResolutionResult {
  didDocument: DIDDocument | null;
  didResolutionMetadata: {
    error?: string;
    contentType?: string;
  };
  didDocumentMetadata: {
    created?: string;
    updated?: string;
  };
}

/**
 * DID Service - handles DID creation, resolution, and key management
 */
export class DIDService {
  private encryptionKey: string;

  constructor() {
    // In production, this would come from secure environment or HSM
    this.encryptionKey =
      process.env.DID_ENCRYPTION_KEY || generateEncryptionKey();
  }

  /**
   * Create a new DID with keypair
   */
  async createDID(): Promise<DIDKeyPair> {
    const keyPair = generateEd25519KeyPair();

    // Create did:key identifier from public key
    const multibaseKey = toMultibase(keyPair.publicKey);
    const did = `did:key:${multibaseKey}`;

    // Encrypt private key for storage
    const encryptedPrivateKey = encrypt(keyPair.privateKey, this.encryptionKey);

    return {
      did,
      publicKey: keyPair.publicKey,
      encryptedPrivateKey,
      algorithm: keyPair.algorithm,
      createdAt: new Date(),
    };
  }

  /**
   * Resolve a DID to its DID Document
   */
  async resolveDID(did: string): Promise<DIDResolutionResult> {
    // Validate DID format
    if (!did.startsWith("did:key:")) {
      return {
        didDocument: null,
        didResolutionMetadata: { error: "invalidDid" },
        didDocumentMetadata: {},
      };
    }

    const multibaseKey = did.replace("did:key:", "");

    // Create verification method ID
    const verificationMethodId = `${did}#${multibaseKey}`;

    // Build DID Document
    const didDocument: DIDDocument = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/suites/ed25519-2020/v1",
      ],
      id: did,
      verificationMethod: [
        {
          id: verificationMethodId,
          type: "Ed25519VerificationKey2020",
          controller: did,
          publicKeyMultibase: multibaseKey,
        },
      ],
      authentication: [verificationMethodId],
      assertionMethod: [verificationMethodId],
    };

    return {
      didDocument,
      didResolutionMetadata: { contentType: "application/did+ld+json" },
      didDocumentMetadata: { created: new Date().toISOString() },
    };
  }

  /**
   * Sign data with DID's private key
   */
  async signWithDID(data: string, didKeyPair: DIDKeyPair): Promise<string> {
    // Decrypt private key
    const privateKey = decrypt(
      didKeyPair.encryptedPrivateKey,
      this.encryptionKey,
    );

    // Sign the data
    return sign(data, privateKey);
  }

  /**
   * Verify a signature against a DID
   */
  async verifySignature(
    data: string,
    signature: string,
    did: string,
    publicKey: string,
  ): Promise<boolean> {
    return verify(data, signature, publicKey);
  }

  /**
   * Create a Verifiable Presentation
   */
  async createPresentation(
    credentials: any[],
    didKeyPair: DIDKeyPair,
    domain?: string,
    challenge?: string,
  ): Promise<any> {
    const presentation = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiablePresentation"],
      holder: didKeyPair.did,
      verifiableCredential: credentials,
    };

    // Create proof
    const proofData = {
      ...presentation,
      domain,
      challenge,
      created: new Date().toISOString(),
    };

    const proof = {
      type: "Ed25519Signature2020",
      created: new Date().toISOString(),
      verificationMethod: `${didKeyPair.did}#${toMultibase(didKeyPair.publicKey)}`,
      proofPurpose: "authentication",
      domain,
      challenge,
      proofValue: await this.signWithDID(JSON.stringify(proofData), didKeyPair),
    };

    return {
      ...presentation,
      proof,
    };
  }

  /**
   * Get DID from public key
   */
  getDIDFromPublicKey(publicKey: string): string {
    const multibaseKey = toMultibase(publicKey);
    return `did:key:${multibaseKey}`;
  }

  /**
   * Hash credential for on-chain anchoring
   */
  hashCredential(credential: any): string {
    const canonical = JSON.stringify(
      credential,
      Object.keys(credential).sort(),
    );
    return sha256(canonical);
  }
}

// Singleton instance
export const didService = new DIDService();
