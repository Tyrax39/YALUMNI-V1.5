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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"]
};
