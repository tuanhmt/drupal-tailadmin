import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware
 *
 * IMPORTANT: Middleware runs on Edge Runtime - limited API access
 * - Cannot use Node.js APIs
 * - Cannot call external APIs
 * - Cannot decode/verify JWT tokens
 * - Can only check cookie existence
 *
 * This middleware:
 * 1. Checks if access_token cookie exists
 * 2. Redirects to /signin if missing (except for auth routes)
 * 3. Allows access to auth routes without token
 *
 * Security note: This is a lightweight check. Actual token validation
 * and scope checking happens in server components via auth-scope.ts
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to auth routes without authentication
  const authRoutes = ["/signin", "/signup", "/reset-password"];
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isAuthRoute) {
    return NextResponse.next();
  }

  // Check for access_token cookie
  // In Edge Runtime, we can only check existence, not decode/verify
  const accessToken = request.cookies.get("access_token");

  if (!accessToken) {
    // Redirect to signin page if no token
    const signInUrl = new URL("/signin", request.url);
    // Preserve the original URL for redirect after login
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Token exists, allow request to proceed
  // Actual token validation happens in server components
  return NextResponse.next();
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
