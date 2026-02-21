export type AppRole = "holder" | "issuer" | "recruiter";

export interface RoleSession {
  accessToken: string | null;
  refreshToken: string | null;
  user: Record<string, unknown> | null;
}

export interface ApiError {
  error: string;
  message?: string;
  status?: number;
}
