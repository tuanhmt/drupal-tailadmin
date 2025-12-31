import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

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
      // If refresh fails, clear cookies and require re-login
      cookieStore.delete("access_token");
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
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { error: "Invalid token response from server" },
        { status: 500 }
      );
    }

    // Calculate token expiration time
    const maxAge = expires_in || 3600;

    // Update cookies with new tokens (refresh token rotation)
    // Old refresh_token is invalidated by Drupal, new one is set
    cookieStore.set("access_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: maxAge,
      path: "/",
    });

    cookieStore.set("refresh_token", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.json(
      {
        success: true,
        expires_in: maxAge,
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
