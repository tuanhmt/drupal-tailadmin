/**
 * API Helper Utilities
 *
 * Reusable functions for building JSON:API queries and handling responses
 */

import { DrupalJsonApiParams } from "drupal-jsonapi-params";
import { AccessToken } from "next-drupal";

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface FilterParams {
  [key: string]: string | number | boolean;
}

export interface ApiQueryParams extends PaginationParams {
  filter?: FilterParams;
  sort?: string;
  fields?: string[];
  include?: string[];
}

/**
 * Builds DrupalJsonApiParams from query parameters
 */
export function buildJsonApiParams(
  entityType: string,
  params: ApiQueryParams
): DrupalJsonApiParams {
  const jsonParams = new DrupalJsonApiParams();

  // Add fields
  if (params.fields && params.fields.length > 0) {
    jsonParams.addFields(entityType, params.fields);
  }

  // Add includes
  if (params.include && params.include.length > 0) {
    jsonParams.addInclude(params.include);
  }

  // Add sorting
  if (params.sort) {
    // Handle descending sort (prefix with -)
    if (params.sort.startsWith("-")) {
      jsonParams.addSort(params.sort);
    } else {
      jsonParams.addSort(params.sort);
    }
  }

  // Add pagination
  if (params.limit) {
    jsonParams.addPageLimit(params.limit);
  }
  if (params.page && params.limit) {
    const offset = (params.page - 1) * params.limit;
    jsonParams.addPageOffset(offset);
  }

  // Add filters
  if (params.filter) {
    Object.entries(params.filter).forEach(([key, value]) => {
      // Support nested filters like filter[title][value]
      // Convert numbers to strings since addFilter expects string | string[] | null
      if (typeof value === "string") {
        jsonParams.addFilter(key, value);
      } else if (typeof value === "number") {
        jsonParams.addFilter(key, String(value));
      } else if (typeof value === "boolean") {
        jsonParams.addFilter(key, value ? "1" : "0");
      }
    });
  }

  return jsonParams;
}

/**
 * Parses Next.js search params into ApiQueryParams
 */
export function parseSearchParams(
  searchParams: URLSearchParams,
  defaultFields?: string[]
): ApiQueryParams {
  const params: ApiQueryParams = {
    page: parseInt(searchParams.get("page") || "1", 10),
    limit: parseInt(searchParams.get("limit") || "10", 10),
    fields: defaultFields,
  };

  // Parse sort
  const sort = searchParams.get("sort");
  if (sort) {
    params.sort = sort;
  }

  // Parse include
  const include = searchParams.get("include");
  if (include) {
    params.include = include.split(",");
  }

  // Parse filters - support filter[field]=value pattern
  const filter: FilterParams = {};
  searchParams.forEach((value, key) => {
    if (key.startsWith("filter[")) {
      // Extract field name from filter[field] or filter[field][value]
      const match = key.match(/^filter\[([^\]]+)\]/);
      if (match) {
        const fieldName = match[1];
        filter[fieldName] = value;
      }
    }
  });

  if (Object.keys(filter).length > 0) {
    params.filter = filter;
  }

  return params;
}

/**
 * Creates an AccessToken object from a token string
 */
export function createAccessTokenObject(
  accessToken: string | null
): AccessToken | undefined {
  if (!accessToken) {
    return undefined;
  }

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
  };
}

/**
 * Gets total count for pagination
 * Note: This is a simplified version. In production, you might want to use
 * Drupal views with count or cache this value.
 */
export async function getTotalCount(
  drupal: any,
  resourceType: string,
  accessToken: AccessToken | undefined,
  filter?: FilterParams
): Promise<number> {
  try {
    // Fetch a large batch to count
    const allResources = await drupal.getResourceCollection(resourceType, {
      params: {
        "page[limit]": 100,
        ...(filter &&
          Object.entries(filter).reduce((acc, [key, value]) => {
            acc[`filter[${key}]`] = value;
            return acc;
          }, {} as Record<string, any>)),
      },
      withAuth: accessToken,
    });

    return Array.isArray(allResources) ? allResources.length : 0;
  } catch (error) {
    console.error("Error getting total count:", error);
    return 0;
  }
}
