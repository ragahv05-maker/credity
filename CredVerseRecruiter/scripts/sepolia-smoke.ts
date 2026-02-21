import express from "express";
import { createServer } from "http";
import request from "supertest";
import { ethers } from "ethers";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const issuerEnvPath = path.resolve(repoRoot, "CredVerseIssuer 3/.env");
if (fs.existsSync(issuerEnvPath)) {
  const lines = fs.readFileSync(issuerEnvPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

// Use env-driven Sepolia smoke configuration.
process.env.NODE_ENV = "test";
process.env.CHAIN_NETWORK = process.env.CHAIN_NETWORK || "ethereum-sepolia";
process.env.BLOCKCHAIN_ANCHOR_MODE =
  process.env.BLOCKCHAIN_ANCHOR_MODE || "sync";
process.env.ISSUER_BOOTSTRAP_API_KEY =
  process.env.ISSUER_BOOTSTRAP_API_KEY || "test-api-key";

const issuerApiKey = process.env.ISSUER_BOOTSTRAP_API_KEY as string;
const sepoliaRpc =
  process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const registryContract =
  process.env.SEPOLIA_SMOKE_REGISTRY_CONTRACT_ADDRESS ||
  process.env.REGISTRY_CONTRACT_ADDRESS;
const relayerPrivateKey =
  process.env.SEPOLIA_SMOKE_RELAYER_PRIVATE_KEY ||
  process.env.RELAYER_PRIVATE_KEY;

if (!registryContract) {
  throw new Error(
    "Missing REGISTRY_CONTRACT_ADDRESS (or SEPOLIA_SMOKE_REGISTRY_CONTRACT_ADDRESS)",
  );
}
if (!relayerPrivateKey) {
  throw new Error(
    "Missing RELAYER_PRIVATE_KEY (or SEPOLIA_SMOKE_RELAYER_PRIVATE_KEY)",
  );
}

process.env.REGISTRY_CONTRACT_ADDRESS = registryContract;
process.env.RELAYER_PRIVATE_KEY = relayerPrivateKey;

async function run(): Promise<void> {
  const [
    { registerRoutes: registerIssuerRoutes },
    { registerRoutes: registerWalletRoutes },
    { registerRoutes: registerVerifierRoutes },
    sharedAuth,
    recruiterAuth,
  ] = await Promise.all([
    import("../../CredVerseIssuer 3/server/routes"),
    import("../../BlockWalletDigi/server/routes"),
    import("../server/routes"),
    import("../../packages/shared-auth/src/index"),
    import("../server/services/auth-service"),
  ]);

  const walletToken = sharedAuth.generateAccessToken({
    id: 1,
    username: "holder-smoke",
    role: "holder",
  });
  const verifierToken = recruiterAuth.generateAccessToken({
    id: "verifier-smoke",
    username: "verifier-smoke",
    role: "recruiter",
  });

  const issuerApp = express();
  issuerApp.use(express.json());
  const issuerServer = createServer(issuerApp);
  await registerIssuerRoutes(issuerServer, issuerApp);
  await new Promise<void>((resolve) =>
    issuerServer.listen(5001, "127.0.0.1", () => resolve()),
  );

  const walletApp = express();
  walletApp.use(express.json());
  const walletServer = createServer(walletApp);
  await registerWalletRoutes(walletServer, walletApp);

  const verifierApp = express();
  verifierApp.use(express.json());
  const verifierServer = createServer(verifierApp);
  await registerVerifierRoutes(verifierServer, verifierApp);

  try {
    const suffix = `smoke-${Date.now()}`;

    const issueHttpRes = await fetch(
      "http://127.0.0.1:5001/api/v1/credentials/issue",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": issuerApiKey,
        },
        body: JSON.stringify({
          templateId: "template-1",
          issuerId: "issuer-1",
          recipient: {
            name: `Smoke Candidate ${suffix}`,
            email: `smoke+${suffix}@example.com`,
            studentId: `SMOKE-${suffix}`,
          },
          credentialData: {
            credentialName: "Bachelor of Technology",
            major: "Computer Science",
            grade: "A",
          },
        }),
      },
    );
    const issueRes = (await issueHttpRes.json()) as Record<string, any>;
    if (issueHttpRes.status !== 201 || !issueRes.id) {
      throw new Error(
        `Issue failed: status=${issueHttpRes.status} body=${JSON.stringify(issueRes)}`,
      );
    }

    const offerHttpRes = await fetch(
      `http://127.0.0.1:5001/api/v1/credentials/${issueRes.id as string}/offer`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": issuerApiKey,
        },
        body: JSON.stringify({}),
      },
    );
    const offerRes = (await offerHttpRes.json()) as Record<string, any>;
    if (
      offerHttpRes.status !== 200 ||
      !String(offerRes.offerUrl).includes(
        "/api/v1/public/issuance/offer/consume?token=",
      )
    ) {
      throw new Error(
        `Offer failed: status=${offerHttpRes.status} body=${JSON.stringify(offerRes)}`,
      );
    }

    const claimRes = await request(walletApp)
      .post("/api/v1/wallet/offer/claim")
      .set("Authorization", `Bearer ${walletToken}`)
      .send({ userId: 1, url: String(offerRes.offerUrl) });

    if (claimRes.status !== 200) {
      throw new Error(
        `Claim failed: status=${claimRes.status} body=${JSON.stringify(claimRes.body)}`,
      );
    }

    const storedCredential = claimRes.body.credential?.data;
    const proof = claimRes.body.proof || {};

    const metadataRes = await request(verifierApp)
      .post("/api/v1/proofs/metadata")
      .set("Authorization", `Bearer ${verifierToken}`)
      .send({ credential: storedCredential, hash_algorithm: "sha256" });
    if (metadataRes.status !== 200) {
      throw new Error(
        `Metadata failed: status=${metadataRes.status} body=${JSON.stringify(metadataRes.body)}`,
      );
    }

    const verifyRes = await request(verifierApp)
      .post("/api/v1/proofs/verify")
      .set("Authorization", `Bearer ${verifierToken}`)
      .send({
        format: "ldp_vc",
        proof: storedCredential,
        expected_hash: metadataRes.body.hash,
        hash_algorithm: "sha256",
      });
    if (verifyRes.status !== 200 || verifyRes.body.valid !== true) {
      throw new Error(
        `Verifier failed: status=${verifyRes.status} body=${JSON.stringify(verifyRes.body)}`,
      );
    }

    let chainVerify: Record<string, any> | null = null;
    const contractHash = proof.hash || proof.credentialHash || null;
    if (contractHash) {
      const provider = new ethers.JsonRpcProvider(sepoliaRpc);
      const abi = [
        "function verifyCredential(bytes32 _credentialHash) external view returns (bool isValid, address issuer, uint256 anchoredAt)",
      ];
      const contract = new ethers.Contract(
        process.env.REGISTRY_CONTRACT_ADDRESS!,
        abi,
        provider,
      );
      const onchain = await contract.verifyCredential(
        `0x${String(contractHash).replace(/^0x/, "")}`,
      );
      chainVerify = {
        isValid: Boolean(onchain[0]),
        issuer: String(onchain[1]),
        anchoredAt: Number(onchain[2]),
      };
    }

    const now = new Date();
    const reportPath = path.resolve(
      repoRoot,
      "swarm/reports/credity-s31-sepolia-smoke.md",
    );
    const report = `# Credity S31 — Sepolia Smoke (Issue → Claim → Verify)

- Executed at: ${now.toISOString()}
- Network: ethereum-sepolia
- Contract: ${process.env.REGISTRY_CONTRACT_ADDRESS}
- Issuer anchor mode: sync

## Results

- Issue credential: ✅ (id: ${String(issueRes.id)})
- Offer create: ✅
- Wallet claim: ✅ (code: ${String(claimRes.body.code)})
- Recruiter verify: ✅ (code: ${String(verifyRes.body.code)})

## Proof / Chain Evidence

- proof.code: ${String(proof.code ?? "")}
- proof.deferred: ${String(proof.deferred ?? "")}
- proof.hash: ${String(proof.hash ?? proof.credentialHash ?? "")}
- proof.txHash: ${String(proof.txHash ?? "")}
- proof.blockNumber: ${String(proof.blockNumber ?? "")}
- proof.verifierContract: ${String(proof.verifierContract ?? process.env.REGISTRY_CONTRACT_ADDRESS ?? "")}

## On-chain verifyCredential(hash)

${
  chainVerify
    ? `- isValid: ${String(chainVerify.isValid)}\n- issuer: ${String(chainVerify.issuer)}\n- anchoredAt (epoch sec): ${String(chainVerify.anchoredAt)}`
    : "- Skipped (no proof hash available)"
}
`;

    fs.writeFileSync(reportPath, report, "utf8");
    console.log(report);
    console.log(`\nSaved report: ${reportPath}`);
  } finally {
    await new Promise<void>((resolve) => issuerServer.close(() => resolve()));
    await new Promise<void>((resolve) => walletServer.close(() => resolve()));
    await new Promise<void>((resolve) => verifierServer.close(() => resolve()));
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
