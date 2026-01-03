import { NextRequest, NextResponse } from "next/server";
import type { DrupalNode } from "next-drupal";
import { getAccessToken } from "@/lib/auth/token";
import { refreshAccessToken } from "@/lib/auth/refresh-token";
import { drupal } from "@/lib/drupal/client";
import { DrupalJsonApiParams } from "drupal-jsonapi-params";
import { AccessToken } from "next-drupal";

export async function GET(request: NextRequest) {
  try {
    // Use authenticated Drupal client to fetch articles
    const accessToken = await getAccessToken();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = (page - 1) * limit;

    const jsonParams = new DrupalJsonApiParams()
      .addFields("node--article", ["title", "path", "field_image", "uid", "created", "body"])
      .addInclude(["field_image", "uid"])
      .addSort("-created")
      .addPageLimit(limit)
      .addPageOffset(offset);

    const accessTokenObject: AccessToken = {
      access_token: accessToken!,
      token_type: "Bearer",
      expires_in: 3600,
    };

    const articles = await drupal.getResourceCollection<DrupalNode[]>(
      "node--article",
      {
        params: jsonParams,
        withAuth: accessTokenObject,
      }
    );

    // Get total count - fetch all published articles to count
    // Note: JSON:API doesn't always return total count in meta, so we fetch all
    // For production, consider using a Drupal view with count or caching this
    const allArticles = await drupal.getResourceCollection<DrupalNode[]>(
      "node--article",
      {
        params: {
          "filter[status]": 1,
          "page[limit]": 100, // Fetch in batches if you have many articles
        },
        withAuth: accessTokenObject,
      }
    );

    const total = Array.isArray(allArticles) ? allArticles.length : 0;

    return NextResponse.json({
      data: articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching articles:", error);
    if (error?.statusCode === 401) {
      // Try to refresh the token
      const newToken = await refreshAccessToken();

      if (!newToken) {
        return NextResponse.json(
          { error: "Authentication failed. Please login again." },
          { status: 401 }
        );
      }

      // Retry the request with the new token
      try {
        const accessTokenObject: AccessToken = {
          access_token: newToken.access_token,
          token_type: newToken.token_type,
          expires_in: newToken.expires_in,
        };

        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const offset = (page - 1) * limit;

        const jsonParams = new DrupalJsonApiParams()
          .addFields("node--article", ["title", "path", "field_image", "uid", "created", "body"])
          .addInclude(["field_image", "uid"])
          .addSort("-created")
          .addPageLimit(limit)
          .addPageOffset(offset);

        const articles = await drupal.getResourceCollection<DrupalNode[]>(
          "node--article",
          {
            params: jsonParams,
            withAuth: accessTokenObject,
          }
        );

        const allArticles = await drupal.getResourceCollection<DrupalNode[]>(
          "node--article",
          {
            params: {
              "filter[status]": 1,
              "page[limit]": 100,
            },
            withAuth: accessTokenObject,
          }
        );

        const total = Array.isArray(allArticles) ? allArticles.length : 0;

        return NextResponse.json({
          data: articles,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (retryError) {
        console.error("Error retrying after token refresh:", retryError);
        return NextResponse.json(
          { error: "Failed to fetch articles after token refresh" },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json(
    { error: "Failed to fetch articles" },
    { status: 500 }
  );
}
