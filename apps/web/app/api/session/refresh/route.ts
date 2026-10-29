import { NextRequest, NextResponse } from "next/server";

import {
  clearAuthCookies,
  refreshSession,
  sanitizeAuthResponse,
  setAuthCookies,
  validateCsrfToken
} from "@/lib/server/auth-session";

export async function POST(request: NextRequest) {
  const csrfError = validateCsrfToken(request);
  if (csrfError) {
    return csrfError;
  }

  const auth = await refreshSession(request);
  if (!auth) {
    const response = NextResponse.json({ detail: "Session could not be refreshed" }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  const response = NextResponse.json(sanitizeAuthResponse(auth));
  setAuthCookies(response, auth);

  return response;
}

export async function GET() {
  return NextResponse.json({ detail: "Use POST to refresh a session" }, { status: 405 });
}
