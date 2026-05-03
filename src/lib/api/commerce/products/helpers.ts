import type { AccessToken } from "next-drupal";

import type { DrupalSession } from "@/types/auth";

export class ProductApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ProductApiError";
    this.status = status;
  }
}

/** Shape expected by `next-drupal` `withAuth`. */
export function accessTokenStringToDrupalAuth(access_token: string): AccessToken {
  return {
    access_token,
    token_type: "Bearer",
    expires_in: 3600,
  };
}

export function sessionToAccessToken(
  session: DrupalSession | null
): AccessToken | null {
  if (!session?.accessToken) return null;
  return accessTokenStringToDrupalAuth(session.accessToken);
}
