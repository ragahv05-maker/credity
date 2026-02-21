export interface Credential {
  id: string;
  title: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  type: "education" | "health" | "identity" | "finance";
  status: "verified" | "revoked" | "pending";
  description: string;
  metadata: {
    standard: string; // e.g. "W3C VC v1.1"
    network: string; // e.g. "Polygon", "Ethereum"
    contract: string;
    hash: string;
  };
}

export const MOCK_CREDENTIALS: Credential[] = [
  {
    id: "vc-88291",
    title: "Bachelor of Computer Science",
    issuer: "Stanford University",
    issueDate: "2023-05-15",
    type: "education",
    status: "verified",
    description: "Degree verification for Computer Science program.",
    metadata: {
      standard: "W3C VC v1.1",
      network: "Ethereum",
      contract: "0x123...abc",
      hash: "0x882...112",
    },
  },
  {
    id: "vc-11234",
    title: "COVID-19 Vaccination Record",
    issuer: "Ministry of Health",
    issueDate: "2021-08-20",
    type: "health",
    status: "verified",
    description: "Proof of vaccination dose 1 & 2.",
    metadata: {
      standard: "Smart Health Card",
      network: "Polygon",
      contract: "0x456...def",
      hash: "0x776...332",
    },
  },
  {
    id: "vc-00921",
    title: "National Identity (DigiLocker)",
    issuer: "Government of India",
    issueDate: "2020-01-01",
    type: "identity",
    status: "verified",
    description: "Official national identity document imported via DigiLocker.",
    metadata: {
      standard: "W3C VC v2.0",
      network: "Hyperledger Indy",
      contract: "N/A",
      hash: "0x991...223",
    },
  },
  {
    id: "vc-33211",
    title: "Health Insurance Policy",
    issuer: "Aetna Global",
    issueDate: "2024-01-01",
    expiryDate: "2025-01-01",
    type: "finance",
    status: "verified",
    description: "Active health insurance policy coverage proof.",
    metadata: {
      standard: "Verifiable Insurance Policy",
      network: "Avalanche",
      contract: "0x789...ghi",
      hash: "0x445...667",
    },
  },
];
