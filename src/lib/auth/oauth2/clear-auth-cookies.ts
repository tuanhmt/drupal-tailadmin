import { cookies } from "next/headers";
import { AUTH_COOKIES } from "../constants";

/**
 * Clears all authentication cookies.
 * Used during logout or forced session invalidation.
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(AUTH_COOKIES.ACCESS_TOKEN);
  cookieStore.delete(AUTH_COOKIES.REFRESH_TOKEN);
}
