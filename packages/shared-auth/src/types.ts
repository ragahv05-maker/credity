/**
 * Shared auth types for CredVerse applications
 */

export interface AuthUser {
  id: string | number;
  username: string;
  email?: string;
  role:
    | "admin"
    | "issuer"
    | "holder"
    | "verifier"
    | "recruiter"
    | "user"
    | "viewer";
  app?: "issuer" | "wallet" | "recruiter" | "gateway";
}

export interface TokenPayload {
  userId: string | number;
  username: string;
  role: string;
  type: "access" | "refresh";
  app?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface VerifyTokenResult {
  valid: boolean;
  user?: {
    userId: string | number;
    username: string;
    role: string;
  };
  app?: string;
  error?: string;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  accessTokenExpiry?: string;
  refreshTokenExpiry?: string;
  app?: string;
}
