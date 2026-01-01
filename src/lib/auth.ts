import { cookies } from "next/headers";
import type { AccessToken } from "next-drupal";

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
