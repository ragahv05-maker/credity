/**
 * Evidence Service
 * Implements PRD v3.1 Layer 3: Evidence Authentication
 *
 * Features:
 * - Evidence upload handling
 * - EXIF metadata extraction
 * - Blockchain hash generation
 * - Basic manipulation detection
 */

import * as crypto from "crypto";
import { detectDeepfakeFromUrl } from "./deepfake-detection-service";

export interface EvidenceUploadRequest {
  userId: string;
  claimId?: string;
  mediaType: "image" | "video" | "document";
  url: string;
  metadata?: Record<string, any>;
}

export interface EvidenceAnalysisResult {
  authenticityScore: number;
  isAiGenerated: boolean;
  manipulationDetected: boolean;
  blockchainHash: string;
  metadataExtracted: Record<string, any>;
  analysisDetails: {
    exifPresent: boolean;
    timestampValid: boolean;
    locationPresent: boolean;
    softwareDetected: string | null;
    formatConsistent: boolean;
  };
  aiDetection: {
    verdict: "real" | "fake" | "unknown";
    confidence: number | null;
    provider: string;
    reason?: string;
  };
}

/**
 * Analyze uploaded evidence
 * In production, this would:
 * - Download and parse the file
 * - Extract EXIF data
 * - Run through deepfake detection model
 * - Store hash on blockchain
 */
export async function analyzeEvidence(
  request: EvidenceUploadRequest,
): Promise<EvidenceAnalysisResult> {
  // Generate blockchain hash for the evidence
  const blockchainHash = generateBlockchainHash(request.url, request.userId);

  // Extract metadata (simulated - would use exif-parser in production)
  const metadataExtracted = extractMetadata(request);

  // Analyze for manipulation
  const manipulationAnalysis = detectManipulation(request, metadataExtracted);

  // Check for AI generation (placeholder - would use ML model)
  const aiDetection = await detectDeepfakeFromUrl(request.url);
  const isAiGenerated = aiDetection.verdict === "fake";

  // Calculate authenticity score
  const authenticityScore = calculateAuthenticityScore(
    metadataExtracted,
    manipulationAnalysis,
    aiDetection.verdict,
  );

  return {
    authenticityScore,
    isAiGenerated,
    manipulationDetected: manipulationAnalysis.detected,
    blockchainHash,
    metadataExtracted,
    analysisDetails: {
      exifPresent: metadataExtracted.hasExif,
      timestampValid: metadataExtracted.timestampValid,
      locationPresent: !!metadataExtracted.gpsData,
      softwareDetected: manipulationAnalysis.software,
      formatConsistent: true,
    },
    aiDetection,
  };
}

/**
 * Generate blockchain hash for evidence
 * In production, this would submit to Polygon L2
 */
function generateBlockchainHash(url: string, userId: string): string {
  const timestamp = Date.now();
  const data = `${url}:${userId}:${timestamp}`;
  const hash = crypto.createHash("sha256").update(data).digest("hex");
  return `0x${hash}`;
}

/**
 * Extract metadata from evidence
 * In production, would use exif-parser or sharp library
 */
function extractMetadata(request: EvidenceUploadRequest): Record<string, any> {
  // Simulated metadata extraction
  const now = new Date();

  return {
    hasExif: true,
    timestampValid: true,
    capturedAt: request.metadata?.capturedAt || now.toISOString(),
    gpsData: request.metadata?.gps || null,
    cameraModel: request.metadata?.camera || "Unknown",
    software: request.metadata?.software || null,
    dimensions: {
      width: request.metadata?.width || 1920,
      height: request.metadata?.height || 1080,
    },
    fileSize: request.metadata?.size || 0,
    format: getFormatFromUrl(request.url),
  };
}

/**
 * Get file format from URL
 */
function getFormatFromUrl(url: string): string {
  const ext = url.split(".").pop()?.toLowerCase() || "";
  const formats: Record<string, string> = {
    jpg: "JPEG",
    jpeg: "JPEG",
    png: "PNG",
    gif: "GIF",
    webp: "WebP",
    mp4: "MP4",
    mov: "MOV",
    pdf: "PDF",
  };
  return formats[ext] || "Unknown";
}

/**
 * Detect manipulation in evidence
 */
function detectManipulation(
  request: EvidenceUploadRequest,
  metadata: Record<string, any>,
): { detected: boolean; software: string | null; indicators: string[] } {
  const indicators: string[] = [];
  let detected = false;
  let software: string | null = null;

  // Check for known editing software in metadata
  const editingSoftware = [
    "photoshop",
    "gimp",
    "lightroom",
    "snapseed",
    "facetune",
    "vsco",
    "afterlight",
    "picsart",
  ];

  if (metadata.software) {
    const softwareLower = metadata.software.toLowerCase();
    for (const editor of editingSoftware) {
      if (softwareLower.includes(editor)) {
        indicators.push(`Editing software detected: ${metadata.software}`);
        software = metadata.software;
        break;
      }
    }
  }

  // Check for timestamp inconsistencies
  if (!metadata.timestampValid) {
    indicators.push("Timestamp appears to be modified");
    detected = true;
  }

  // Check for missing EXIF data (common in edited images)
  if (!metadata.hasExif && request.mediaType === "image") {
    indicators.push("No EXIF data found (possible stripped or edited image)");
  }

  // Only mark as detected if we have strong indicators
  detected = detected || indicators.length > 1;

  return { detected, software, indicators };
}

/**
 * Check if evidence is AI-generated
 * In production, would use trained ML model or API like Arya.ai
 */
function calculateAuthenticityScore(
  metadata: Record<string, any>,
  manipulationAnalysis: { detected: boolean; indicators: string[] },
  aiVerdict: "real" | "fake" | "unknown",
): number {
  let score = 70; // Base score

  // AI generation kills authenticity
  if (aiVerdict === "fake") {
    return 10;
  }
  if (aiVerdict === "unknown") {
    score -= 10;
  }

  // Manipulation detection
  if (manipulationAnalysis.detected) {
    score -= 30;
  } else if (manipulationAnalysis.indicators.length > 0) {
    score -= manipulationAnalysis.indicators.length * 5;
  } else {
    score += 10; // No manipulation indicators
  }

  // EXIF data present
  if (metadata.hasExif) {
    score += 10;
  }

  // GPS data present (more credible)
  if (metadata.gpsData) {
    score += 5;
  }

  // Valid timestamp
  if (metadata.timestampValid) {
    score += 5;
  }

  // Cap between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Get evidence by ID
 */
export async function getEvidenceById(
  evidenceId: string,
): Promise<EvidenceAnalysisResult | null> {
  // Would fetch from database
  return null;
}

/**
 * List evidence for a claim
 */
export async function listEvidenceForClaim(
  claimId: string,
): Promise<EvidenceAnalysisResult[]> {
  // Would fetch from database
  return [];
}
