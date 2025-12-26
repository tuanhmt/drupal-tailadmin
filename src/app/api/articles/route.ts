import { NextRequest, NextResponse } from "next/server";
import { drupal } from "@/lib/drupal";
import type { DrupalNode } from "next-drupal";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = (page - 1) * limit;

    const articles = await drupal.getResourceCollection<DrupalNode[]>(
      "node--article",
      {
        params: {
          "filter[status]": 1,
          "fields[node--article]": "title,path,field_image,uid,created,body",
          include: "field_image,uid",
          sort: "-created",
          "page[limit]": limit,
          "page[offset]": offset,
        },
        next: {
          revalidate: 0,
        },
        cache: "no-store",
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
        next: {
          revalidate: 300, // Cache count for 5 minutes
        },
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
  } catch (error) {
    console.error("Error fetching articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

