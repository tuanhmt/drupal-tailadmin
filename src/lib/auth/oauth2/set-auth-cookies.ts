import { cookies } from "next/headers";
import {
  AUTH_COOKIES,
  AUTH_COOKIE_OPTIONS
} from "../constants";

interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
}

/**
 * Stores OAuth tokens in HttpOnly cookies.
 *
 * SECURITY NOTES:
 * - Only access_token and refresh_token are stored
 * - No metadata (expires_in, scope, user info) is persisted
 * - Cookies are HttpOnly and Secure
 */
export async function setAuthCookies(token: OAuthTokenResponse): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(
    AUTH_COOKIES.ACCESS_TOKEN,
    token.access_token,
    { ...AUTH_COOKIE_OPTIONS, path: "/" }
  );

  cookieStore.set(
    AUTH_COOKIES.REFRESH_TOKEN,
    token.refresh_token,
    { ...AUTH_COOKIE_OPTIONS, path: "/api/refresh" }
  );
}
