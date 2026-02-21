/**
 * Google OAuth service for CredVerse Gateway
 */

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

let config: OAuthConfig | null = null;

/**
 * Initialize Google OAuth configuration
 */
export function initGoogleOAuth(oauthConfig: OAuthConfig): void {
  config = oauthConfig;
}

/**
 * Get Google OAuth authorization URL
 */
export function getAuthorizationUrl(state: string): string {
  if (!config) {
    throw new Error("Google OAuth not configured");
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
): Promise<{ accessToken: string; idToken: string }> {
  if (!config) {
    throw new Error("Google OAuth not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange code for tokens");
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    idToken: data.id_token,
  };
}

/**
 * Get user info from Google
 */
export async function getGoogleUserInfo(
  accessToken: string,
): Promise<GoogleUser> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to get user info");
  }

  const data = await response.json();
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture,
  };
}

/**
 * Check if Google OAuth is configured
 */
export function isGoogleOAuthConfigured(): boolean {
  return config !== null;
}
