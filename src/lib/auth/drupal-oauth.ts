// src/lib/drupal-oauth.ts
//
// Low-level helpers for Drupal simple_oauth endpoints.
// Server-only — never imported by client components.

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
 * Attempt to refresh the access token.
 *
 * Throws `RefreshTokenExpiredError` (a typed subclass) when Drupal returns
 * 400 invalid_grant — that means the refresh token itself has expired or been
 * revoked. All other failures throw a generic Error.
 *
 * The jwt() callback catches `RefreshTokenExpiredError` specifically so it
 * can immediately mark the JWT as dead without ambiguity.
 */
export class RefreshTokenExpiredError extends Error {
  constructor(detail: string) {
    super(`refresh_token expired or revoked: ${detail}`);
    this.name = "RefreshTokenExpiredError";
  }
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
    const body = await res.text();

    // 400 invalid_grant = refresh token is dead (expired / revoked by Drupal)
    // Distinguish this from transient errors (500, network timeout, etc.)
    if (res.status === 400) {
      let parsed: { error?: string } = {};
      try { parsed = JSON.parse(body); } catch { /* ignore */ }
      if (parsed.error === "invalid_grant") {
        throw new RefreshTokenExpiredError(body);
      }
    }

    // Transient failure — don't kill the session yet, let the caller retry
    throw new Error(`Token refresh HTTP ${res.status}: ${body}`);
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

/** Epoch ms when the access token expires, with a 60 s safety buffer. */
export function expiresAt(expiresInSeconds: number): number {
  return Date.now() + (expiresInSeconds - 60) * 1000;
}
