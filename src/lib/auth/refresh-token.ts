import { cookies } from "next/headers";
import type { AccessToken } from "next-drupal";

/**
 * Refreshes the OAuth2 access token using the refresh token.
 * This function can be called directly from server-side code.
 *
 * @returns The new access token object, or null if refresh failed
 */
export async function refreshAccessToken(): Promise<AccessToken | null> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!refreshToken) {
      return null;
    }

    // Get Drupal OAuth configuration
    const drupalBaseUrl = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL;
    const clientId = process.env.DRUPAL_CLIENT_ID;
    const clientSecret = process.env.DRUPAL_CLIENT_SECRET;

    if (!drupalBaseUrl || !clientId || !clientSecret) {
      console.error("Missing OAuth configuration");
      return null;
    }

    // Exchange refresh_token for new tokens
    const tokenUrl = `${drupalBaseUrl}/oauth/token`;

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      // If refresh fails, clear all token cookies
      cookieStore.delete("access_token");
      cookieStore.delete("token_type");
      cookieStore.delete("expires_in");
      cookieStore.delete("refresh_token");
      return null;
    }

    const tokenData = await tokenResponse.json();

    // Validate and type the token response as AccessToken
    const accessToken: AccessToken = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || "Bearer",
      expires_in: tokenData.expires_in || 3600,
      refresh_token: tokenData.refresh_token,
    };

    if (!accessToken.access_token || !accessToken.refresh_token) {
      return null;
    }

    // Calculate token expiration time
    const maxAge = accessToken.expires_in || 3600;

    // Update cookies with new tokens (refresh token rotation)
    cookieStore.set("access_token", accessToken.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: maxAge,
      path: "/",
    });

    cookieStore.set("token_type", accessToken.token_type, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: maxAge,
      path: "/",
    });

    cookieStore.set("expires_in", accessToken.expires_in.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: maxAge,
      path: "/",
    });

    cookieStore.set("refresh_token", accessToken.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return accessToken;
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}
