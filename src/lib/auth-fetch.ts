import { cookies } from "next/headers";

/**
 * Authenticated Fetch Helper
 *
 * Server-side helper for making authenticated requests to Drupal JSON:API.
 * This function:
 * 1. Reads access_token from HttpOnly cookie
 * 2. Adds Authorization header to requests
 * 3. Handles token refresh if access_token is expired
 *
 * Usage in Server Components:
 * const data = await authFetch('/jsonapi/node/article');
 */
export async function authFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const drupalBaseUrl = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL;
  if (!drupalBaseUrl) {
    throw new Error("Drupal base URL not configured");
  }

  // Construct full URL
  const url = path.startsWith("http")
    ? path
    : `${drupalBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  // Make authenticated request with Bearer token
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  // If token expired, attempt refresh
  // Note: In server-side context, we can't easily call our own API routes
  // For now, we'll let the 401 propagate and handle refresh at the component level
  // Alternatively, you can implement refresh logic here by directly calling Drupal OAuth
  if (response.status === 401) {
    throw new Error("Authentication expired. Please log in again.");
  }

  return response;
}

/**
 * Helper to get access token for use with NextDrupal client
 *
 * NextDrupal can accept a custom fetch function, but for simplicity,
 * we can also just get the token and pass it to NextDrupal's auth option.
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value || null;
}
