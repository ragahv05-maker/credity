/**
 * Standalone deploy script using pre-compiled artifacts
 * Works around Hardhat solc issues on macOS
 */
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("Deploying CredVerseRegistry using pre-compiled artifact...");

  const artifactPath = path.join(
    __dirname,
    "../contracts/artifacts/contracts/CredVerseRegistry.sol/CredVerseRegistry.json",
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

  // Connect to local Hardhat node
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  // Get the first account from Hardhat's pre-funded accounts
  const privateKey =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("Deploying with account:", wallet.address);
  console.log(
    "Balance:",
    ethers.formatEther(await provider.getBalance(wallet.address)),
    "ETH",
  );

  // Deploy contract
  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet,
  );
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`CredVerseRegistry deployed to: ${address}`);

  // Wait a moment for state to sync
  await new Promise((r) => setTimeout(r, 1000));

  // Register deployer as issuer with fresh nonce
  console.log("Registering deployer as Issuer...");
  const nonce = await provider.getTransactionCount(wallet.address, "latest");
  console.log("Current nonce:", nonce);

  const tx = await contract.registerIssuer(
    wallet.address,
    "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnn3Zua2F72",
    "credverse.edu",
    { nonce },
  );
  await tx.wait();
  console.log("Deployer registered as Issuer.");

  // Verify registration
  const isActive = await contract.isActiveIssuer(wallet.address);
  console.log("Is active issuer:", isActive);

  console.log("\n=== Deployment Summary ===");
  console.log(`Contract Address: ${address}`);
  console.log(`Chain ID: ${(await provider.getNetwork()).chainId}`);
  console.log("\nAdd this to your .env file:");
  console.log(`REGISTRY_CONTRACT_ADDRESS=${address}`);

  // Save to a config file
  const configPath = path.join(__dirname, "../.contract-address");
  fs.writeFileSync(configPath, address);
  console.log(`\nAddress saved to: ${configPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
