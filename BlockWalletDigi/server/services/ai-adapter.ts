import { z } from 'zod';
import { retry } from '../utils/retry';

const providerTimeoutMs = Number(process.env.AI_PROVIDER_TIMEOUT_MS || 6000);
const providerRetries = Number(process.env.AI_PROVIDER_RETRIES || 1);

const livenessSchema = z.object({
    isReal: z.boolean(),
    confidence: z.number().min(0).max(1),
    spoofingDetected: z.boolean(),
    faceDetected: z.boolean(),
    reasoning: z.string().min(1),
});

const documentSchema = z.object({
    isValid: z.boolean(),
    extractedData: z.record(z.any()).default({}),
    fraudScore: z.number().min(0).max(1),
    feedback: z.string().min(1),
});

export type LivenessResult = z.infer<typeof livenessSchema>;
export type DocumentResult = z.infer<typeof documentSchema>;

export interface AIAdapter {
    analyzeLiveness(imageBase64: string): Promise<LivenessResult>;
    analyzeDocument(imageBase64: string, documentType: string): Promise<DocumentResult>;
}

function timeoutSignal(ms: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
}

class StrictUnavailableAdapter implements AIAdapter {
    async analyzeLiveness(_imageBase64: string): Promise<LivenessResult> {
        throw new Error('ai_provider_unavailable');
    }

    async analyzeDocument(_imageBase64: string, _documentType: string): Promise<DocumentResult> {
        throw new Error('ai_provider_unavailable');
    }
}

class GeminiAdapter implements AIAdapter {
    private async generate(prompt: string, imageBase64: string): Promise<unknown> {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const response = await retry(
            async () => {
                const result = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
                    {
                        method: 'POST',
                        signal: timeoutSignal(providerTimeoutMs),
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: base64Data } }] }],
                        }),
                    }
                );

                if (!result.ok) {
                    throw new Error(`provider_http_${result.status}`);
                }

                return result.json();
            },
            {
                maxRetries: providerRetries,
                initialDelayMs: 300,
                retryCondition: (err) => /provider_http_5|fetch|abort|network/i.test(err.message),
            }
        );

        const text = (response as any)?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text || typeof text !== 'string') {
            throw new Error('provider_invalid_response');
        }

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('provider_unparseable_response');

        return JSON.parse(jsonMatch[0]);
    }

    async analyzeLiveness(imageBase64: string): Promise<LivenessResult> {
        const payload = await this.generate(
            'Return ONLY JSON with isReal, confidence(0-1), spoofingDetected, faceDetected, reasoning for this liveness image.',
            imageBase64
        );
        return livenessSchema.parse(payload);
    }

    async analyzeDocument(imageBase64: string, documentType: string): Promise<DocumentResult> {
        const payload = await this.generate(
            `Return ONLY JSON with isValid, extractedData(object), fraudScore(0-1), feedback for this ${documentType} document.`,
            imageBase64
        );
        return documentSchema.parse(payload);
    }
}

export function getAIAdapter(): AIAdapter {
    if (process.env.GEMINI_API_KEY) {
        return new GeminiAdapter();
    }
    return new StrictUnavailableAdapter();
}
