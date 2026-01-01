import { NextDrupal } from "next-drupal";
import { getAccessToken } from "./auth";
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
  }
);
