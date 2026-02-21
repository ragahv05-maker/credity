import { Router } from "express";
import crypto from "crypto";
import { walletService } from "../services/wallet-service";
import { didService } from "../services/did-service";
import { storage } from "../storage";
import { authMiddleware, hashPassword } from "../services/auth-service";
import { getAuthenticatedUserId } from "../utils/authz";

const router = Router();

// ============== Wallet Core & Status ==============

/**
 * Initialize wallet for authenticated user
 */
router.post("/wallet/init", authMiddleware, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    // Get or create user
    let user = await storage.getUser(userId);

    if (!user) {
      const generatedPasswordHash = await hashPassword(
        crypto.randomBytes(24).toString("base64url"),
      );
      user = await storage.createUser({
        username: `user_${userId}`,
        name: "Wallet User",
        password: generatedPasswordHash,
      });
    }

    let did = user?.did;

    if (!did) {
      const didKeyPair = await didService.createDID();
      did = didKeyPair.did;
      await storage.updateUser(user.id, { did });
    }

    // Initialize wallet
    await walletService.getOrCreateWallet(user.id, did);
    const stats = await walletService.getWalletStats(user.id);

    res.json({
      success: true,
      wallet: {
        did,
        credentialCount: stats.totalCredentials,
        initialized: true,
      },
      stats,
    });
  } catch (error) {
    console.error("Wallet init error:", error);
    res
      .status(500)
      .json({
        error: "Failed to initialize wallet",
        code: "WALLET_INIT_FAILED",
      });
  }
});

/**
 * Get wallet status
 */
router.get("/wallet/status", authMiddleware, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const wallet = await walletService.getOrCreateWallet(userId);
    const stats = await walletService.getWalletStats(userId);

    res.json({
      did: wallet.did,
      stats,
      lastSync: wallet.lastSync,
    });
  } catch (error) {
    console.error("Wallet status error:", error);
    res
      .status(500)
      .json({
        error: "Failed to get wallet status",
        code: "WALLET_STATUS_FAILED",
      });
  }
});

// ============== DID Management ==============

/**
 * Create a new DID for user (Manual)
 */
router.post("/did/create", authMiddleware, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    // Create new DID
    const didKeyPair = await didService.createDID();

    // Update user with DID
    const user = await storage.getUser(userId);
    if (!user) {
      return res
        .status(404)
        .json({ error: "User not found", code: "USER_NOT_FOUND" });
    }

    await storage.updateUser(userId, { did: didKeyPair.did });

    // Log activity
    await storage.createActivity({
      userId,
      type: "did_created",
      description: `DID created: ${didKeyPair.did.slice(0, 30)}...`,
    });

    res.json({
      success: true,
      did: didKeyPair.did,
      message: "DID created successfully",
    });
  } catch (error) {
    console.error("Error creating DID:", error);
    res
      .status(500)
      .json({ error: "Failed to create DID", code: "DID_CREATE_FAILED" });
  }
});

/**
 * Resolve a DID to its document
 */
router.get("/did/resolve/:did", async (req, res) => {
  try {
    const { did } = req.params;
    const result = await didService.resolveDID(decodeURIComponent(did));

    if (result.didResolutionMetadata.error) {
      return res
        .status(400)
        .json({
          error: result.didResolutionMetadata.error,
          code: "DID_RESOLVE_INVALID",
        });
    }

    res.json(result);
  } catch (error) {
    console.error("Error resolving DID:", error);
    res
      .status(500)
      .json({ error: "Failed to resolve DID", code: "DID_RESOLVE_FAILED" });
  }
});

// ============== Backup & Recovery ==============

/**
 * Create wallet backup
 */
router.post("/wallet/backup", authMiddleware, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const { backupData, backupKey } = await walletService.createBackup(userId);

    await storage.createActivity({
      userId,
      type: "backup_created",
      description: "Wallet backup created",
    });

    res.json({
      success: true,
      backupData,
      backupKey,
      warning: "Store your backup key securely. It cannot be recovered.",
    });
  } catch (error) {
    console.error("Create backup error:", error);
    res
      .status(500)
      .json({ error: "Failed to create backup", code: "BACKUP_CREATE_FAILED" });
  }
});

/**
 * Restore from backup
 */
router.post("/wallet/restore", authMiddleware, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const { backupData, backupKey } = req.body;

    if (!backupData || !backupKey) {
      return res
        .status(400)
        .json({
          error: "backupData and backupKey required",
          code: "BACKUP_PAYLOAD_REQUIRED",
        });
    }

    const wallet = await walletService.restoreFromBackup(backupData, backupKey);

    if (wallet.userId !== userId) {
      return res
        .status(403)
        .json({
          error: "Backup belongs to a different user",
          code: "BACKUP_USER_MISMATCH",
        });
    }

    res.json({
      success: true,
      message: "Wallet restored successfully",
      credentialsRestored: wallet.credentials.length,
    });
  } catch (error) {
    console.error("Restore backup error:", error);
    res
      .status(500)
      .json({
        error: "Failed to restore backup. Check your backup key.",
        code: "BACKUP_RESTORE_FAILED",
      });
  }
});

export default router;
