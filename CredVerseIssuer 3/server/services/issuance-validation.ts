import { z } from "zod";

export type FieldError = { path: string; message: string; expected?: string };

// Minimal schema inspection for JSON-Schema-ish objects.
function getRequiredFieldsFromJsonSchema(schema: unknown): string[] {
  if (!schema || typeof schema !== "object") return [];
  const s = schema as any;
  if (Array.isArray(s.required)) {
    return s.required.filter((x: any) => typeof x === "string");
  }
  return [];
}

function getPropertyTypesFromJsonSchema(
  schema: unknown,
): Record<string, string> {
  if (!schema || typeof schema !== "object") return {};
  const s = schema as any;
  const props = s.properties;
  if (!props || typeof props !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v && typeof v === "object" && typeof (v as any).type === "string") {
      out[k] = String((v as any).type);
    }
  }
  return out;
}

function isType(value: unknown, expected: string): boolean {
  if (expected === "string") return typeof value === "string";
  if (expected === "number")
    return typeof value === "number" && Number.isFinite(value);
  if (expected === "integer")
    return typeof value === "number" && Number.isInteger(value);
  if (expected === "boolean") return typeof value === "boolean";
  if (expected === "object")
    return !!value && typeof value === "object" && !Array.isArray(value);
  if (expected === "array") return Array.isArray(value);
  return true; // unknown type → don't block
}

export function validateCredentialDataAgainstTemplateSchema(
  templateSchema: unknown,
  data: unknown,
): {
  ok: boolean;
  errors: FieldError[];
  schemaHint?: {
    required?: string[];
    properties?: Record<string, { type?: string }>;
  };
} {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      ok: false,
      errors: [
        {
          path: "credentialData",
          message: "credentialData must be a JSON object",
          expected: "object",
        },
      ],
    };
  }

  // For demo compatibility: template.schema might be a string placeholder.
  if (typeof templateSchema === "string") {
    return {
      ok: true,
      errors: [],
      schemaHint: {
        required: [],
        properties: {},
      },
    };
  }

  const required = getRequiredFieldsFromJsonSchema(templateSchema);
  const propTypes = getPropertyTypesFromJsonSchema(templateSchema);

  const errors: FieldError[] = [];
  for (const field of required) {
    if (!Object.prototype.hasOwnProperty.call(data, field)) {
      errors.push({
        path: `credentialData.${field}`,
        message: `Missing required field: ${field}`,
      });
    }
  }

  for (const [field, expectedType] of Object.entries(propTypes)) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      const value = (data as any)[field];
      if (!isType(value, expectedType)) {
        errors.push({
          path: `credentialData.${field}`,
          message: `Invalid type for ${field}`,
          expected: expectedType,
        });
      }
    }
  }

  const schemaHint = {
    required,
    properties: Object.fromEntries(
      Object.entries(propTypes).map(([k, t]) => [k, { type: t }]),
    ),
  };

  return {
    ok: errors.length === 0,
    errors,
    schemaHint,
  };
}

export const issuanceRequestSchema = z
  .object({
    templateId: z.string().min(1, "templateId is required"),
    issuerId: z.string().min(1, "issuerId is required"),
    recipient: z
      .object({
        did: z.string().optional(),
        studentId: z.string().optional(),
        id: z.string().optional(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        webhookUrl: z.string().url().optional(),
      })
      .passthrough(),
    credentialData: z.record(z.unknown()),
  })
  .strict();

export function normalizeRecipient(recipient: any): any {
  const out = { ...recipient };
  // Back-compat: some clients send recipient.id as studentId.
  if (!out.studentId && typeof out.id === "string") out.studentId = out.id;
  return out;
}

export function validateRecipient(recipient: any): FieldError[] {
  const errors: FieldError[] = [];
  const hasDid = typeof recipient?.did === "string" && recipient.did.length > 0;
  const hasStudentId =
    typeof recipient?.studentId === "string" && recipient.studentId.length > 0;
  const hasEmail =
    typeof recipient?.email === "string" && recipient.email.length > 0;

  if (!hasDid && !hasStudentId) {
    errors.push({
      path: "recipient.did",
      message: "Provide recipient.did (preferred) or recipient.studentId",
      expected: "string",
    });
  }
  if (!hasEmail) {
    // For demo we keep this as a warning-level error, but issuer UI expects email often.
    // Don't block issuance.
  }

  return errors;
}
