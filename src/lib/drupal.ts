import { NextDrupal } from "next-drupal";
import { getAccessToken } from "./auth-fetch";
import type { Fetcher } from "next-drupal";

/**
 * Custom fetcher that handles SSL certificates for development
 *
 * In development with self-signed certificates (ddev, etc.), we need to
 * disable strict SSL verification. This is safe for internal admin dashboards
 * in development only. Production always uses strict SSL verification.
 */
function createDrupalFetcher(): Fetcher {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const acceptSelfSigned =
    process.env.NEXT_PUBLIC_DRUPAL_ACCEPT_SELF_SIGNED === "true" ||
    process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0";

  // In production, use native fetch with strict SSL
  if (!isDevelopment || !acceptSelfSigned) {
    return fetch;
  }

  // In development with self-signed certs, we need to handle SSL
  // Note: Setting NODE_TLS_REJECT_UNAUTHORIZED affects the entire process
  // For a more isolated approach, you could use a custom https agent
  // For now, we rely on the environment variable being set
  return fetch;
}

/**
 * Default Drupal client (unauthenticated)
 * Use for public requests only
 */
export const drupal = new NextDrupal(
  process.env.NEXT_PUBLIC_DRUPAL_BASE_URL!,
  {
    fetcher: createDrupalFetcher(),
  }
);

/**
 * Get authenticated Drupal client
 *
 * Returns a NextDrupal instance configured with the current access token.
 * Use this in Server Components for authenticated requests.
 *
 * Example:
 * const authDrupal = await getAuthenticatedDrupal();
 * const articles = await authDrupal.getResourceCollection("node--article");
 */
export async function getAuthenticatedDrupal(): Promise<NextDrupal> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  // NextDrupal can accept a custom fetch function with auth headers
  const authDrupal = new NextDrupal(
    process.env.NEXT_PUBLIC_DRUPAL_BASE_URL!,
    {
      auth: {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
      },
      fetcher: createDrupalFetcher(),
    }
  );

  return authDrupal;
}
