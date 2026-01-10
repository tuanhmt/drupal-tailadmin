import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth/token";
import { refreshAccessToken } from "@/lib/auth/refresh-token";
import { parseOpenApiMetadata } from "@/lib/drupal/openapi-parser";

/**
 * API route to get parsed entity type information from OpenAPI metadata
 * This endpoint fetches OpenAPI metadata, parses it, and returns entity type information
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
        const entities = parseOpenApiMetadata(data);
        return NextResponse.json({ entities });
      }

      return NextResponse.json(
        { error: "Failed to fetch OpenAPI metadata" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const entities = parseOpenApiMetadata(data);

    return NextResponse.json({ entities });
  } catch (error: any) {
    console.error("Error fetching and parsing OpenAPI metadata:", error);
    return NextResponse.json(
      { error: "Failed to fetch and parse OpenAPI metadata" },
      { status: 500 }
    );
  }
}
