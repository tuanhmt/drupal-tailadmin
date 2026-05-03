// src/app/api/auth/[...nextauth]/route.ts
//
// NextAuth v5 (Auth.js) configuration for Drupal OAuth2.
//
// Flow:
//  1. User submits username + password → CredentialsProvider
//  2. We call Drupal's /oauth/token (password grant) → get tokens
//  3. Tokens are stored in the encrypted JWT (server-side cookie)
//  4. On every request the `jwt` callback checks expiry and refreshes
//  5. If refresh fails → error flag → session callback propagates it
//  6. Client reads session.error and redirects to /login

import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import {
  fetchTokenWithPassword,
  fetchDrupalUserInfo,
  refreshAccessToken,
  expiresAt,
  RefreshTokenExpiredError,
} from "@/lib/auth/drupal-oauth";
import { DrupalJWT, DrupalSession, SESSION_DURATION } from "@/types/auth";
import { JWT } from "next-auth/jwt";

const LONG_SESSION_MAX_AGE = SESSION_DURATION.long; // 30 days in seconds

// How many consecutive transient refresh failures before we give up and force
// logout. This prevents an infinite retry loop when Drupal is temporarily down.
const MAX_REFRESH_RETRIES = 3;

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Drupal",
      credentials: {
        username:       { label: "Username", type: "text" },
        password:       { label: "Password", type: "password" },
        keepMeLoggedIn: { label: "Keep me logged in", type: "boolean" },
      },

      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        try {
          // 1. Get tokens from Drupal
          const tokens = await fetchTokenWithPassword(
            credentials.username,
            credentials.password
          );
          const userInfo = await fetchDrupalUserInfo(tokens.access_token);

          return {
            id:                 userInfo.sub,
            name:               userInfo.name,
            email:              userInfo.email,
            accessToken:        tokens.access_token,
            refreshToken:       tokens.refresh_token,
            accessTokenExpires: expiresAt(tokens.expires_in),
            keepMeLoggedIn:     credentials.keepMeLoggedIn === "true",
          };
        } catch (err) {
          console.error("[NextAuth] authorize error:", err);
          // Returning null shows a generic "Sign in failed" error in the UI
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge:   LONG_SESSION_MAX_AGE,
  },

  pages: {
    signIn:  "/signin",
    error:   "/signin",   // errors redirect back to /signin?error=...
  },

  // ── Callbacks ──────────────────────────────────────────────────────────────
  callbacks: {
    /**
     * `jwt` runs on every session access.
     * - On first sign-in: `user` contains the object from `authorize`; copy
     *   tokens into the JWT.
     * - On subsequent calls: check expiry and refresh if needed.
     */
    async jwt({ token, user }): Promise<JWT> {
      const jwt = token as DrupalJWT;

      // ── Initial sign-in ───────────────────────────────────────────────────
      if (user) {
        // `user` is typed as DefaultUser; we added extra fields in authorize
        const u = user as typeof user & {
          accessToken:        string;
          refreshToken:       string;
          accessTokenExpires: number;
          keepMeLoggedIn:     boolean;
        };
        return {
          ...jwt,
          accessToken:        u.accessToken,
          refreshToken:       u.refreshToken,
          accessTokenExpires: u.accessTokenExpires,
          drupalUserId:       u.id,
          keepMeLoggedIn:     u.keepMeLoggedIn,
          refreshRetries:     0,                // reset retry counter on login
          tokenDeadAt:        undefined,        // clear any old death timestamp
          error:              undefined,
        } satisfies DrupalJWT;
      }

      // ── Already marked dead — do not attempt any more refreshes ─────────────
      // This is the core fix: once we know the refresh_token is dead we stop
      // retrying on every request. Without this, each server-side render
      // triggers another doomed refresh attempt and the error flag keeps
      // toggling on/off if the network has transient failures.
      if (jwt.error === "RefreshAccessTokenError") {
        return jwt;
      }

      // ── Access token still valid ─────────────────────────────────────────────
      if (Date.now() < jwt.accessTokenExpires) {
        return jwt;
      }

      // ── Access token expired → attempt refresh ───────────────────────────────
      console.log("[NextAuth] access_token expired, refreshing…");

      try {
        const refreshed = await refreshAccessToken(jwt.refreshToken);

        // Success — reset retry counter and clear any transient error
        return {
          ...jwt,
          accessToken:        refreshed.access_token,
          refreshToken:       refreshed.refresh_token ?? jwt.refreshToken,
          accessTokenExpires: expiresAt(refreshed.expires_in),
          refreshRetries:     0,
          tokenDeadAt:        undefined,
          error:              undefined,
        } satisfies DrupalJWT;

      } catch (err) {

        // ── Case 1: refresh_token is definitively dead ──────────────────────
        // Drupal returned 400 invalid_grant — the token is expired or revoked.
        // Mark the JWT permanently dead. All subsequent jwt() calls will hit
        // the early-exit guard above and return immediately.
        if (err instanceof RefreshTokenExpiredError) {
          console.error("[NextAuth] refresh_token expired/revoked — forcing logout");
          return {
            ...jwt,
            error:       "RefreshAccessTokenError",
            tokenDeadAt: Date.now(),
          } satisfies DrupalJWT;
        }

        // ── Case 2: transient failure (Drupal 500, network timeout, etc.) ───
        // Increment retry counter. Keep the stale access_token in the JWT so
        // the user's UI doesn't break immediately. After MAX_REFRESH_RETRIES
        // consecutive failures we give up and force logout, because at that
        // point we cannot distinguish a permanently dead token from an outage.
        const retries = (jwt.refreshRetries ?? 0) + 1;
        console.warn(`[NextAuth] transient refresh failure (${retries}/${MAX_REFRESH_RETRIES}):`, err);

        if (retries >= MAX_REFRESH_RETRIES) {
          console.error("[NextAuth] max refresh retries reached — forcing logout");
          return {
            ...jwt,
            error:       "RefreshAccessTokenError",
            tokenDeadAt: Date.now(),
          } satisfies DrupalJWT;
        }

        // Keep the stale token and bump the retry counter.
        // The user can still navigate; we'll retry on the next request.
        return {
          ...jwt,
          refreshRetries: retries,
          // Nudge accessTokenExpires 30 s into the future so we retry
          // soon but not on every single render.
          accessTokenExpires: Date.now() + 30_000,
        } satisfies DrupalJWT;
      }
    },

    async session({ session, token }): Promise<DrupalSession> {
      const jwt = token as DrupalJWT;

      // ── Dynamically control cookie lifetime ───────────────────────────────
      // NextAuth reads `session.maxAge` from what we return here when using
      // the `updateAge` mechanism. We override the expires field so the Set-Cookie
      // maxAge reflects the user's choice.
      //
      // keepMeLoggedIn = false → expires = "session" (browser-close)
      //   We set expires to a date in the past so NextAuth treats it as a
      //   session cookie on subsequent requests.  The *initial* Set-Cookie is
      //   handled by the `cookies` option below.
      //
      // keepMeLoggedIn = true → expires = now + 30 days (persistent cookie)
      const expires = jwt.keepMeLoggedIn
        ? new Date(Date.now() + LONG_SESSION_MAX_AGE * 1000).toISOString()
        : new Date(Date.now() + 60 * 60 * 1000).toISOString();

      return {
        ...session,
        expires,
        accessToken: jwt.accessToken,
        error:       jwt.error,
        tokenDeadAt: jwt.tokenDeadAt,
        user: {
          ...session.user,
          id: jwt.drupalUserId,
        },
      } satisfies DrupalSession;
    },
  },

  // ── Debug (disable in production) ─────────────────────────────────────────
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
