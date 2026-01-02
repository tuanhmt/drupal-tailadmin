/**
 * Cookie name constants used for authentication and demo mode.
 * This file is safe to import from both client and server components.
 */
export const AUTH_COOKIES = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
} as const;

/**
 * Default cookie options for setting authentication cookies.
 */
export const AUTH_COOKIE_OPTIONS = {
    HTTP_ONLY: process.env.NODE_ENV === 'production',
    MAX_AGE: 24 * 60 * 60, // 24 hours in seconds
    SAME_SITE: 'lax',
    SECURE: process.env.NODE_ENV === 'production',
} as const;