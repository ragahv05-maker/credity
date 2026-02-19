const hre = require("hardhat");

function requireAddress(name) {
  const value = process.env[name];
  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`Missing or invalid ${name}. Expected 0x-prefixed 20-byte address.`);
  }
  return value;
}

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  const chainId = network.chainId;
  const isZkEvmMainnet = chainId === 1101n;
  const allowZkEvmMainnet = process.env.ENABLE_ZKEVM_MAINNET === "true";

  if (isZkEvmMainnet && !allowZkEvmMainnet) {
    throw new Error(
      "Refusing zkEVM mainnet deployment. Set ENABLE_ZKEVM_MAINNET=true only after security and cost gates are approved."
    );
  }

  const scoreThresholdVerifier = requireAddress("ZK_VERIFIER_SCORE_THRESHOLD");
  const ageVerificationVerifier = requireAddress("ZK_VERIFIER_AGE_VERIFICATION");
  const crossVerticalAggregateVerifier = requireAddress("ZK_VERIFIER_CROSS_VERTICAL_AGGREGATE");

  const ReputationVerifier = await hre.ethers.getContractFactory("ReputationVerifier");
  const contract = await ReputationVerifier.deploy(
    scoreThresholdVerifier,
    ageVerificationVerifier,
    crossVerticalAggregateVerifier
  );
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`ReputationVerifier deployed: ${address}`);
  console.log(`Network: ${hre.network.name} (chainId=${chainId})`);
  console.log("Constructor verifier wiring:");
  console.log(` - circuit 1 (score_threshold): ${scoreThresholdVerifier}`);
  console.log(` - circuit 2 (age_verification): ${ageVerificationVerifier}`);
  console.log(` - circuit 3 (cross_vertical_aggregate): ${crossVerticalAggregateVerifier}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
