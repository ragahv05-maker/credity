
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReputationVerifier (updated)", function () {
  let owner, other;
  let mock1, mock2, mock3, verifier;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();

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

  it("stores proof hash when verifier accepts proof (circuit 1)", async function () {
    const pA = [1, 2];
    const pB = [[3, 4], [5, 6]];
    const pC = [7, 8];
    const pubSignals = [1, 750, 12345]; // circuitId=1, expected len 3

    const tx = await verifier.verifyAndStoreProof(pA, pB, pC, pubSignals);
    const receipt = await tx.wait();

    const event = receipt.logs.find((l) => l.fragment && l.fragment.name === "ProofVerified");
    expect(event).to.not.equal(undefined);
  });

  it("stores proof hash when verifier accepts proof (circuit 3)", async function () {
    const pA = [1, 2];
    const pB = [[3, 4], [5, 6]];
    const pC = [7, 8];
    const pubSignals = [3, 3, 80, 90, 123]; // circuitId=3, expected len 5

    const tx = await verifier.verifyAndStoreProof(pA, pB, pC, pubSignals);
    const receipt = await tx.wait();

    const event = receipt.logs.find((l) => l.fragment && l.fragment.name === "ProofVerified");
    expect(event).to.not.equal(undefined);
  });

  it("reverts when underlying verifier returns false", async function () {
    await mock2.setShouldVerify(false);

    await expect(
      verifier.verifyAndStoreProof([1, 2], [[3, 4], [5, 6]], [7, 8], [2, 20060101, 999])
    ).to.be.revertedWithCustomError(verifier, "InvalidProof");
  });

  it("same proof from same sender gets different hashes (nonce increments)", async function () {
    const args = [[11, 12], [[13, 14], [15, 16]], [17, 18], [1, 750, 123]];

    const tx1 = await verifier.verifyAndStoreProof(...args);
    const receipt1 = await tx1.wait();
    const event1 = receipt1.logs.find((l) => l.fragment && l.fragment.name === "ProofVerified");

    const tx2 = await verifier.verifyAndStoreProof(...args);
    const receipt2 = await tx2.wait();
    const event2 = receipt2.logs.find((l) => l.fragment && l.fragment.name === "ProofVerified");

    // Both should succeed (nonce makes hash unique)
    expect(event1).to.not.equal(undefined);
    expect(event2).to.not.equal(undefined);

    // Nonce should have incremented
    const nonce = await verifier.submitterNonce(owner.address);
    expect(nonce).to.equal(2n);
  });

  it("routes verification by circuit id and allows admin verifier rotation (circuit 1/2)", async function () {
    const Mock = await ethers.getContractFactory("MockGroth16Verifier");
    const newMock = await Mock.deploy();
    await newMock.waitForDeployment();

    await expect(verifier.setCircuitVerifier3(1, await newMock.getAddress()))
      .to.emit(verifier, "ZkVerifier3Updated");

    expect(await verifier.getVerifier3(1)).to.equal(await newMock.getAddress());
  });

  it("allows admin to rotate circuit 5 verifier", async function () {
    const Mock = await ethers.getContractFactory("MockGroth16Verifier");
    const newMock = await Mock.deploy();
    await newMock.waitForDeployment();

    await expect(verifier.setCircuitVerifier5(await newMock.getAddress()))
      .to.emit(verifier, "ZkVerifier5Updated");

    expect(await verifier.getVerifier5()).to.equal(await newMock.getAddress());
  });

  it("blocks non-admin verifier rotation", async function () {
    await expect(verifier.connect(other).setCircuitVerifier3(1, await mock1.getAddress())).to.be.reverted;
  });

  it("reverts when circuit id is missing or unsupported", async function () {
    await expect(
      verifier.verifyAndStoreProof([1, 2], [[3, 4], [5, 6]], [7, 8], [])
    ).to.be.revertedWithCustomError(verifier, "InvalidCircuitId");

    await expect(
      verifier.verifyAndStoreProof([1, 2], [[3, 4], [5, 6]], [7, 8], [99, 1, 2])
    ).to.be.revertedWithCustomError(verifier, "InvalidCircuitId");
  });

  it("reverts when public signal length does not match circuit expectation", async function () {
    await expect(
      verifier.verifyAndStoreProof([1, 2], [[3, 4], [5, 6]], [7, 8], [1, 750])
    ).to.be.revertedWithCustomError(verifier, "PublicSignalsLengthMismatch");
  });

  it("supports pause and unpause", async function () {
    await verifier.pause();
    await expect(
      verifier.verifyAndStoreProof([1, 2], [[3, 4], [5, 6]], [7, 8], [1, 750, 123])
    ).to.be.revertedWithCustomError(verifier, "EnforcedPause");

    await verifier.unpause();
    await expect(
      verifier.verifyAndStoreProof([1, 2], [[3, 4], [5, 6]], [7, 8], [1, 750, 123])
    ).to.not.be.reverted;
  });

  it("rejects verifier3 set for circuit 3", async function () {
    await expect(
      verifier.setCircuitVerifier3(3, await mock1.getAddress())
    ).to.be.revertedWithCustomError(verifier, "InvalidCircuitId");
  });
});
