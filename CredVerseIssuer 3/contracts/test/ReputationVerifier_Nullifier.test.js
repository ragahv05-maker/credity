const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReputationVerifier Nullifier", function () {
  let owner;
  let mock1, mock2, mock3, verifier;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("MockGroth16Verifier");
    mock1 = await Mock.deploy();
    mock2 = await Mock.deploy();
    mock3 = await Mock.deploy();
    await Promise.all([mock1.waitForDeployment(), mock2.waitForDeployment(), mock3.waitForDeployment()]);

    const Verifier = await ethers.getContractFactory("ReputationVerifier");
    verifier = await Verifier.deploy(
      await mock1.getAddress(),
      await mock2.getAddress(),
      await mock3.getAddress()
    );
    await verifier.waitForDeployment();
  });

  it("Should allow enabling nullifier check", async function () {
    await expect(verifier.setCircuitNullifierConfig(1, true, 2))
      .to.emit(verifier, "NullifierConfigUpdated")
      .withArgs(1, true, 2);

    const config = await verifier.circuitNullifierConfig(1);
    expect(config.enabled).to.equal(true);
    expect(config.index).to.equal(2);
  });

  it("Should prevent double spending when nullifier is enabled", async function () {
    // Enable nullifier for circuit 1 at index 2 (commitment as nullifier for testing)
    await verifier.setCircuitNullifierConfig(1, true, 2);

    const pA = [1, 2];
    const pB = [[3, 4], [5, 6]];
    const pC = [7, 8];
    // Circuit 1 expected length is 3: [circuitId, threshold, commitment]
    const pubSignals1 = [1, 750, 12345];

    // First submission
    await expect(verifier.verifyAndStoreProof(pA, pB, pC, pubSignals1))
      .to.emit(verifier, "NullifierUsed")
      .withArgs(1, 12345);

    // Second submission with SAME nullifier but different proof points (simulating malleability or different proof for same action)
    const pA2 = [9, 10];

    await expect(verifier.verifyAndStoreProof(pA2, pB, pC, pubSignals1))
      .to.be.revertedWithCustomError(verifier, "NullifierAlreadyUsed")
      .withArgs(12345);
  });

  it("Should revert if nullifier index is out of bounds", async function () {
    await verifier.setCircuitNullifierConfig(1, true, 5); // Index 5 is out of bounds for length 3

    const pA = [1, 2];
    const pB = [[3, 4], [5, 6]];
    const pC = [7, 8];
    const pubSignals = [1, 750, 12345];

    await expect(verifier.verifyAndStoreProof(pA, pB, pC, pubSignals))
      .to.be.revertedWithCustomError(verifier, "InvalidNullifierIndex")
      .withArgs(5, 3);
  });

  it("Should not check nullifier if disabled", async function () {
    // By default enabled is false
    const pA = [1, 2];
    const pB = [[3, 4], [5, 6]];
    const pC = [7, 8];
    const pubSignals = [1, 750, 12345];

    await verifier.verifyAndStoreProof(pA, pB, pC, pubSignals);

    // Second submission with diff proof hash but same signals
    const pA2 = [9, 10];
    const pB2 = [[3, 4], [5, 6]];
    const pC2 = [7, 8];

    // We need to ensure proofHash is different so ProofAlreadyStored doesn't trigger.
    // Changing pA is enough.
    await expect(verifier.verifyAndStoreProof(pA2, pB2, pC2, pubSignals))
      .to.not.be.reverted;
  });
});
