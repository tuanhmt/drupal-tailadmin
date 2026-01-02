import { cookies } from "next/headers";
import { AUTH_COOKIES } from "../constants";

/**
 * Reads refresh token from HttpOnly cookies.
 *
 * IMPORTANT:
 * - This function only returns the raw refresh token string
 * - It does NOT attempt to validate, decode, or inspect token metadata
 * - Token validity is determined by Drupal responses (401)
 */
export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIES.REFRESH_TOKEN)?.value ?? null;
}