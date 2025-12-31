import { cookies } from "next/headers";

/**
 * JWT Token Decoder
 *
 * Decodes JWT tokens to extract claims (scopes, user info, etc.)
 *
 * IMPORTANT: This only DECODES the token, it does NOT VERIFY the signature.
 * For an internal admin dashboard, this is acceptable because:
 * - Tokens come from trusted Drupal server
 * - Tokens are stored in HttpOnly cookies (not accessible to client)
 * - Middleware checks token existence before allowing access
 *
 * For production systems requiring signature verification, use a JWT library
 * like 'jose' or 'jsonwebtoken' with the OAuth2 public key.
 */

interface JWTPayload {
  sub?: string; // Subject (user ID)
  scopes?: string | string[]; // OAuth2 scopes
  exp?: number; // Expiration timestamp
  iat?: number; // Issued at timestamp
  [key: string]: unknown; // Other claims
}

/**
 * Decode JWT token without verification
 * JWT structure: header.payload.signature
 * We only need the payload (middle part)
 */
function decodeJWT(token: string): JWTPayload | null {
  try {
    // Split token into parts
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // Decode payload (second part)
    // JWT uses base64url encoding (not standard base64)
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    const decoded = Buffer.from(padded, "base64").toString("utf-8");

    return JSON.parse(decoded) as JWTPayload;
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
}

/**
 * Get decoded JWT payload from access_token cookie
 * Returns null if token is missing or invalid
 */
export async function getTokenPayload(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    return null;
  }

  return decodeJWT(accessToken);
}

/**
 * Check if token has expired
 * Returns true if token is expired or missing
 */
export async function isTokenExpired(): Promise<boolean> {
  const payload = await getTokenPayload();

  if (!payload || !payload.exp) {
    return true;
  }

  // exp is in seconds, Date.now() is in milliseconds
  return payload.exp * 1000 < Date.now();
}

/**
 * Get scopes from JWT token
 * Drupal Simple OAuth2 typically stores scopes as a space-separated string
 * or as an array in the 'scope' or 'scopes' claim
 */
export async function getTokenScopes(): Promise<string[]> {
  const payload = await getTokenPayload();

  if (!payload) {
    return [];
  }

  // Handle different scope formats
  if (Array.isArray(payload.scopes)) {
    return payload.scopes;
  }

  if (typeof payload.scopes === "string") {
    return payload.scopes.split(" ").filter(Boolean);
  }

  // Some OAuth2 implementations use 'scope' instead of 'scopes'
  if (typeof payload.scope === "string") {
    return payload.scope.split(" ").filter(Boolean);
  }

  if (Array.isArray(payload.scope)) {
    return payload.scope;
  }

  return [];
}

/**
 * Check if user has required scope(s)
 *
 * @param requiredScopes - Single scope string or array of scopes
 * @param requireAll - If true, user must have ALL scopes. If false, ANY scope is sufficient.
 * @returns true if user has required scope(s)
 */
export async function hasScope(
  requiredScopes: string | string[],
  requireAll: boolean = false
): Promise<boolean> {
  const userScopes = await getTokenScopes();
  const required = Array.isArray(requiredScopes)
    ? requiredScopes
    : [requiredScopes];

  if (requireAll) {
    // User must have ALL required scopes
    return required.every((scope) => userScopes.includes(scope));
  } else {
    // User must have AT LEAST ONE required scope
    return required.some((scope) => userScopes.includes(scope));
  }
}

/**
 * Get user ID from token (subject claim)
 */
export async function getUserId(): Promise<string | null> {
  const payload = await getTokenPayload();
  return payload?.sub || null;
}
