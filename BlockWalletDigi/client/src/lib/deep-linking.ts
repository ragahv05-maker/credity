/**
 * Deep Linking Support for Credential Wallet
 *
 * Handles custom URL schemes and universal links for:
 * - Receiving credentials from issuers
 * - Opening specific credentials
 * - Initiating verification flows
 *
 * URL Schemes:
 * - credverse://receive?token=<offer_id>
 * - credverse://credential/<credential_id>
 * - credverse://verify?token=<share_token>
 * - https://wallet.credverse.io/receive?token=<offer_id>
 */

export interface DeepLinkParams {
  action: "receive" | "credential" | "verify" | "connect" | "unknown";
  token?: string;
  credentialId?: string;
  issuer?: string;
  redirectUrl?: string;
}

/**
 * Parse a deep link URL
 */
export function parseDeepLink(url: string): DeepLinkParams {
  try {
    // Handle custom scheme
    const normalized = url
      .replace("credverse://", "https://app.credverse.io/")
      .replace("blockcred://", "https://app.credverse.io/");

    const parsed = new URL(normalized);
    const pathname = parsed.pathname;
    const params = parsed.searchParams;

    // Receive credential offer
    if (pathname.includes("/receive") || params.has("offer")) {
      return {
        action: "receive",
        token: params.get("token") || params.get("offer") || undefined,
        issuer: params.get("issuer") || undefined,
        redirectUrl: params.get("redirect") || undefined,
      };
    }

    // View specific credential
    if (pathname.match(/\/credential\/([\w-]+)/)) {
      const match = pathname.match(/\/credential\/([\w-]+)/);
      return {
        action: "credential",
        credentialId: match?.[1],
      };
    }

    // Verify a shared credential
    if (pathname.includes("/verify")) {
      return {
        action: "verify",
        token: params.get("token") || pathname.split("/").pop() || undefined,
      };
    }

    // Connect to DigiLocker or other service
    if (pathname.includes("/connect")) {
      return {
        action: "connect",
        token: params.get("code") || undefined,
      };
    }

    return { action: "unknown" };
  } catch {
    return { action: "unknown" };
  }
}

/**
 * Generate a deep link for sharing
 */
export function generateDeepLink(
  action: "receive" | "verify" | "credential",
  params: Record<string, string>,
): { webUrl: string; appUrl: string } {
  const baseWeb = "https://wallet.credverse.io";
  const baseApp = "credverse://";

  const queryString = new URLSearchParams(params).toString();

  switch (action) {
    case "receive":
      return {
        webUrl: `${baseWeb}/receive?${queryString}`,
        appUrl: `${baseApp}receive?${queryString}`,
      };
    case "verify":
      return {
        webUrl: `${baseWeb}/verify/${params.token || ""}`,
        appUrl: `${baseApp}verify?token=${params.token || ""}`,
      };
    case "credential":
      return {
        webUrl: `${baseWeb}/credential/${params.id || ""}`,
        appUrl: `${baseApp}credential/${params.id || ""}`,
      };
  }
}

/**
 * Hook to handle deep links on app load
 */
export function useDeepLinkHandler(handlers: {
  onReceive?: (token: string) => void;
  onCredential?: (id: string) => void;
  onVerify?: (token: string) => void;
  onConnect?: (code: string) => void;
}) {
  // Check URL on mount
  if (typeof window !== "undefined") {
    const url = window.location.href;
    const params = parseDeepLink(url);

    switch (params.action) {
      case "receive":
        if (params.token && handlers.onReceive) {
          handlers.onReceive(params.token);
        }
        break;
      case "credential":
        if (params.credentialId && handlers.onCredential) {
          handlers.onCredential(params.credentialId);
        }
        break;
      case "verify":
        if (params.token && handlers.onVerify) {
          handlers.onVerify(params.token);
        }
        break;
      case "connect":
        if (params.token && handlers.onConnect) {
          handlers.onConnect(params.token);
        }
        break;
    }
  }
}

/**
 * Generate OID4VCI credential offer URL
 * Following OpenID for Verifiable Credential Issuance spec
 */
export function generateOID4VCIOfferUrl(params: {
  credentialOfferId: string;
  issuerUrl: string;
  credentialType: string;
}): string {
  const base = "openid-credential-offer://";
  const offerParams = new URLSearchParams({
    credential_offer_uri: `${params.issuerUrl}/credential-offer/${params.credentialOfferId}`,
  });

  return `${base}?${offerParams.toString()}`;
}

/**
 * Parse OID4VP presentation request
 * Following OpenID for Verifiable Presentations spec
 */
export function parseOID4VPRequest(url: string): {
  responseUri: string;
  presentationDefinition: any;
  nonce: string;
} | null {
  try {
    const parsed = new URL(url.replace("openid-vc://", "https://"));
    const params = parsed.searchParams;

    return {
      responseUri: params.get("response_uri") || "",
      presentationDefinition: JSON.parse(
        params.get("presentation_definition") || "{}",
      ),
      nonce: params.get("nonce") || "",
    };
  } catch {
    return null;
  }
}
