// src/lib/drupal-oauth.ts
//
// Low-level helpers for talking to Drupal's simple_oauth endpoints.
// These are used by [...nextauth]/route.ts and should never run client-side.

import { DrupalTokenResponse, DrupalUserInfo } from "@/types/auth";

const DRUPAL_BASE_URL = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL!;
const CLIENT_ID      = process.env.DRUPAL_CLIENT_ID!;
const CLIENT_SECRET  = process.env.DRUPAL_CLIENT_SECRET!;

/** POST /oauth/token – shared body builder */
function tokenBody(params: Record<string, string>) {
  return new URLSearchParams({
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    ...params,
  });
}

/**
 * Exchange username + password for an access/refresh token pair.
 * Uses the OAuth2 "Resource Owner Password Credentials" grant.
 *
 * Drupal simple_oauth must have the "password" grant enabled on
 * the consumer (Admin → Config → simple_oauth → Consumers).
 */
export async function fetchTokenWithPassword(
  username: string,
  password: string
): Promise<DrupalTokenResponse> {
  const res = await fetch(`${DRUPAL_BASE_URL}/oauth/token`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    tokenBody({ grant_type: "password", username, password }),
    cache:   "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drupal OAuth password grant failed: ${res.status} – ${err}`);
  }

  return res.json() as Promise<DrupalTokenResponse>;
}

/**
 * Exchange an expired access_token for a new pair using the refresh_token.
 * Throws when the refresh_token itself is expired – caller should sign out.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<DrupalTokenResponse> {
  const res = await fetch(`${DRUPAL_BASE_URL}/oauth/token`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    tokenBody({ grant_type: "refresh_token", refresh_token: refreshToken }),
    cache:   "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drupal token refresh failed: ${res.status} – ${err}`);
  }

  return res.json() as Promise<DrupalTokenResponse>;
}

/**
 * Fetch Drupal user info using a valid access_token.
 * simple_oauth exposes /oauth/userinfo when OpenID Connect is enabled.
 */
export async function fetchDrupalUserInfo(
  accessToken: string
): Promise<DrupalUserInfo> {
  const res = await fetch(`${DRUPAL_BASE_URL}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache:   "no-store",
  });

  if (!res.ok) {
    throw new Error(`Drupal userinfo failed: ${res.status}`);
  }

  return res.json() as Promise<DrupalUserInfo>;
}

/**
 * Calculate the epoch timestamp (ms) when the access_token expires,
 * with a 60-second safety buffer so we refresh slightly before expiry.
 */
export function expiresAt(expiresInSeconds: number): number {
  return Date.now() + (expiresInSeconds - 60) * 1000;
}
