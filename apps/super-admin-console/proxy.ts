import { hasAnyRole, SUPER_ADMIN_ROLE } from "@yalumni/frontend-shared";
import { NextRequest, NextResponse } from "next/server";

import {
  clearAuthCookies,
  resolveSessionUser,
  setAuthCookies
} from "@/lib/server/auth-session";

function redirectToLogin(
  request: NextRequest,
  options: {
    clearSession?: boolean;
    reason?: string;
    refreshed?: Parameters<typeof setAuthCookies>[1] | null;
  } = {}
) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  if (options.reason) {
    loginUrl.searchParams.set("reason", options.reason);
  }
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

  if (!hasAnyRole(resolution.user.roles, [SUPER_ADMIN_ROLE])) {
    return redirectToLogin(request, {
      reason: "super-admin-role-required",
      refreshed: resolution.refreshedAuth
    });
  }

  const response = NextResponse.next();
  if (resolution.refreshedAuth) {
    setAuthCookies(response, resolution.refreshedAuth);
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"]
};
