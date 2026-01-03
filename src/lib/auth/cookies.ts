import { cookies } from "next/headers";
import {
    AUTH_COOKIES,
    AUTH_COOKIE_OPTIONS
} from "./constants";

export interface OAuthTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: "Bearer";
    scope?: string;
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

    cookieStore.set(AUTH_COOKIES.ACCESS_TOKEN, token.access_token, {
        httpOnly: AUTH_COOKIE_OPTIONS.HTTP_ONLY,
        maxAge: AUTH_COOKIE_OPTIONS.MAX_AGE,
        path: '/',
        sameSite: AUTH_COOKIE_OPTIONS.SAME_SITE,
        secure: AUTH_COOKIE_OPTIONS.SECURE,
    });

    cookieStore.set(AUTH_COOKIES.REFRESH_TOKEN, token.refresh_token, {
        httpOnly: AUTH_COOKIE_OPTIONS.HTTP_ONLY,
        maxAge: AUTH_COOKIE_OPTIONS.MAX_AGE,
        path: '/',
        sameSite: AUTH_COOKIE_OPTIONS.SAME_SITE,
        secure: AUTH_COOKIE_OPTIONS.SECURE,
    });
}

/**
 * Clears all authentication cookies.
 * Used during logout or forced session invalidation.
 */
export async function clearAuthCookies(): Promise<void> {
    const cookieStore = await cookies();

    cookieStore.delete(AUTH_COOKIES.ACCESS_TOKEN);
    cookieStore.delete(AUTH_COOKIES.REFRESH_TOKEN);
}
