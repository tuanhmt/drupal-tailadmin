import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AccessToken } from "next-drupal";

/**
 * Login API Route Handler
 *
 * Handles username/password authentication via Drupal Simple OAuth2.
 * This route is server-side only to protect the client_secret.
 *
 * Flow:
 * 1. Receive username/password from client
 * 2. Exchange credentials for access_token and refresh_token via Drupal OAuth2
 * 3. Store tokens in HttpOnly cookies (secure, not accessible to JavaScript)
 * 4. Redirect to dashboard on success
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input - username and password are required
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Get Drupal OAuth configuration from environment
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

    // Exchange username/password for tokens using Drupal Simple OAuth2 Password Grant
    // This is the only place where client_secret is used - never exposed to browser
    const tokenUrl = `${drupalBaseUrl}/oauth/token`;

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: clientId,
        client_secret: clientSecret,
        username: username,
        password: password,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));

      // Return appropriate error based on Drupal response
      if (tokenResponse.status === 401) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: errorData.error_description || "Authentication failed" },
        { status: tokenResponse.status }
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
    // expires_in is typically in seconds (e.g., 3600 for 1 hour)
    const maxAge = accessToken.expires_in || 3600; // Default to 1 hour if not provided

    // Set HttpOnly cookies with secure settings
    // HttpOnly prevents JavaScript access (XSS protection)
    // Secure ensures cookies only sent over HTTPS (production)
    // SameSite=Lax provides CSRF protection while allowing navigation
    const cookieStore = await cookies();

    // Store AccessToken properties in separate cookies
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
      maxAge: 60 * 60 * 24 * 30, // 30 days for refresh token
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
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
