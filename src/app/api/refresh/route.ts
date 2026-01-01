import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { AccessToken } from "next-drupal";

/**
 * Token Refresh API Route Handler
 *
 * Implements refresh token rotation for enhanced security.
 * When access_token expires, client calls this endpoint with refresh_token.
 *
 * Security features:
 * - Refresh token rotation (new refresh_token issued on each refresh)
 * - Old refresh_token invalidated after use
 * - Prevents token reuse if compromised
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token not found" },
        { status: 401 }
      );
    }

    // Get Drupal OAuth configuration
    const drupalBaseUrl = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL;
    const clientId = process.env.DRUPAL_CLIENT_ID;
    const clientSecret = process.env.DRUPAL_CLIENT_SECRET;

    if (!drupalBaseUrl || !clientId || !clientSecret) {
      console.error("Missing OAuth configuration");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Exchange refresh_token for new tokens
    // Drupal Simple OAuth2 should support refresh_token grant type
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
      // If refresh fails, clear all token cookies and require re-login
      cookieStore.delete("access_token");
      cookieStore.delete("token_type");
      cookieStore.delete("expires_in");
      cookieStore.delete("refresh_token");

      const errorData = await tokenResponse.json().catch(() => ({}));

      return NextResponse.json(
        {
          error: errorData.error_description || "Token refresh failed",
          requiresLogin: true,
        },
        { status: 401 }
      );
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
      return NextResponse.json(
        { error: "Invalid token response from server" },
        { status: 500 }
      );
    }

    // Calculate token expiration time
    const maxAge = accessToken.expires_in || 3600;

    // Update cookies with new tokens (refresh token rotation)
    // Old refresh_token is invalidated by Drupal, new one is set
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

    // Return success response with AccessToken (excluding refresh_token for security)
    return NextResponse.json(
      {
        success: true,
        token: {
          access_token: accessToken.access_token,
          token_type: accessToken.token_type,
          expires_in: accessToken.expires_in,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
