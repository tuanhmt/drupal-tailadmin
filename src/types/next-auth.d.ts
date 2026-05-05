import type { DefaultSession, DefaultUser } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

/**
 * Augment NextAuth types.
 *
 * SECURITY MODEL
 * --------------
 * The Drupal `accessToken` and `refreshToken` are stored ONLY inside the
 * encrypted, HTTP-only NextAuth JWT cookie. They are deliberately NOT
 * placed on the `Session` object, so:
 *   - `useSession()` and the `/api/auth/session` endpoint never expose them.
 *   - The browser cannot read or replay them.
 *
 * To make authenticated calls to Drupal, server code reads the JWT directly
 * via `getServerAccessToken()` (see `lib/auth.ts`). Mutations from the
 * client should go through a Server Action or Route Handler.
 */

declare module "next-auth" {
  interface Session {
    /** Set when a refresh fails so the UI can prompt re-login. */
    error?: "RefreshAccessTokenError" | "MissingRefreshToken";
    user: DefaultSession["user"] & {
      id?: string;
      name?: string;
      email?: string;
      username?: string;
    };
  }

  interface User extends DefaultUser {
    /** Internal — passed from `authorize()` into the `jwt` callback. */
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    username?: string;
  }
}

declare module "next-auth/jwt" {
  /**
   * The JWT lives only in the encrypted session cookie. These secret fields
   * never reach the browser.
   */
  interface JWT extends DefaultJWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    username?: string;
    error?: "RefreshAccessTokenError" | "MissingRefreshToken";
  }
}
