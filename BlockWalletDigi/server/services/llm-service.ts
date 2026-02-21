/**
 * LLM Service
 * Provides LLM-powered analysis for claims verification
 * Supports DeepSeek, Gemini, and OpenAI with configurable API keys
 *
 * Set environment variables:
 * - DEEPSEEK_API_KEY: DeepSeek API key
 * - GEMINI_API_KEY: Google Gemini API key (fallback)
 * - OPENAI_API_KEY: OpenAI API key (fallback)
 */

export interface LLMAnalysisRequest {
  type: "deception" | "consistency" | "pattern";
  text: string;
  context?: {
    claimType?: string;
    claimAmount?: number;
    evidence?: string[];
  };
}

export interface LLMAnalysisResponse {
  success: boolean;
  confidence: number; // 0-1
  analysis: string;
  fraudIndicators: string[];
  recommendation: string;
  processingTimeMs: number;
  provider: "deepseek" | "gemini" | "openai" | "local";
  cost: number; // in INR
}

// Check which LLM provider is configured
function getConfiguredProvider(): "deepseek" | "gemini" | "openai" | "local" {
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "local"; // Use local heuristics
}

/**
 * Analyze text for deception indicators
 */
export async function analyzeDeception(
  text: string,
): Promise<LLMAnalysisResponse> {
  const startTime = Date.now();
  const provider = getConfiguredProvider();

  if (provider !== "local") {
    try {
      return await callLLMProvider(provider, {
        type: "deception",
        text,
      });
    } catch (error) {
      console.error(
        `LLM provider ${provider} failed, falling back to local:`,
        error,
      );
    }
  }

  // Local fallback: heuristic-based analysis
  return localDeceptionAnalysis(text, startTime);
}

/**
 * Check consistency between claim description and evidence
 */
export async function checkConsistency(
  description: string,
  evidence: { type: string; description?: string }[],
): Promise<LLMAnalysisResponse> {
  const startTime = Date.now();
  const provider = getConfiguredProvider();

  if (provider !== "local") {
    try {
      return await callLLMProvider(provider, {
        type: "consistency",
        text: description,
        context: { evidence: evidence.map((e) => e.description || e.type) },
      });
    } catch (error) {
      console.error(
        `LLM provider ${provider} failed, falling back to local:`,
        error,
      );
    }
  }

  // Local fallback
  return localConsistencyAnalysis(description, evidence, startTime);
}

/**
 * Detect fraud patterns in claim text
 */
export async function detectFraudPatterns(
  text: string,
  claimType: string,
  claimAmount: number,
): Promise<LLMAnalysisResponse> {
  const startTime = Date.now();
  const provider = getConfiguredProvider();

  if (provider !== "local") {
    try {
      return await callLLMProvider(provider, {
        type: "pattern",
        text,
        context: { claimType, claimAmount },
      });
    } catch (error) {
      console.error(
        `LLM provider ${provider} failed, falling back to local:`,
        error,
      );
    }
  }

  // Local fallback
  return localPatternAnalysis(text, claimType, claimAmount, startTime);
}

/**
 * Call LLM provider API
 */
async function callLLMProvider(
  provider: "deepseek" | "gemini" | "openai",
  request: LLMAnalysisRequest,
): Promise<LLMAnalysisResponse> {
  const startTime = Date.now();

  // Build prompt based on analysis type
  const prompt = buildPrompt(request);

  let response: any;
  let cost = 0;

  switch (provider) {
    case "deepseek":
      response = await callDeepSeek(prompt);
      cost = 0.02; // ~₹0.02 per 500 tokens
      break;
    case "gemini":
      response = await callGemini(prompt);
      cost = 0.03;
      break;
    case "openai":
      response = await callOpenAI(prompt);
      cost = 0.05;
      break;
  }

  return {
    success: true,
    confidence: parseConfidence(response),
    analysis: response.analysis || response.content || "",
    fraudIndicators: parseFraudIndicators(response),
    recommendation: parseRecommendation(response),
    processingTimeMs: Date.now() - startTime,
    provider,
    cost,
  };
}

/**
 * Build prompt for LLM analysis
 */
function buildPrompt(request: LLMAnalysisRequest): string {
  switch (request.type) {
    case "deception":
      return `You are a fraud detection expert. Analyze this claim for deception indicators:

"${request.text}"

Look for:
1. Vague or evasive language
2. Emotional manipulation
3. Inconsistent details
4. Urgency pressure
5. Missing key information

Respond with JSON:
{
  "confidence": 0.0-1.0,
  "fraudIndicators": ["list of specific issues"],
  "analysis": "brief explanation",
  "recommendation": "approve/review/reject"
}`;

    case "consistency":
      return `Check if this claim description is consistent with the evidence:

Claim: "${request.text}"
Evidence types: ${request.context?.evidence?.join(", ")}

Respond with JSON:
{
  "confidence": 0.0-1.0,
  "consistent": true/false,
  "issues": ["any inconsistencies found"],
  "analysis": "brief explanation"
}`;

    case "pattern":
      return `Analyze this ${request.context?.claimType} claim for fraud patterns:

"${request.text}"
Amount: ₹${request.context?.claimAmount}

Common fraud patterns to check:
1. Staged incidents
2. Inflated amounts
3. Template descriptions
4. Suspicious timing

Respond with JSON:
{
  "confidence": 0.0-1.0,
  "patternMatch": 0.0-1.0,
  "matchedPatterns": ["list of patterns"],
  "analysis": "brief explanation"
}`;

    default:
      return request.text;
  }
}

/**
 * Call DeepSeek API
 */
async function callDeepSeek(prompt: string): Promise<any> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  const data = await response.json();
  return parseJsonResponse(data.choices?.[0]?.message?.content || "{}");
}

/**
 * Call Google Gemini API
 */
async function callGemini(prompt: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
      }),
    },
  );

  const data = await response.json();
  return parseJsonResponse(
    data.candidates?.[0]?.content?.parts?.[0]?.text || "{}",
  );
}

/**
 * Call OpenAI API
 */
async function callOpenAI(prompt: string): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  const data = await response.json();
  return parseJsonResponse(data.choices?.[0]?.message?.content || "{}");
}

/**
 * Parse JSON from LLM response (handles markdown code blocks)
 */
function parseJsonResponse(text: string): any {
  // Remove markdown code blocks if present
  const cleaned = text
    .replace(/```json?\n?/g, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return { content: text };
  }
}

// Helper functions to parse LLM responses
function parseConfidence(response: any): number {
  return typeof response.confidence === "number" ? response.confidence : 0.7;
}

function parseFraudIndicators(response: any): string[] {
  return (
    response.fraudIndicators ||
    response.issues ||
    response.matchedPatterns ||
    []
  );
}

function parseRecommendation(response: any): string {
  return response.recommendation || "review";
}

// ========== LOCAL FALLBACK ANALYSIS ==========

/**
 * Local heuristic-based deception analysis
 */
function localDeceptionAnalysis(
  text: string,
  startTime: number,
): LLMAnalysisResponse {
  const lowerText = text.toLowerCase();
  const fraudIndicators: string[] = [];
  let confidence = 0.7;

  // Check for urgency indicators
  const urgencyWords = [
    "urgent",
    "asap",
    "immediately",
    "emergency",
    "right now",
  ];
  for (const word of urgencyWords) {
    if (lowerText.includes(word)) {
      fraudIndicators.push(`Urgency indicator: "${word}"`);
      confidence -= 0.1;
    }
  }

  // Check for evasive language
  const evasivePatterns = [
    "can't remember",
    "don't recall",
    "not sure",
    "maybe",
    "probably",
  ];
  for (const pattern of evasivePatterns) {
    if (lowerText.includes(pattern)) {
      fraudIndicators.push(`Vague language: "${pattern}"`);
      confidence -= 0.05;
    }
  }

  // Check for third-party mentions
  if (
    lowerText.includes("friend") ||
    lowerText.includes("someone else") ||
    lowerText.includes("third party")
  ) {
    fraudIndicators.push("Third-party involvement mentioned");
    confidence -= 0.1;
  }

  // Short descriptions are less trustworthy
  if (text.length < 50) {
    fraudIndicators.push("Very short description lacks detail");
    confidence -= 0.1;
  }

  // Detailed descriptions with specifics are more trustworthy
  if (text.length > 200 && /\d{1,2}[:\-\/]\d{1,2}/i.test(text)) {
    confidence += 0.1;
  }

  confidence = Math.max(0.1, Math.min(1.0, confidence));

  return {
    success: true,
    confidence,
    analysis:
      fraudIndicators.length > 0
        ? `Found ${fraudIndicators.length} potential issue(s) in claim text`
        : "No obvious deception indicators found",
    fraudIndicators,
    recommendation:
      confidence > 0.7 ? "approve" : confidence > 0.5 ? "review" : "reject",
    processingTimeMs: Date.now() - startTime,
    provider: "local",
    cost: 0,
  };
}

/**
 * Local consistency analysis
 */
function localConsistencyAnalysis(
  description: string,
  evidence: { type: string; description?: string }[],
  startTime: number,
): LLMAnalysisResponse {
  const issues: string[] = [];
  let confidence = 0.8;

  // Check if evidence types match claim type
  const descLower = description.toLowerCase();

  if (descLower.includes("photo") || descLower.includes("picture")) {
    if (!evidence.some((e) => e.type === "image")) {
      issues.push("Claim mentions photos but no images provided");
      confidence -= 0.2;
    }
  }

  if (descLower.includes("receipt") || descLower.includes("invoice")) {
    if (!evidence.some((e) => e.type === "document")) {
      issues.push("Claim mentions documents but none provided");
      confidence -= 0.15;
    }
  }

  // No evidence at all is suspicious for damage claims
  if (
    evidence.length === 0 &&
    (descLower.includes("damage") || descLower.includes("accident"))
  ) {
    issues.push("No evidence provided for damage/accident claim");
    confidence -= 0.3;
  }

  confidence = Math.max(0.1, Math.min(1.0, confidence));

  return {
    success: true,
    confidence,
    analysis:
      issues.length > 0
        ? `Found ${issues.length} consistency issue(s)`
        : "Claim and evidence appear consistent",
    fraudIndicators: issues,
    recommendation: confidence > 0.7 ? "approve" : "review",
    processingTimeMs: Date.now() - startTime,
    provider: "local",
    cost: 0,
  };
}

/**
 * Local pattern analysis
 */
function localPatternAnalysis(
  text: string,
  claimType: string,
  claimAmount: number,
  startTime: number,
): LLMAnalysisResponse {
  const patterns: string[] = [];
  let patternMatch = 0;

  const lowerText = text.toLowerCase();

  // High amount check
  const amountThresholds: Record<string, number> = {
    insurance_auto: 500000,
    refund_request: 50000,
    age_verification: 0,
    identity_check: 0,
  };

  if (claimAmount > (amountThresholds[claimType] || 100000)) {
    patterns.push("Claim amount above typical threshold");
    patternMatch += 0.2;
  }

  // Check for common fraud phrases
  const fraudPhrases = [
    { phrase: "lost receipt", weight: 0.15 },
    { phrase: "no documentation", weight: 0.15 },
    { phrase: "cash payment", weight: 0.1 },
    { phrase: "friend's account", weight: 0.2 },
    { phrase: "third party", weight: 0.15 },
  ];

  for (const { phrase, weight } of fraudPhrases) {
    if (lowerText.includes(phrase)) {
      patterns.push(`Common fraud phrase: "${phrase}"`);
      patternMatch += weight;
    }
  }

  patternMatch = Math.min(1.0, patternMatch);

  return {
    success: true,
    confidence: 1 - patternMatch,
    analysis:
      patterns.length > 0
        ? `Matched ${patterns.length} fraud pattern(s)`
        : "No known fraud patterns detected",
    fraudIndicators: patterns,
    recommendation:
      patternMatch > 0.5 ? "reject" : patternMatch > 0.3 ? "review" : "approve",
    processingTimeMs: Date.now() - startTime,
    provider: "local",
    cost: 0,
  };
}

/**
 * Get LLM configuration status
 */
export function getLLMStatus(): { provider: string; configured: boolean } {
  const provider = getConfiguredProvider();
  return {
    provider,
    configured: provider !== "local",
  };
}
