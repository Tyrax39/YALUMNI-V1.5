import { NextRequest } from "next/server";

import {
  fetchAuthenticatedBackend,
  proxyBackendResponse,
  validateCsrfToken
} from "@/lib/server/auth-session";

type BackendProxyContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function proxy(request: NextRequest, context: BackendProxyContext) {
  const csrfError = validateCsrfToken(request);
  if (csrfError) {
    return csrfError;
  }

  const { path } = await context.params;
  const backendPath = `/${path.map((segment) => encodeURIComponent(segment)).join("/")}${request.nextUrl.search}`;
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();
  const { backendResponse, clearSession, refreshedAuth } = await fetchAuthenticatedBackend(
    request,
    backendPath,
    {
      body,
      contentType: request.headers.get("content-type"),
      method: request.method
    }
  );

  return proxyBackendResponse(backendResponse, { clearSession, refreshedAuth });
}

export async function GET(request: NextRequest, context: BackendProxyContext) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: BackendProxyContext) {
  return proxy(request, context);
}

export async function PATCH(request: NextRequest, context: BackendProxyContext) {
  return proxy(request, context);
}

export async function PUT(request: NextRequest, context: BackendProxyContext) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: BackendProxyContext) {
  return proxy(request, context);
}
