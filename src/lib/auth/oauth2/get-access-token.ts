import { cookies } from "next/headers";
import { AUTH_COOKIES } from "../constants";

/**
 * Reads access token from HttpOnly cookies.
 *
 * IMPORTANT:
 * - This function only returns the raw access token string
 * - It does NOT attempt to validate, decode, or inspect token metadata
 * - Token validity is determined by Drupal responses (401)
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIES.ACCESS_TOKEN)?.value ?? null;
}
