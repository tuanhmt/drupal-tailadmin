import { cookies } from "next/headers";
import type { AccessToken } from "next-drupal";

/**
 * Authenticated Fetch Helper
 *
 * Server-side helper for making authenticated requests to Drupal JSON:API.
 * This function:
 * 1. Reads access_token from HttpOnly cookie
 * 2. Adds Authorization header to requests
 * 3. Handles token refresh if access_token is expired
 *
 * Usage in Server Components:
 * const data = await authFetch('/jsonapi/node/article');
 */
export async function authFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const drupalBaseUrl = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL;
  if (!drupalBaseUrl) {
    throw new Error("Drupal base URL not configured");
  }

  // Construct full URL
  const url = path.startsWith("http")
    ? path
    : `${drupalBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  // Make authenticated request with Bearer token
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `${accessToken.token_type} ${accessToken.access_token}`,
      "Content-Type": "application/json",
    },
  });

  // If token expired, attempt refresh
  // Note: In server-side context, we can't easily call our own API routes
  // For now, we'll let the 401 propagate and handle refresh at the component level
  // Alternatively, you can implement refresh logic here by directly calling Drupal OAuth
  if (response.status === 401) {
    throw new Error("Authentication expired. Please log in again.");
  }

  return response;
}

/**
 * Get the full AccessToken object from cookies
 *
 * Returns the complete AccessToken with all properties (access_token, token_type, expires_in, refresh_token)
 */
export async function getAccessToken(): Promise<AccessToken | null> {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get("access_token")?.value;
  const tokenType = cookieStore.get("token_type")?.value || "Bearer";
  const expiresIn = cookieStore.get("expires_in")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (!accessToken) {
    return null;
  }

  return {
    access_token: accessToken,
    token_type: tokenType,
    expires_in: expiresIn ? parseInt(expiresIn, 10) : 3600,
    refresh_token: refreshToken,
  };
}

/**
 * Get just the access token string (for backward compatibility)
 */
export async function getAccessTokenString(): Promise<string | null> {
  const token = await getAccessToken();
  return token?.access_token || null;
}
