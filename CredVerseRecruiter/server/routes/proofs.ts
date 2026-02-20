import { Router } from 'express';
import crypto from 'crypto';
import { verifyAccessToken } from '../services/auth-service';
import {
  deterministicHash,
  parseCanonicalization,
  parseProofAlgorithm,
  type ProofAlgorithm,
  type ProofCanonicalization,
} from '../services/proof-lifecycle';
import { ProofVerificationError, verifyProofContract } from '../services/proof-verifier-service';

const router = Router();

const replayCache = new Map<string, number>();
const REPLAY_WINDOW_MS = Number(process.env.PROOF_REPLAY_WINDOW_MS || 10 * 60 * 1000);
const MAX_METADATA_BYTES = Number(process.env.PROOF_METADATA_MAX_BYTES || 128 * 1024);

function proofAuth(req: any, res: any, next: any): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ code: 'PROOF_AUTH_REQUIRED', error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice('Bearer '.length);
  const user = verifyAccessToken(token);
  if (!user) {
    res.status(401).json({ code: 'PROOF_AUTH_REQUIRED', error: 'Invalid or expired token' });
    return;
  }

  req.user = user;
  next();
}

function ensureRecruiter(req: any, res: any): boolean {
  if (!req.user) {
    res.status(401).json({ code: 'PROOF_AUTH_REQUIRED', error: 'Authentication required' });
    return false;
  }
  if (req.user.role !== 'recruiter' && req.user.role !== 'admin') {
    res.status(403).json({ code: 'PROOF_FORBIDDEN', error: 'Recruiter role required' });
    return false;
  }
  return true;
}

function isDid(value: unknown): boolean {
  return typeof value === 'string' && /^did:[a-z0-9]+:[A-Za-z0-9._:%-]+$/i.test(value);
}

function pruneReplayCache(now = Date.now()): void {
  for (const [key, ts] of replayCache.entries()) {
    if (now - ts > REPLAY_WINDOW_MS) replayCache.delete(key);
  }
}

router.post('/v1/proofs/metadata', proofAuth, (req, res) => {
  if (!ensureRecruiter(req, res)) return;

  const { credential, hash_algorithm: hashAlgorithm, canonicalization: canonicalizationRaw } = req.body || {};
  if (!credential || typeof credential !== 'object') {
    return res.status(400).json({ code: 'PROOF_METADATA_INPUT_INVALID', error: 'credential object is required' });
  }

  const bytes = Buffer.byteLength(JSON.stringify(credential), 'utf8');
  if (bytes > MAX_METADATA_BYTES) {
    return res.status(413).json({ code: 'PROOF_METADATA_TOO_LARGE', error: 'credential payload too large' });
  }

  try {
    const algorithm = parseProofAlgorithm(hashAlgorithm);
    const canonicalization = parseCanonicalization(canonicalizationRaw);
    const hash = deterministicHash(credential, algorithm, canonicalization);

    return res.json({
      code: 'PROOF_METADATA_READY',
      hash,
      hash_algorithm: algorithm,
      canonicalization,
    });
  } catch (error: any) {
    return res.status(400).json({ code: 'PROOF_METADATA_INPUT_INVALID', error: error?.message || 'Invalid payload' });
  }
});

router.post('/v1/proofs/verify', proofAuth, async (req, res) => {
  if (!ensureRecruiter(req, res)) return;

  const payload = req.body || {};

  if (payload.expected_issuer_did && !isDid(payload.expected_issuer_did)) {
    return res.status(400).json({ code: 'PROOF_INPUT_INVALID', error: 'expected_issuer_did must be a valid DID' });
  }
  if (payload.expected_subject_did && !isDid(payload.expected_subject_did)) {
    return res.status(400).json({ code: 'PROOF_INPUT_INVALID', error: 'expected_subject_did must be a valid DID' });
  }

  pruneReplayCache();
  const replayHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  if (replayCache.has(replayHash)) {
    return res.status(409).json({ code: 'PROOF_REPLAY_DETECTED', valid: false, reason_codes: ['PROOF_REPLAY_DETECTED'] });
  }

  try {
    const result = await verifyProofContract(payload);
    replayCache.set(replayHash, Date.now());
    return res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof ProofVerificationError) {
      return res.status(error.status).json({ code: error.code, error: error.message });
    }
    return res.status(500).json({ code: 'PROOF_VERIFY_FAILED', error: error?.message || 'Proof verification failed' });
  }
});

export default router;
