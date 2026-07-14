import { ADMIN_ROLES, hasAnyRole, MEMBER_ACCESS_ROLES } from "@yalumni/frontend-shared";
import { NextRequest, NextResponse } from "next/server";

import {
  clearAuthCookies,
  resolveSessionUser,
  setAuthCookies
} from "@/lib/server/auth-session";

const memberWorkspaceRoleNames = [...MEMBER_ACCESS_ROLES, ...ADMIN_ROLES] as const;
const memberOnlyPrefixes = [
  "/communities",
  "/contributions",
  "/directory",
  "/elections",
  "/messages"
] as const;

function pathnameMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function redirectToLogin(
  request: NextRequest,
  options: { clearSession?: boolean; refreshed?: Parameters<typeof setAuthCookies>[1] | null } = {}
) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const response = NextResponse.redirect(loginUrl);
  if (options.refreshed) {
    setAuthCookies(response, options.refreshed);
  }
  if (options.clearSession) {
    clearAuthCookies(response);
  }

  return response;
}

export async function proxy(request: NextRequest) {
  const resolution = await resolveSessionUser(request);
  if (!resolution.user) {
    return redirectToLogin(request, {
      clearSession: resolution.clearSession,
      refreshed: resolution.refreshedAuth
    });
  }

  const pathname = request.nextUrl.pathname;
  if (
    pathnameMatchesPrefix(pathname, "/admin") &&
    !hasAnyRole(resolution.user.roles, ADMIN_ROLES)
  ) {
    const redirectUrl = new URL("/dashboard", request.url);
    redirectUrl.searchParams.set("denied", "admin");
    const response = NextResponse.redirect(redirectUrl);
    if (resolution.refreshedAuth) {
      setAuthCookies(response, resolution.refreshedAuth);
    }
    return response;
  }

  if (
    memberOnlyPrefixes.some((prefix) => pathnameMatchesPrefix(pathname, prefix)) &&
    !hasAnyRole(resolution.user.roles, memberWorkspaceRoleNames)
  ) {
    const redirectUrl = new URL("/verification", request.url);
    redirectUrl.searchParams.set("denied", "member-workspace");
    const response = NextResponse.redirect(redirectUrl);
    if (resolution.refreshedAuth) {
      setAuthCookies(response, resolution.refreshedAuth);
    }
    return response;
  }

  const response = NextResponse.next();
  if (resolution.refreshedAuth) {
    setAuthCookies(response, resolution.refreshedAuth);
  }
  return response;
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
