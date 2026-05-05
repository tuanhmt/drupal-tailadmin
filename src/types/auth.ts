import { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

/** Drupal `/oauth/token` response (password or refresh grant). */
export interface DrupalTokenResponse {
  token_type: "Bearer";
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

/** Fields we read from Drupal's userinfo endpoint. */
export interface DrupalUserInfo {
  sub: string;
  name: string;
  email: string;
  roles?: string[];
}

/** JWT payload (server-only: never put `accessToken` / `refreshToken` on `session`). */
export interface DrupalJWT extends DefaultJWT {
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: number;
  drupalUserId: string;
  keepMeLoggedIn: boolean;
  refreshRetries?: number;
  tokenDeadAt?: number;
  error?: "RefreshAccessTokenError";
}

/** What the browser sees via `useSession` / `getServerSession` (no OAuth tokens). */
export interface DrupalSession extends DefaultSession {
  tokenDeadAt?: number;
  error?: "RefreshAccessTokenError";
  user: DefaultSession["user"] & {
    id: string;
    roles?: string[];
  };
}

export const SESSION_DURATION = {
  short: undefined,
  long: 60 * 60 * 24 * 30,
} as const;