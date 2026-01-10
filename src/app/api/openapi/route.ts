import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth/token";
import { refreshAccessToken } from "@/lib/auth/refresh-token";
import { AccessToken } from "next-drupal";

/**
 * Fetches Drupal OpenAPI JSON:API metadata
 * This endpoint requires authentication to access Drupal's OpenAPI docs
 */
export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    const drupalBaseUrl = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL;

    if (!drupalBaseUrl) {
      return NextResponse.json(
        { error: "Drupal base URL not configured" },
        { status: 500 }
      );
    }

    const openApiUrl = `${drupalBaseUrl}/openapi/jsonapi?_format=json`;

    const response = await fetch(openApiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh the token
        const newToken = await refreshAccessToken();

        if (!newToken) {
          return NextResponse.json(
            { error: "Authentication failed. Please login again." },
            { status: 401 }
          );
        }

        // Retry with new token
        const retryResponse = await fetch(openApiUrl, {
          headers: {
            Authorization: `Bearer ${newToken.access_token}`,
            Accept: "application/json",
          },
        });

        if (!retryResponse.ok) {
          return NextResponse.json(
            { error: "Failed to fetch OpenAPI metadata" },
            { status: retryResponse.status }
          );
        }

        const data = await retryResponse.json();
        return NextResponse.json(data);
      }

      return NextResponse.json(
        { error: "Failed to fetch OpenAPI metadata" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching OpenAPI metadata:", error);
    return NextResponse.json(
      { error: "Failed to fetch OpenAPI metadata" },
      { status: 500 }
    );
  }
}
