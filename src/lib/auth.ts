import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getToken, type JWT } from "next-auth/jwt";
import { cookies, headers } from "next/headers";

/**
 * Shape returned by Drupal Simple OAuth `/oauth/token` (password grant)
 * or any compatible custom JWT login endpoint.
 */
type OAuthTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number; // seconds
  token_type?: string;
};

const DRUPAL_BASE_URL = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL ?? "";
const LOGIN_ENDPOINT = process.env.DRUPAL_LOGIN_ENDPOINT ?? "/oauth/token";
const CLIENT_ID = process.env.DRUPAL_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.DRUPAL_CLIENT_SECRET ?? "";

/**
 * Authenticate against Drupal and exchange username/password for an
 * access_token. Supports either:
 *   - Simple OAuth (`/oauth/token` with password grant), or
 *   - a custom endpoint that accepts JSON `{ username, password }`
 *     and returns `{ access_token, ... }`.
 */
async function loginToDrupal(
  username: string,
  password: string,
): Promise<OAuthTokenResponse> {
  const url = `${DRUPAL_BASE_URL}${LOGIN_ENDPOINT}`;

  // Heuristic: use OAuth password grant when the endpoint is /oauth/token
  // or when a client id is configured. Otherwise post JSON.
  const isOAuth =
    LOGIN_ENDPOINT.includes("/oauth/token") || CLIENT_ID.length > 0;

  let res: Response;
  if (isOAuth) {
    const body = new URLSearchParams({
      grant_type: "password",
      client_id: CLIENT_ID,
      username,
      password,
    });
    if (CLIENT_SECRET) body.set("client_secret", CLIENT_SECRET);

    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });
  } else {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Drupal login failed (${res.status}): ${errText || res.statusText}`,
    );
  }

  const data = (await res.json()) as OAuthTokenResponse;
  if (!data.access_token) {
    throw new Error("Drupal login response missing access_token");
  }
  return data;
}

/**
 * Refresh an expired access_token using the refresh_token (Simple OAuth flow).
 */
async function refreshDrupalToken(
  refreshToken: string,
): Promise<OAuthTokenResponse> {
  const url = `${DRUPAL_BASE_URL}${LOGIN_ENDPOINT}`;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    refresh_token: refreshToken,
  });
  if (CLIENT_SECRET) body.set("client_secret", CLIENT_SECRET);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status}`);
  }
  return (await res.json()) as OAuthTokenResponse;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  // 30 day session by default; tune to taste.
  jwt: { maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/user/login" },
  providers: [
    CredentialsProvider({
      id: "drupal",
      name: "Drupal",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        try {
          const token = await loginToDrupal(
            credentials.username,
            credentials.password,
          );

          const expiresIn = token.expires_in ?? 3600;
          return {
            id: credentials.username,
            name: credentials.username,
            username: credentials.username,
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            accessTokenExpires: Date.now() + expiresIn * 1000,
          };
        } catch (err) {
          // NextAuth swallows thrown errors with a generic message.
          // Log server-side for debugging.
          console.error("[next-auth] Drupal authorize failed:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign-in: copy fields from the user returned by `authorize`.
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = user.accessTokenExpires;
        token.username = user.username;
        return token;
      }

      // Token still valid — return as-is.
      if (
        token.accessTokenExpires &&
        Date.now() < token.accessTokenExpires - 10_000
      ) {
        return token;
      }

      // No refresh token configured — flag it so the UI can prompt re-login.
      if (!token.refreshToken) {
        token.error = "MissingRefreshToken";
        return token;
      }

      // Try refreshing.
      try {
        const refreshed = await refreshDrupalToken(token.refreshToken);
        const expiresIn = refreshed.expires_in ?? 3600;
        return {
          ...token,
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token ?? token.refreshToken,
          accessTokenExpires: Date.now() + expiresIn * 1000,
          error: undefined,
        };
      } catch (err) {
        console.error("[next-auth] Refresh failed:", err);
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },
    async session({ session, token }) {
      // SECURITY: do NOT copy `accessToken` / `refreshToken` /
      // `accessTokenExpires` onto `session`. Those secrets must never leave
      // the encrypted HTTP-only JWT cookie. Server code that needs them
      // calls `getServerAccessToken()` below.
      session.error = token.error;
      session.user = {
        ...session.user,
        id: token.sub,
        username: token.username,
        name: token.username ?? session.user?.name ?? null,
      };
      return session;
    },
  },
};

/* ------------------------------------------------------------------ */
/* Server-only token access                                            */
/* ------------------------------------------------------------------ */

/**
 * Server-only: decrypt the NextAuth JWT cookie and return the full token,
 * including `accessToken` and `refreshToken`.
 *
 * MUST only be called from Server Components, Server Actions, Route
 * Handlers, or Middleware. It is not safe to expose the return value to
 * the client.
 *
 * Returns `null` if there is no session cookie or the cookie cannot be
 * verified.
 */
export async function getServerJwt(): Promise<JWT | null> {
  const cookieStore = await cookies();
  const headerStore = await headers();

  // NextAuth's `getToken` was originally written for the Pages Router and
  // expects a request-like object. In the App Router we synthesize one
  // from `cookies()` / `headers()`.
  const reqLike = {
    headers: Object.fromEntries(headerStore.entries()),
    cookies: Object.fromEntries(
      cookieStore.getAll().map((c) => [c.name, c.value]),
    ),
  };

  // Cast: the runtime shape is what `getToken` actually reads.
  return getToken({
    req: reqLike as unknown as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });
}

/**
 * Convenience wrapper — returns just the bearer token string, or `null`.
 */
export async function getServerAccessToken(): Promise<string | null> {
  const jwt = await getServerJwt();
  return jwt?.accessToken ?? null;
}
