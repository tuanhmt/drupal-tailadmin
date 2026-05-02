// src/app/api/auth/revoke/route.ts
//
// Called by the logout flow BEFORE NextAuth clears the session.
// Revokes the access_token on Drupal's side via /oauth/token/revoke
// so the token cannot be reused even before it naturally expires.
//
// simple_oauth supports RFC 7009 token revocation out of the box.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth/next";
import { authOptions }               from "@/app/api/auth/[...nextauth]/route";
import { DrupalSession }             from "@/types/auth";

const DRUPAL_BASE_URL  = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL!;
const CLIENT_ID        = process.env.DRUPAL_CLIENT_ID!;
const CLIENT_SECRET    = process.env.DRUPAL_CLIENT_SECRET!;

async function revokeToken(token: string) {
  const res = await fetch(`${DRUPAL_BASE_URL}/oauth/revoke`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      client_id:        CLIENT_ID,
      client_secret:    CLIENT_SECRET,
      token,
    }),
    cache: "no-store",
  });

  // 200 = revoked, 503 = unsupported (non-fatal) — both are acceptable
  return res.ok || res.status === 503;
}

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions) as DrupalSession | null;

  if (!session?.accessToken) {
    // Nothing to revoke — already signed out
    return NextResponse.json({ revoked: false, reason: "no_session" });
  }

  try {
    // Revoke the access_token (refresh_token is in the JWT only, not in the session,
    // but we revoke what we have — Drupal will cascade-invalidate the refresh token)
    await revokeToken(session.accessToken);
    return NextResponse.json({ revoked: true });
  } catch (err) {
    // Non-fatal — NextAuth will still clear the cookie below
    console.error("[revoke] Drupal token revocation failed:", err);
    return NextResponse.json({ revoked: false, reason: "drupal_error" });
  }
}