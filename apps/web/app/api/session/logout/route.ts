import { NextRequest, NextResponse } from "next/server";

import {
  backendUrl,
  buildBackendHeaders,
  clearAuthCookies,
  getRefreshToken,
  validateCsrfToken
} from "@/lib/server/auth-session";

export async function POST(request: NextRequest) {
  const csrfError = validateCsrfToken(request);
  if (csrfError) {
    return csrfError;
  }

  const refreshToken = getRefreshToken(request);

  if (refreshToken) {
    await fetch(backendUrl("/api/v1/auth/logout"), {
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
      headers: buildBackendHeaders(request, {
        contentType: "application/json"
      }),
      method: "POST"
    }).catch(() => undefined);
  }

  const response = new NextResponse(null, { status: 204 });
  clearAuthCookies(response);

  return response;
}
