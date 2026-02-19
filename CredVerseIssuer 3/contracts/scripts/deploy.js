const hre = require("hardhat");

async function main() {
    console.log("Deploying CredVerseRegistry...");

    const network = await hre.ethers.provider.getNetwork();
    const chainId = network.chainId;
    const isZkEvmMainnet = chainId === 1101n;
    const allowZkEvmMainnet = process.env.ENABLE_ZKEVM_MAINNET === "true";

    if (isZkEvmMainnet && !allowZkEvmMainnet) {
        throw new Error(
            "Refusing zkEVM mainnet deployment. Set ENABLE_ZKEVM_MAINNET=true only after security and cost gates are approved.",
        );
    }

    // Get signers
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const CredVerseRegistry = await hre.ethers.getContractFactory("CredVerseRegistry");
    const registry = await CredVerseRegistry.deploy();

    await registry.waitForDeployment();
    const address = await registry.getAddress();

    console.log(`CredVerseRegistry deployed to: ${address}`);
    console.log(`Network: ${hre.network.name}`);
    console.log(`Chain ID: ${chainId}`);

    // Self-register as Issuer for Demo purposes
    console.log("Registering deployer as Issuer...");
    const tx = await registry.registerIssuer(deployer.address, "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnn3Zua2F72", "university.edu");
    await tx.wait();
    console.log("Deployer registered as Issuer.");

    console.log("\n=== Deployment Summary ===");
    console.log(`Contract Address: ${address}`);

    let explorerUrl = `https://sepolia.etherscan.io/address/${address}`;
    if (hre.network.name === 'polygon') {
        explorerUrl = `https://polygonscan.com/address/${address}`;
    } else if (hre.network.name === 'polygonAmoy') {
        explorerUrl = `https://amoy.polygonscan.com/address/${address}`;
    } else if (hre.network.name === 'polygonZkEvm') {
        explorerUrl = `https://zkevm.polygonscan.com/address/${address}`;
    } else if (hre.network.name === 'polygonZkEvmCardona') {
        explorerUrl = `https://cardona-zkevm.polygonscan.com/address/${address}`;
    } else if (hre.network.name === 'mainnet') {
        explorerUrl = `https://etherscan.io/address/${address}`;
    }

    console.log(`Explorer: ${explorerUrl}`);
    console.log("\nAdd this to your .env file:");
    console.log(`REGISTRY_CONTRACT_ADDRESS=${address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
