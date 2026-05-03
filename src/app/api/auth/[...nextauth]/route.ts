// NextAuth + Drupal: password login, OAuth tokens in an encrypted JWT cookie,
// refresh on access expiry, and logout hints when refresh no longer works.

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

// Stop hammering Drupal after this many failed refreshes (e.g. outage vs dead token).
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
    error:   "/signin",
  },

  callbacks: {
    async jwt({ token, user }): Promise<JWT> {
      const jwt = token as DrupalJWT;

      if (user) {
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
          refreshRetries:     0,
          tokenDeadAt:        undefined,
          error:              undefined,
        } satisfies DrupalJWT;
      }

      // Already logged out server-side — don't refresh again.
      if (jwt.error === "RefreshAccessTokenError") {
        return jwt;
      }

      if (Date.now() < jwt.accessTokenExpires) {
        return jwt;
      }

      console.log("[NextAuth] access_token expired, refreshing…");

      try {
        const refreshed = await refreshAccessToken(jwt.refreshToken);

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

        if (err instanceof RefreshTokenExpiredError) {
          console.error("[NextAuth] refresh_token expired/revoked — forcing logout");
          return {
            ...jwt,
            error:       "RefreshAccessTokenError",
            tokenDeadAt: Date.now(),
          } satisfies DrupalJWT;
        }

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

        return {
          ...jwt,
          refreshRetries: retries,
          accessTokenExpires: Date.now() + 30_000,
        } satisfies DrupalJWT;
      }
    },

    async session({ session, token }): Promise<DrupalSession> {
      const jwt = token as DrupalJWT;

      // Cookie length follows “remember me” vs session-only (see session.maxAge above).
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

  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
