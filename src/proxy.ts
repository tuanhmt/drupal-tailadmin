import { NextResponse } from "next/server";
import { AUTH_PATHS } from "@/lib/auth/constants";
import { withAuth, NextRequestWithAuth } from "next-auth/middleware";

// Auth screens are public; everything else needs a session (see `authorized` below).
const PUBLIC_PATH_PREFIXES = [
  AUTH_PATHS.SIGNIN,
  AUTH_PATHS.SIGNUP,
  AUTH_PATHS.RESET_PASSWORD,
] as const;

export default withAuth(
  async function middleware(req: NextRequestWithAuth) {
    const token    = req.nextauth.token as { error?: string } | null;
    const { pathname } = req.nextUrl;

    // ── Detect expired refresh_token ────────────────────────────────────────
    // The jwt callback sets error:"RefreshAccessTokenError" when Drupal rejects
    // a refresh attempt. Sign the user out so they can log in again.
    if (token?.error === "RefreshAccessTokenError") {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = AUTH_PATHS.SIGNIN;
      loginUrl.search = "";
      loginUrl.searchParams.set("error", "SessionExpired");
      // After login, send user home — never use /signin as callbackUrl (avoids nesting).
      loginUrl.searchParams.set("callbackUrl", "/");
      return NextResponse.redirect(loginUrl);
    }

    // ── Redirect authenticated users away from /login ───────────────────────
    if (pathname === AUTH_PATHS.SIGNIN && token) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // `authorized` controls whether withAuth even calls our middleware fn.
      // Public routes always pass; other routes need a token → else redirect to signIn
      // with callbackUrl = attempted URL. Listing /signin as "protected" caused a loop:
      // /signin → redirect to /signin?callbackUrl=…/signin → nested encoding forever.
      authorized({ req, token }) {
        const { pathname } = req.nextUrl;
        const isPublic = PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
        if (isPublic) return true;
        return !!token;
      },
    },
  }
);

// Configure which routes this proxy runs on
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
