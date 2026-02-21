import { z } from "zod";
import { getAIAdapter } from "./ai-adapter";

export interface AIAnalysisResult {
  isReal: boolean;
  confidence: number;
  details: string;
  spoofingDetected: boolean;
  faceDetected: boolean;
}

const imageInputSchema = z.string().min(32, "image payload too small");
const documentTypeSchema = z.string().min(2).max(64);

const adapter = getAIAdapter();

function normalizeError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : "unknown_error";
  return new Error(`ai_${context}_failed:${message}`);
}

/**
 * Service to handle AI-powered analysis
 */
export const aiService = {
  analyzeLivenessFrame: async (
    imageBase64: string,
  ): Promise<AIAnalysisResult> => {
    try {
      const image = imageInputSchema.parse(imageBase64);
      const analysis = await adapter.analyzeLiveness(image);
      return {
        isReal: analysis.isReal,
        confidence: analysis.confidence,
        details: analysis.reasoning,
        spoofingDetected: analysis.spoofingDetected,
        faceDetected: analysis.faceDetected,
      };
    } catch (error) {
      const normalized = normalizeError(error, "liveness");
      console.error("[AI] Liveness analysis failed:", normalized.message);
      return {
        isReal: false,
        confidence: 0,
        details: normalized.message,
        spoofingDetected: true,
        faceDetected: false,
      };
    }
  },

  analyzeDocument: async (
    imageBase64: string,
    documentType: string,
  ): Promise<{
    isValid: boolean;
    extractedData: any;
    fraudScore: number;
    feedback: string;
  }> => {
    try {
      const image = imageInputSchema.parse(imageBase64);
      const docType = documentTypeSchema.parse(documentType);
      const analysis = await adapter.analyzeDocument(image, docType);
      return {
        isValid: analysis.isValid,
        extractedData: analysis.extractedData,
        fraudScore: analysis.fraudScore,
        feedback: analysis.feedback,
      };
    } catch (error) {
      const normalized = normalizeError(error, "document");
      console.error("[AI] Document analysis failed:", normalized.message);
      return {
        isValid: false,
        extractedData: {},
        fraudScore: 1,
        feedback: normalized.message,
      };
    }
  },
};
