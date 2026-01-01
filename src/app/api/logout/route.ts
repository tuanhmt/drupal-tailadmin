import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Logout API Route Handler
 *
 * Clears authentication cookies to log out the user.
 * In a production system, you might also want to:
 * - Revoke the refresh_token on Drupal side (if Drupal supports it)
 * - Log the logout event for audit purposes
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Clear all authentication cookies (AccessToken properties)
    cookieStore.delete("access_token");
    cookieStore.delete("token_type");
    cookieStore.delete("expires_in");
    cookieStore.delete("refresh_token");

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
