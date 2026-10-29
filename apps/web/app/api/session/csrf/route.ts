import { NextRequest, NextResponse } from "next/server";

import { csrfTokenForRequest, setCsrfCookie } from "@/lib/server/auth-session";

export async function GET(request: NextRequest) {
  const token = csrfTokenForRequest(request);
  const response = NextResponse.json({ csrf_token: token });
  setCsrfCookie(response, token);

  return response;
}
