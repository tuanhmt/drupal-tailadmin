// src/types/auth.ts

import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

/**
 * Drupal OAuth2 token response from /oauth/token endpoint
 */
export interface DrupalTokenResponse {
  token_type: "Bearer";
  expires_in: number;       // seconds until access_token expires
  access_token: string;
  refresh_token: string;
}

/**
 * Drupal user info from /oauth/userinfo
 */
export interface DrupalUserInfo {
  sub: string;              // Drupal user UUID
  name: string;
  email: string;
  roles?: string[];
}

/**
 * Extend next-auth JWT to store Drupal tokens
 */
export interface DrupalJWT extends DefaultJWT {
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: number;   // epoch ms
  drupalUserId: string;
  error?: "RefreshAccessTokenError";
}

/**
 * Extend next-auth Session
 */
export interface DrupalSession extends DefaultSession {
  accessToken: string;
  error?: "RefreshAccessTokenError";
  user: DefaultSession["user"] & {
    id: string;
    roles?: string[];
  };
}