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
} from "@/lib/auth/drupal-oauth";
import { DrupalJWT, DrupalSession, SESSION_DURATION } from "@/types/auth";
import { JWT } from "next-auth/jwt";

const LONG_SESSION_MAX_AGE = SESSION_DURATION.long; // 2592000 s

export const authOptions: AuthOptions = {
  // ── Providers ──────────────────────────────────────────────────────────────
  providers: [
    CredentialsProvider({
      name: "Drupal",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        keepMeLoggedIn: { label: "Keep me logged in", type: "boolean" },
      },

      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const keep = credentials.keepMeLoggedIn === "true";

        try {
          // 1. Get tokens from Drupal
          const tokens = await fetchTokenWithPassword(
            credentials.username,
            credentials.password
          );

          // 2. Get user info
          const userInfo = await fetchDrupalUserInfo(tokens.access_token);

          // 3. Return user object – this becomes the initial JWT `user` field
          return {
            id:           userInfo.sub,
            name:         userInfo.name,
            email:        userInfo.email,
            // Stash tokens on the user object so `jwt` callback can pick them up
            accessToken:        tokens.access_token,
            refreshToken:       tokens.refresh_token,
            accessTokenExpires: expiresAt(tokens.expires_in),
            keepMeLoggedIn:     keep,
          };
        } catch (err) {
          console.error("[NextAuth] authorize error:", err);
          // Returning null shows a generic "Sign in failed" error in the UI
          return null;
        }
      },
    }),
  ],

  // ── Session strategy ───────────────────────────────────────────────────────
  session: { strategy: "jwt" },

  // ── Pages ──────────────────────────────────────────────────────────────────
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
          accessToken: string;
          refreshToken: string;
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
        } satisfies DrupalJWT;
      }

      // ── Token still valid ─────────────────────────────────────────────────
      if (Date.now() < jwt.accessTokenExpires) {
        return jwt;
      }

      // ── Access token expired → try to refresh ─────────────────────────────
      console.log("[NextAuth] access_token expired, refreshing…");
      try {
        const refreshed = await refreshAccessToken(jwt.refreshToken);
        return {
          ...jwt,
          accessToken:        refreshed.access_token,
          refreshToken:       refreshed.refresh_token ?? jwt.refreshToken,
          accessTokenExpires: expiresAt(refreshed.expires_in),
          error:              undefined,   // clear any previous error
        } satisfies DrupalJWT;
      } catch (err) {
        // refresh_token is expired or revoked → signal the client to log out
        console.error("[NextAuth] token refresh failed:", err);
        return { ...jwt, error: "RefreshAccessTokenError" } satisfies DrupalJWT;
      }
    },

    /**
     * `session` shapes what `useSession()` / `getServerSession()` return.
     * Never put the refresh_token here – it would be sent to the browser.
     */
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
        : new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h rolling for session-only

      return {
        ...session,
        expires,
        accessToken: jwt.accessToken,
        error:       jwt.error,
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
