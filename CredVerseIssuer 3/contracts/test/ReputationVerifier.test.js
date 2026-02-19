const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReputationVerifier", function () {
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

  it("stores proof hash when verifier accepts proof", async function () {
    const pA = [1, 2];
    const pB = [[3, 4], [5, 6]];
    const pC = [7, 8];
    const pubSignals = [1, 750, 12345]; // circuitId=1, expected len 3

    const tx = await verifier.verifyAndStoreProof(pA, pB, pC, pubSignals);
    const receipt = await tx.wait();

    const event = receipt.logs.find((l) => l.fragment && l.fragment.name === "ProofVerified");
    expect(event).to.not.equal(undefined);

    const proofHash = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256[2]", "uint256[2][2]", "uint256[2]", "uint256[]"],
        [pA, pB, pC, pubSignals]
      )
    );

    expect(await verifier.proofExists(proofHash)).to.equal(true);
  });

  it("reverts when underlying verifier returns false", async function () {
    await mock2.setShouldVerify(false);

    await expect(
      verifier.verifyAndStoreProof([1, 2], [[3, 4], [5, 6]], [7, 8], [2, 20060101, 999])
    ).to.be.revertedWithCustomError(verifier, "InvalidProof");
  });

  it("reverts on duplicate proof submission", async function () {
    const args = [[11, 12], [[13, 14], [15, 16]], [17, 18], [3, 3, 80, 90, 123]];
    await verifier.verifyAndStoreProof(...args);

    await expect(verifier.verifyAndStoreProof(...args)).to.be.revertedWithCustomError(
      verifier,
      "ProofAlreadyStored"
    );
  });

  it("routes verification by circuit id and allows admin verifier rotation", async function () {
    const Mock = await ethers.getContractFactory("MockGroth16Verifier");
    const newMock = await Mock.deploy();
    await newMock.waitForDeployment();

    await expect(verifier.setCircuitVerifier(1, await newMock.getAddress()))
      .to.emit(verifier, "ZkVerifierUpdated");

    expect(await verifier.zkVerifierByCircuit(1)).to.equal(await newMock.getAddress());
  });

  it("blocks non-admin verifier rotation", async function () {
    await expect(verifier.connect(other).setCircuitVerifier(1, await mock1.getAddress())).to.be.reverted;
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
});
