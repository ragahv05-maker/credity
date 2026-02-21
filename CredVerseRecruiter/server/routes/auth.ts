import { Router } from "express";
import { storage } from "../storage";
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  refreshAccessToken,
  invalidateRefreshToken,
  invalidateAccessToken,
  verifyAccessToken,
  authMiddleware,
  checkRateLimit,
  AuthUser,
} from "../services/auth-service";

const router = Router();

/**
 * Register a new user
 */
router.post("/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    // Rate limit registration
    if (!checkRateLimit(`register:${req.ip}`, 5, 60 * 60 * 1000)) {
      return res.status(429).json({ error: "Too many registration attempts" });
    }

    // Check if user exists
    const existing = await storage.getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: "Username already exists" });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await storage.createUser({
      username,
      password: passwordHash,
    });

    // Generate tokens
    // Defaulting to "recruiter" role as it's not in DB
    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      role: "recruiter",
    };

    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(authUser);

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: "recruiter",
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes
      },
    });
  } catch (error: any) {
    console.error("[Auth] Register error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

/**
 * Login with username/password
 */
router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    // Rate limit login attempts
    if (!checkRateLimit(`login:${username}`, 10, 15 * 60 * 1000)) {
      return res
        .status(429)
        .json({ error: "Too many login attempts. Try again later." });
    }

    // Find user
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate tokens
    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      role: "recruiter",
    };

    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(authUser);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: "recruiter",
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900,
      },
    });
  } catch (error: any) {
    console.error("[Auth] Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * Refresh access token
 */
router.post("/auth/refresh", (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    const tokens = refreshAccessToken(refreshToken);
    if (!tokens) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    res.json({
      success: true,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 900,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Token refresh failed" });
  }
});

/**
 * Logout - invalidate tokens
 */
router.post("/auth/logout", authMiddleware, (req, res) => {
  try {
    const { refreshToken } = req.body;
    const authHeader = req.headers.authorization;

    if (refreshToken) {
      invalidateRefreshToken(refreshToken);
    }

    if (authHeader) {
      const accessToken = authHeader.substring(7);
      invalidateAccessToken(accessToken);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Logout failed" });
  }
});

/**
 * Get current user profile
 */
router.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await storage.getUser(String(req.user!.userId));
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      username: user.username,
      role: "recruiter",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get profile" });
  }
});

/**
 * Verify token - Cross-app token validation endpoint
 * Used by other CredVerse apps to validate tokens from this app
 */
router.post("/auth/verify-token", (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ valid: false, error: "Token required" });
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      return res
        .status(401)
        .json({ valid: false, error: "Invalid or expired token" });
    }

    res.json({
      valid: true,
      user: {
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
      },
      app: "recruiter",
    });
  } catch (error) {
    res.status(500).json({ valid: false, error: "Token verification failed" });
  }
});

export default router;
