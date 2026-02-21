type BuildIssuanceMetadataParams = {
  issuerDid: string;
  issuanceTimestamp?: Date | string | number;
  credentialType: string;
  additionalCredentialTypes?: string[];
};

export type IssuanceEvidenceMetadata = {
  issuerDid: string;
  issuedAt: string;
  issuedAtUnix: number;
  credentialType: string;
  credentialTypeNormalized: string;
  credentialTypes: string[];
  credentialTypesNormalized: string[];
};

export function normalizeCredentialType(input: string): string {
  return String(input)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

export function buildIssuanceEvidenceMetadata(
  params: BuildIssuanceMetadataParams,
): IssuanceEvidenceMetadata {
  const issuedAtDate = params.issuanceTimestamp
    ? new Date(params.issuanceTimestamp)
    : new Date();
  const issuedAt = issuedAtDate.toISOString();

  const rawTypes = [
    params.credentialType,
    ...(params.additionalCredentialTypes ?? []),
  ]
    .map((type) => String(type || "").trim())
    .filter((type) => type.length > 0);

  const credentialTypes = Array.from(new Set(rawTypes));
  const credentialTypesNormalized = Array.from(
    new Set(
      credentialTypes
        .map((type) => normalizeCredentialType(type))
        .filter((type) => type.length > 0),
    ),
  );

  return {
    issuerDid: params.issuerDid,
    issuedAt,
    issuedAtUnix: Math.floor(issuedAtDate.getTime() / 1000),
    credentialType: params.credentialType,
    credentialTypeNormalized: normalizeCredentialType(params.credentialType),
    credentialTypes,
    credentialTypesNormalized,
  };
}
