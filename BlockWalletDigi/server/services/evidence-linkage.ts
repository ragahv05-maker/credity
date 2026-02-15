import crypto from 'crypto';

export type AnchorStatus = 'missing' | 'pending' | 'confirmed' | 'failed';

export interface EvidenceLinkage {
  url: string;
  media_type: 'image' | 'video' | 'document';
  uploaded_at?: string;
  proof_metadata_hash: string;
  /** Claims/evidence uploads are not revocable credentials today; reserved for VC status checks. */
  revocation_check: { status: 'not_applicable' } | { status: 'checked'; revoked: boolean; checked_at: string; provider?: string };
  /** Optional onchain anchoring reference when available. */
  anchor: { status: AnchorStatus; chain?: string; tx_hash?: string };
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

export function computeProofMetadataHash(input: {
  url: string;
  mediaType: EvidenceLinkage['media_type'];
  uploadedAt?: string;
  metadata?: Record<string, unknown>;
}): string {
  // Deliberately excludes timestamps generated server-side so the hash is deterministic for the same payload.
  const payload = {
    url: input.url,
    media_type: input.mediaType,
    uploaded_at: input.uploadedAt ?? null,
    metadata: input.metadata ?? {},
  };
  const canonical = canonicalize(payload);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function buildEvidenceLinkage(input: {
  url: string;
  mediaType: EvidenceLinkage['media_type'];
  uploadedAt?: string;
  metadata?: Record<string, unknown>;
  anchorTxHash?: string;
  anchorChain?: string;
  anchorStatus?: AnchorStatus;
}): EvidenceLinkage {
  return {
    url: input.url,
    media_type: input.mediaType,
    uploaded_at: input.uploadedAt,
    proof_metadata_hash: computeProofMetadataHash({
      url: input.url,
      mediaType: input.mediaType,
      uploadedAt: input.uploadedAt,
      metadata: input.metadata,
    }),
    revocation_check: { status: 'not_applicable' },
    anchor: {
      status: input.anchorStatus ?? (input.anchorTxHash ? 'confirmed' : 'missing'),
      chain: input.anchorChain,
      tx_hash: input.anchorTxHash,
    },
  };
}
