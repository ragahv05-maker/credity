const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CredVerseRegistry", function () {
  let registry;
  let owner, issuer, otherIssuer, otherAccount;

  beforeEach(async function () {
    [owner, issuer, otherIssuer, otherAccount] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CredVerseRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
  });

  describe("Issuer Registration", function () {
    it("Should register an issuer", async function () {
      await registry.registerIssuer(
        issuer.address,
        "did:example:123",
        "example.com",
      );
      const issuerData = await registry.issuers(issuer.address);
      expect(issuerData.isRegistered).to.equal(true);
      expect(issuerData.did).to.equal("did:example:123");
    });

    it("Should reject duplicate issuer registration", async function () {
      await registry.registerIssuer(
        issuer.address,
        "did:example:123",
        "example.com",
      );
      await expect(
        registry.registerIssuer(issuer.address, "did:example:456", "other.com"),
      ).to.be.revertedWithCustomError(registry, "IssuerAlreadyRegistered");
    });

    it("Should reject zero address registration", async function () {
      await expect(
        registry.registerIssuer(
          ethers.ZeroAddress,
          "did:example:123",
          "example.com",
        ),
      ).to.be.revertedWithCustomError(registry, "InvalidAddress");
    });

    it("Should reject empty DID or domain", async function () {
      await expect(
        registry.registerIssuer(issuer.address, "", "example.com"),
      ).to.be.revertedWithCustomError(registry, "InvalidIssuerMetadata");

      await expect(
        registry.registerIssuer(issuer.address, "did:example:123", ""),
      ).to.be.revertedWithCustomError(registry, "InvalidIssuerMetadata");
    });
  });

  describe("Credential Anchoring", function () {
    beforeEach(async function () {
      await registry.registerIssuer(
        issuer.address,
        "did:example:123",
        "example.com",
      );
    });

    it("Should anchor credential", async function () {
      const hash = ethers.id("credential-data");
      await registry.connect(issuer).anchorCredential(hash);
      const anchor = await registry.anchors(hash);
      expect(anchor.submitter).to.equal(issuer.address);
      expect(anchor.exists).to.equal(true);
    });

    it("Should reject duplicate anchor", async function () {
      const hash = ethers.id("credential-data");
      await registry.connect(issuer).anchorCredential(hash);
      await expect(
        registry.connect(issuer).anchorCredential(hash),
      ).to.be.revertedWithCustomError(registry, "AnchorAlreadyExists");
    });

    it("Should reject zero hash", async function () {
      await expect(
        registry.connect(issuer).anchorCredential(ethers.ZeroHash),
      ).to.be.revertedWithCustomError(registry, "InvalidHash");
    });
  });

  describe("Credential Revocation", function () {
    beforeEach(async function () {
      await registry.registerIssuer(
        issuer.address,
        "did:example:123",
        "example.com",
      );
      await registry.registerIssuer(
        otherIssuer.address,
        "did:example:456",
        "other.com",
      );
    });

    it("Should revoke credential", async function () {
      const hash = ethers.id("credential-revoke");
      await registry.connect(issuer).anchorCredential(hash);
      await registry.connect(issuer).revokeCredential(hash);
      expect(await registry.isRevoked(hash)).to.equal(true);
    });

    it("Should reject revocation for non-anchored credential", async function () {
      const hash = ethers.id("unanchored-credential");
      await expect(
        registry.connect(issuer).revokeCredential(hash),
      ).to.be.revertedWithCustomError(registry, "CredentialNotAnchored");
    });

    it("Should reject revocation by a different issuer", async function () {
      const hash = ethers.id("credential-owned-by-issuer-1");
      await registry.connect(issuer).anchorCredential(hash);
      await expect(
        registry.connect(otherIssuer).revokeCredential(hash),
      ).to.be.revertedWithCustomError(
        registry,
        "UnauthorizedCredentialRevocation",
      );
    });

    it("Should reject duplicate credential revocation", async function () {
      const hash = ethers.id("credential-revoke");
      await registry.connect(issuer).anchorCredential(hash);
      await registry.connect(issuer).revokeCredential(hash);
      await expect(
        registry.connect(issuer).revokeCredential(hash),
      ).to.be.revertedWithCustomError(registry, "CredentialAlreadyRevoked");
    });
  });

  describe("Issuer Revocation", function () {
    beforeEach(async function () {
      await registry.registerIssuer(
        issuer.address,
        "did:example:123",
        "example.com",
      );
    });

    it("Should allow admin to revoke issuer", async function () {
      await registry.revokeIssuer(issuer.address);
      const issuerData = await registry.issuers(issuer.address);
      expect(issuerData.isRevoked).to.equal(true);
      expect(await registry.isActiveIssuer(issuer.address)).to.equal(false);
    });

    it("Should reject duplicate issuer revocation", async function () {
      await registry.revokeIssuer(issuer.address);
      await expect(
        registry.revokeIssuer(issuer.address),
      ).to.be.revertedWithCustomError(registry, "IssuerAlreadyRevoked");
    });

    it("Should prevent revoked issuer from anchoring", async function () {
      await registry.revokeIssuer(issuer.address);
      const hash = ethers.id("credential-data");
      await expect(registry.connect(issuer).anchorCredential(hash)).to.be
        .reverted;
    });

    it("Should prevent revoked issuer from revoking credentials", async function () {
      await registry.revokeIssuer(issuer.address);
      const hash = ethers.id("credential-data");
      await expect(registry.connect(issuer).revokeCredential(hash)).to.be
        .reverted;
    });
  });

  describe("Admin Emergency Revocation", function () {
    beforeEach(async function () {
      await registry.registerIssuer(
        issuer.address,
        "did:example:123",
        "example.com",
      );
    });

    it("Should allow admin to revoke an anchored credential", async function () {
      const hash = ethers.id("credential-admin-revoke");
      await registry.connect(issuer).anchorCredential(hash);

      await registry.adminRevokeCredential(hash);
      expect(await registry.isRevoked(hash)).to.equal(true);
    });

    it("Should reject admin revocation for non-anchored credential", async function () {
      const hash = ethers.id("credential-not-anchored");
      await expect(
        registry.adminRevokeCredential(hash),
      ).to.be.revertedWithCustomError(registry, "CredentialNotAnchored");
    });

    it("Should reject duplicate admin credential revocation", async function () {
      const hash = ethers.id("credential-admin-duplicate-revoke");
      await registry.connect(issuer).anchorCredential(hash);
      await registry.adminRevokeCredential(hash);

      await expect(
        registry.adminRevokeCredential(hash),
      ).to.be.revertedWithCustomError(registry, "CredentialAlreadyRevoked");
    });

    it("Should reject admin revocation from non-admin account", async function () {
      const hash = ethers.id("credential-admin-access-control");
      await registry.connect(issuer).anchorCredential(hash);

      await expect(registry.connect(otherAccount).adminRevokeCredential(hash))
        .to.be.reverted;
    });
  });

  describe("Pause / Access Control / Event Integrity", function () {
    const did = "did:example:123";
    const domain = "example.com";

    beforeEach(async function () {
      await registry.registerIssuer(issuer.address, did, domain);
    });

    it("Should emit IssuerRegistered with exact payload", async function () {
      const newDid = "did:example:789";
      const newDomain = "issuer789.com";
      await expect(
        registry.registerIssuer(otherIssuer.address, newDid, newDomain),
      )
        .to.emit(registry, "IssuerRegistered")
        .withArgs(otherIssuer.address, newDid, newDomain);
    });

    it("Should emit AnchorSubmitted with submitter and current block timestamp", async function () {
      const hash = ethers.id("event-anchor");
      const tx = await registry.connect(issuer).anchorCredential(hash);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(registry, "AnchorSubmitted")
        .withArgs(hash, issuer.address, block.timestamp);
    });

    it("Should emit CredentialRevoked with admin as revoker for emergency revoke", async function () {
      const hash = ethers.id("event-admin-revoke");
      await registry.connect(issuer).anchorCredential(hash);

      const tx = await registry.adminRevokeCredential(hash);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(registry, "CredentialRevoked")
        .withArgs(hash, owner.address, block.timestamp);
    });

    it("Should allow admin emergency revoke after issuer is revoked", async function () {
      const hash = ethers.id("compromised-issuer-credential");
      await registry.connect(issuer).anchorCredential(hash);
      await registry.revokeIssuer(issuer.address);

      await registry.adminRevokeCredential(hash);
      expect(await registry.isRevoked(hash)).to.equal(true);
    });

    it("Should enforce admin-only access for register/revoke/pause controls", async function () {
      await expect(
        registry
          .connect(otherAccount)
          .registerIssuer(otherIssuer.address, "did:x", "x.com"),
      ).to.be.revertedWithCustomError(
        registry,
        "AccessControlUnauthorizedAccount",
      );

      await expect(
        registry.connect(otherAccount).revokeIssuer(issuer.address),
      ).to.be.revertedWithCustomError(
        registry,
        "AccessControlUnauthorizedAccount",
      );

      await expect(
        registry.connect(otherAccount).pause(),
      ).to.be.revertedWithCustomError(
        registry,
        "AccessControlUnauthorizedAccount",
      );

      await expect(
        registry.connect(otherAccount).unpause(),
      ).to.be.revertedWithCustomError(
        registry,
        "AccessControlUnauthorizedAccount",
      );
    });

    it("Should block state-changing ops while paused and recover after unpause", async function () {
      const hash = ethers.id("paused-behavior");
      await registry.pause();

      await expect(
        registry.registerIssuer(
          otherIssuer.address,
          "did:paused",
          "paused.com",
        ),
      ).to.be.revertedWithCustomError(registry, "EnforcedPause");

      await expect(
        registry.connect(issuer).anchorCredential(hash),
      ).to.be.revertedWithCustomError(registry, "EnforcedPause");

      await expect(
        registry.connect(issuer).revokeCredential(hash),
      ).to.be.revertedWithCustomError(registry, "EnforcedPause");

      await expect(
        registry.adminRevokeCredential(hash),
      ).to.be.revertedWithCustomError(registry, "EnforcedPause");

      await expect(registry.unpause()).to.not.be.reverted;

      await expect(registry.connect(issuer).anchorCredential(hash)).to.not.be
        .reverted;
    });

    it("Should enforce idempotency for pause/unpause lifecycle", async function () {
      await registry.pause();
      await expect(registry.pause()).to.be.revertedWithCustomError(
        registry,
        "EnforcedPause",
      );

      await registry.unpause();
      await expect(registry.unpause()).to.be.revertedWithCustomError(
        registry,
        "ExpectedPause",
      );
    });
  });

  describe("View Functions", function () {
    it("Should check anchor exists", async function () {
      await registry.registerIssuer(
        issuer.address,
        "did:example:123",
        "example.com",
      );
      const hash = ethers.id("credential-data");
      expect(await registry.anchorExists(hash)).to.equal(false);
      await registry.connect(issuer).anchorCredential(hash);
      expect(await registry.anchorExists(hash)).to.equal(true);
    });

    it("Should check active issuer status", async function () {
      expect(await registry.isActiveIssuer(issuer.address)).to.equal(false);
      await registry.registerIssuer(
        issuer.address,
        "did:example:123",
        "example.com",
      );
      expect(await registry.isActiveIssuer(issuer.address)).to.equal(true);
    });
  });
});
