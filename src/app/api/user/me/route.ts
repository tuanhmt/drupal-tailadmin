import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth/token";
import { refreshAccessToken } from "@/lib/auth/refresh-token";
import { getUsername } from "@/lib/auth/cookies";
import { drupal } from "@/lib/drupal/client";
import { AccessToken } from "next-drupal";
import { createAccessTokenObject } from "@/lib/drupal/api-helpers";
import { DrupalJsonApiParams } from "drupal-jsonapi-params";

/**
 * Get current logged-in user
 * Fetches the user by username stored during login
 */
export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    const username = await getUsername();

    if (!accessToken || !username) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const accessTokenObject = createAccessTokenObject(accessToken);

    // Fetch user by name from Drupal
    const jsonParams = new DrupalJsonApiParams()
      .addFilter("name", username)
      .addPageLimit(1);

    const users = await drupal.getResourceCollection<any[]>("user--user", {
      params: jsonParams,
      withAuth: accessTokenObject,
    });

    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = users[0];

    return NextResponse.json({ data: user });
  } catch (error: any) {
    console.error("Error fetching current user:", error);

    if (error?.statusCode === 401) {
      // Try to refresh the token
      const newToken = await refreshAccessToken();

      if (!newToken) {
        return NextResponse.json(
          { error: "Authentication failed. Please login again." },
          { status: 401 }
        );
      }

      try {
        const username = await getUsername();
        if (!username) {
          return NextResponse.json(
            { error: "User information not available" },
            { status: 401 }
          );
        }

        const accessTokenObject: AccessToken = {
          access_token: newToken.access_token,
          token_type: newToken.token_type,
          expires_in: newToken.expires_in,
        };

        const jsonParams = new DrupalJsonApiParams()
          .addFilter("name", username)
          .addPageLimit(1);

        const users = await drupal.getResourceCollection<any[]>("user--user", {
          params: jsonParams,
          withAuth: accessTokenObject,
        });

        if (!users || !Array.isArray(users) || users.length === 0) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({ data: users[0] });
      } catch (retryError) {
        console.error("Error retrying after token refresh:", retryError);
        return NextResponse.json(
          { error: "Failed to fetch user after token refresh" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to fetch user information" },
      { status: 500 }
    );
  }
}
