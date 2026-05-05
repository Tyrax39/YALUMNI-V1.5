import { NextRequest, NextResponse } from "next/server";

import {
  BackendAuthResponse,
  backendErrorResponse,
  backendUrl,
  buildBackendHeaders,
  sanitizeAuthResponse,
  setAuthCookies
} from "@/lib/server/auth-session";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const backendResponse = await fetch(backendUrl("/api/v1/auth/login"), {
    body,
    cache: "no-store",
    headers: buildBackendHeaders(request, {
      contentType: request.headers.get("content-type") ?? "application/json"
    }),
    method: "POST"
  });

  if (!backendResponse.ok) {
    return backendErrorResponse(backendResponse);
  }

  const auth = (await backendResponse.json()) as BackendAuthResponse;
  const response = NextResponse.json(sanitizeAuthResponse(auth), {
    status: backendResponse.status
  });
  setAuthCookies(response, auth);

  return response;
}
