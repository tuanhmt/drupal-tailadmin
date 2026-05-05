// src/app/api/auth/revoke/route.ts
//
// Called by the logout flow BEFORE NextAuth clears the session.
// Revokes the access_token on Drupal's side via /oauth/token/revoke
// so the token cannot be reused even before it naturally expires.
//
// Reads the token from the encrypted JWT (server-only), not from session.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const DRUPAL_BASE_URL = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL!;
const CLIENT_ID = process.env.DRUPAL_CLIENT_ID!;
const CLIENT_SECRET = process.env.DRUPAL_CLIENT_SECRET!;

async function revokeToken(token: string) {
  const res = await fetch(`${DRUPAL_BASE_URL}/oauth/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      token,
    }),
    cache: "no-store",
  });

  // 200 = revoked, 503 = unsupported (non-fatal) — both are acceptable
  return res.ok || res.status === 503;
}

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET!,
  });

  const accessToken = token?.accessToken as string | undefined;
  if (!accessToken) {
    return NextResponse.json({ revoked: false, reason: "no_session" });
  }

  try {
    await revokeToken(accessToken);
    return NextResponse.json({ revoked: true });
  } catch (err) {
    console.error("[revoke] Drupal token revocation failed:", err);
    return NextResponse.json({ revoked: false, reason: "drupal_error" });
  }
}
