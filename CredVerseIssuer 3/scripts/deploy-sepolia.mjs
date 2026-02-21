#!/usr/bin/env node
/**
 * Deploy CredVerseRegistry to Sepolia testnet
 * Using pre-compiled artifacts to avoid solc issues
 */
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SEPOLIA_RPC =
  process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

async function main() {
  if (!PRIVATE_KEY) {
    console.error("ERROR: Set DEPLOYER_PRIVATE_KEY in .env");
    process.exit(1);
  }

  console.log("Deploying CredVerseRegistry to Sepolia testnet...\n");

  // Load artifact
  const artifactPath = path.join(
    __dirname,
    "../contracts/artifacts/contracts/CredVerseRegistry.sol/CredVerseRegistry.json",
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

  // Connect to Sepolia
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log("Deployer:", wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  if (balance < ethers.parseEther("0.01")) {
    console.error("\nERROR: Insufficient balance. Get free Sepolia ETH from:");
    console.error("  https://sepoliafaucet.com/");
    console.error("  https://faucet.sepolia.dev/");
    console.error("\nSend to:", wallet.address);
    process.exit(1);
  }

  // Deploy
  console.log("\nDeploying contract...");
  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet,
  );
  const contract = await factory.deploy();

  console.log("TX submitted:", contract.deploymentTransaction()?.hash);
  console.log("Waiting for confirmation...");

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("\n✅ Contract deployed!");
  console.log("Address:", address);
  console.log("\nView on Etherscan:");
  console.log(`https://sepolia.etherscan.io/address/${address}`);

  // Register deployer as issuer
  console.log("\nRegistering deployer as Issuer...");
  const tx = await contract.registerIssuer(
    wallet.address,
    "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnn3Zua2F72",
    "credverse.io",
  );
  await tx.wait();
  console.log("✅ Issuer registered!");

  console.log("\n=== Add to .env ===");
  console.log(`SEPOLIA_CONTRACT_ADDRESS=${address}`);

  // Save to file
  fs.writeFileSync(path.join(__dirname, "../.sepolia-contract"), address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error.message);
    process.exit(1);
  });
