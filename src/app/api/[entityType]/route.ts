import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth/token";
import { refreshAccessToken } from "@/lib/auth/refresh-token";
import { drupal } from "@/lib/drupal/client";
import { AccessToken } from "next-drupal";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { DrupalSession } from "@/types/auth";

import {
  buildJsonApiParams,
  parseSearchParams,
  createAccessTokenObject,
  getTotalCount,
} from "@/lib/drupal/api-helpers";

/**
 * Generic API route handler for any Drupal entity type
 *
 * Supports:
 * - GET: List entities (with filters & pagination)
 * - POST: Create entity
 * - PATCH: Update entity (via query param ?id=uuid)
 * - DELETE: Delete entity (via query param ?id=uuid)
 *
 * Route: /api/[entityType]
 * Example: /api/node--article, /api/user--user, /api/taxonomy_term--tags
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string }> }
) {
  try {
    const accessToken = await getAccessToken();
    const { entityType } = await params;

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    // If ID is provided, fetch a single entity
    if (id) {
      const session = await getServerSession(authOptions) as DrupalSession;
      const accessToken = session.accessToken;

      const entity = await drupal.getResource<any>(entityType, id, {
        withAuth: accessToken,
      });

      return NextResponse.json({ data: entity });
    }

    // Otherwise, fetch collection
    const queryParams = parseSearchParams(searchParams);

    // Build JSON:API params
    const jsonParams = buildJsonApiParams(entityType, queryParams);

    const accessTokenObject = createAccessTokenObject(accessToken);

    // Fetch entities
    const entities = await drupal.getResourceCollection<any[]>(entityType, {
      params: jsonParams,
      withAuth: accessTokenObject,
    });

    // Get total count for pagination
    const total = await getTotalCount(
      drupal,
      entityType,
      accessTokenObject,
      queryParams.filter
    );

    return NextResponse.json({
      data: entities,
      pagination: {
        page: queryParams.page || 1,
        limit: queryParams.limit || 10,
        total,
        totalPages: Math.ceil(total / (queryParams.limit || 10)),
      },
    });
  } catch (error: any) {
    const { entityType: errorEntityType } = await params;
    console.error(`Error fetching ${errorEntityType}:`, error);

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
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get("id");
        const accessTokenObject: AccessToken = {
          access_token: newToken.access_token,
          token_type: newToken.token_type,
          expires_in: newToken.expires_in,
        };

        const { entityType: retryEntityType } = await params;

        // If ID is provided, fetch a single entity
        if (id) {
          const entity = await drupal.getResource<any>(retryEntityType, id, {
            withAuth: accessTokenObject,
          });
          return NextResponse.json({ data: entity });
        }

        // Otherwise, fetch collection
        const queryParams = parseSearchParams(searchParams);
        const jsonParams = buildJsonApiParams(retryEntityType, queryParams);

        const entities = await drupal.getResourceCollection<any[]>(
          retryEntityType,
          {
            params: jsonParams,
            withAuth: accessTokenObject,
          }
        );

        const total = await getTotalCount(
          drupal,
          retryEntityType,
          accessTokenObject,
          queryParams.filter
        );

        return NextResponse.json({
          data: entities,
          pagination: {
            page: queryParams.page || 1,
            limit: queryParams.limit || 10,
            total,
            totalPages: Math.ceil(total / (queryParams.limit || 10)),
          },
        });
      } catch (retryError) {
        console.error("Error retrying after token refresh:", retryError);
        return NextResponse.json(
          { error: `Failed to fetch ${errorEntityType} after token refresh` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: `Failed to fetch ${errorEntityType}` },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string }> }
) {
  try {
    const accessToken = await getAccessToken();
    const { entityType } = await params;
    const body = await request.json();

    const accessTokenObject = createAccessTokenObject(accessToken);

    // Create entity
    const created = await drupal.createResource(
      entityType,
      body.data || body,
      {
        withAuth: accessTokenObject,
      }
    );

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    const { entityType: errorEntityType } = await params;
    console.error(`Error creating ${errorEntityType}:`, error);

    if (error?.statusCode === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        return NextResponse.json(
          { error: "Authentication failed. Please login again." },
          { status: 401 }
        );
      }

      try {
        const body = await request.json();
        const accessTokenObject: AccessToken = {
          access_token: newToken.access_token,
          token_type: newToken.token_type,
          expires_in: newToken.expires_in,
        };

        const { entityType: retryEntityType } = await params;
        const created = await drupal.createResource(
          retryEntityType,
          body.data || body,
          {
            withAuth: accessTokenObject,
          }
        );

        return NextResponse.json({ data: created }, { status: 201 });
      } catch (retryError: any) {
        return NextResponse.json(
          {
            error: `Failed to create ${errorEntityType}`,
            details: retryError.message,
          },
          { status: retryError.statusCode || 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error: `Failed to create ${errorEntityType}`,
        details: error.message,
      },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string }> }
) {
  try {
    const accessToken = await getAccessToken();
    const { entityType } = await params;
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Entity ID is required (query param: ?id=uuid)" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const accessTokenObject = createAccessTokenObject(accessToken);

    // Update entity
    const updated = await drupal.updateResource(
      entityType,
      id,
      body.data || body,
      {
        withAuth: accessTokenObject,
      }
    );

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    const { entityType: errorEntityType } = await params;
    console.error(`Error updating ${errorEntityType}:`, error);

    if (error?.statusCode === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        return NextResponse.json(
          { error: "Authentication failed. Please login again." },
          { status: 401 }
        );
      }

      try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get("id");
        const body = await request.json();
        const accessTokenObject: AccessToken = {
          access_token: newToken.access_token,
          token_type: newToken.token_type,
          expires_in: newToken.expires_in,
        };

        const { entityType: retryEntityType } = await params;
        const updated = await drupal.updateResource(
          retryEntityType,
          id!,
          body.data || body,
          {
            withAuth: accessTokenObject,
          }
        );

        return NextResponse.json({ data: updated });
      } catch (retryError: any) {
        return NextResponse.json(
          {
            error: `Failed to update ${errorEntityType}`,
            details: retryError.message,
          },
          { status: retryError.statusCode || 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error: `Failed to update ${errorEntityType}`,
        details: error.message,
      },
      { status: error.statusCode || 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string }> }
) {
  try {
    const accessToken = await getAccessToken();
    const { entityType } = await params;
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Entity ID is required (query param: ?id=uuid)" },
        { status: 400 }
      );
    }

    const accessTokenObject = createAccessTokenObject(accessToken);

    // Delete entity
    await drupal.deleteResource(entityType, id, {
      withAuth: accessTokenObject,
    });

    return NextResponse.json({ success: true }, { status: 204 });
  } catch (error: any) {
    const { entityType: errorEntityType } = await params;
    console.error(`Error deleting ${errorEntityType}:`, error);

    if (error?.statusCode === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        return NextResponse.json(
          { error: "Authentication failed. Please login again." },
          { status: 401 }
        );
      }

      try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get("id");
        const accessTokenObject: AccessToken = {
          access_token: newToken.access_token,
          token_type: newToken.token_type,
          expires_in: newToken.expires_in,
        };

        const { entityType: retryEntityType } = await params;
        await drupal.deleteResource(retryEntityType, id!, {
          withAuth: accessTokenObject,
        });

        return NextResponse.json({ success: true }, { status: 204 });
      } catch (retryError: any) {
        return NextResponse.json(
          {
            error: `Failed to delete ${errorEntityType}`,
            details: retryError.message,
          },
          { status: retryError.statusCode || 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error: `Failed to delete ${errorEntityType}`,
        details: error.message,
      },
      { status: error.statusCode || 500 }
    );
  }
}
