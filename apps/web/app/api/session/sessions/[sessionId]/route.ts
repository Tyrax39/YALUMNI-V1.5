import { NextRequest, NextResponse } from "next/server";

import {
  clearAuthCookies,
  fetchAuthenticatedBackend,
  proxyBackendResponse,
  setAuthCookies,
  validateCsrfToken
} from "@/lib/server/auth-session";

type SessionRouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function DELETE(request: NextRequest, context: SessionRouteContext) {
  const csrfError = validateCsrfToken(request);
  if (csrfError) {
    return csrfError;
  }

  const { sessionId } = await context.params;
  const { backendResponse, clearSession, refreshedAuth } = await fetchAuthenticatedBackend(
    request,
    `/api/v1/auth/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "DELETE"
    }
  );

  if (!backendResponse.ok) {
    return proxyBackendResponse(backendResponse, { clearSession, refreshedAuth });
  }

  const payload = (await backendResponse.json()) as { revoked_current_session?: boolean };
  const response = NextResponse.json(payload, { status: backendResponse.status });
  if (refreshedAuth) {
    setAuthCookies(response, refreshedAuth);
  }
  if (payload.revoked_current_session) {
    clearAuthCookies(response);
  }

  return response;
}
