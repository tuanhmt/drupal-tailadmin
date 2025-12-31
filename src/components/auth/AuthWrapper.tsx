import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTokenPayload, isTokenExpired } from "@/lib/auth-scope";

/**
 * Server Component Auth Wrapper
 *
 * Checks authentication and token validity before rendering children.
 * This runs on the server, so it can safely check cookies and decode tokens.
 *
 * If not authenticated or token expired, redirects to signin.
 */
export default async function AuthWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  // Check if token exists
  if (!accessToken) {
    redirect("/signin");
  }

  // Check if token is expired
  const expired = await isTokenExpired();
  if (expired) {
    // Token expired - clear cookies and redirect to login
    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");
    redirect("/signin");
  }

  // Token is valid, render children
  return <>{children}</>;
}
