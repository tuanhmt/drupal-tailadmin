import { NextResponse } from "next/server";
import { AUTH_PATHS } from "@/lib/auth/constants";
import { withAuth, NextRequestWithAuth } from "next-auth/middleware";

// Sign-in / sign-up pages stay public; all other routes need a session cookie.
const PUBLIC_PATH_PREFIXES = [
  AUTH_PATHS.SIGNIN,
  AUTH_PATHS.SIGNUP,
  AUTH_PATHS.RESET_PASSWORD,
] as const;

export default withAuth(
  async function middleware(req: NextRequestWithAuth) {
    const token     = req.nextauth.token as {
      error?:       string;
      tokenDeadAt?: number;
    } | null;
    const { pathname } = req.nextUrl;

    const hasErrorFlag = token?.error === "RefreshAccessTokenError";

    const isTimestampDead =
      typeof token?.tokenDeadAt === "number" && Date.now() >= token.tokenDeadAt;

    if (hasErrorFlag || isTimestampDead) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = AUTH_PATHS.SIGNIN;
      loginUrl.search = "";
      loginUrl.searchParams.set("error", "SessionExpired");
      loginUrl.searchParams.set("callbackUrl", "/");
      return NextResponse.redirect(loginUrl);
    }

    if (pathname === AUTH_PATHS.SIGNIN && token) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ req, token }) {
        const { pathname } = req.nextUrl;
        const isPublic = PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
        if (isPublic) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
      Skip API and static assets; middleware only wraps page navigations.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
