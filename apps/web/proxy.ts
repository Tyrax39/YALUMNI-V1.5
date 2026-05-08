import { NextRequest, NextResponse } from "next/server";

const accessTokenCookieName = "yalumni_access_token";

export function proxy(request: NextRequest) {
  if (request.cookies.has(accessTokenCookieName)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/communities/:path*",
    "/contributions/:path*",
    "/dashboard/:path*",
    "/directory/:path*",
    "/elections/:path*",
    "/events/:path*",
    "/initiatives/:path*",
    "/mentorship/:path*",
    "/messages/:path*",
    "/onboarding/:path*",
    "/opportunities/:path*",
    "/profile/:path*",
    "/resources/:path*",
    "/success-stories/:path*",
    "/verification/:path*"
  ]
};
