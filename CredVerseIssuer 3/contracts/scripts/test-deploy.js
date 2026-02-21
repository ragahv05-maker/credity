const hre = require("hardhat");

async function main() {
  try {
    console.log("Getting Factory...");
    const CR = await hre.ethers.getContractFactory("CredentialRegistry");
    console.log("Deploying...");
    const reg = await CR.deploy();
    await reg.waitForDeployment();
    console.log("Deployed to:", reg.target);

    console.log("Checking function registerIssuer...");
    if (typeof reg.registerIssuer === "function") {
      console.log("Function exists!");
    } else {
      console.log("Function DOES NOT exist!", reg);
      // Log methods
      console.log("Prototype:", Object.getPrototypeOf(reg));
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

main();
