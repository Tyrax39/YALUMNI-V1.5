import "server-only";

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const accessTokenCookieName = "yalumni_access_token";
export const csrfCookieName = "yalumni_csrf_token";
export const csrfHeaderName = "x-csrf-token";
export const refreshTokenCookieName = "yalumni_refresh_token";

const fallbackApiBaseUrl = "http://127.0.0.1:8002";
const refreshCookieDays = Number(process.env.YALUMNI_REFRESH_COOKIE_DAYS ?? "30");
const trustedOriginSet = new Set(
  (process.env.YALUMNI_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

export const serverApiBaseUrl =
  process.env.API_BASE_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  fallbackApiBaseUrl;

type CookieSameSite = "lax" | "none" | "strict";

type AuthUserPayload = Record<string, unknown>;
export type BackendSessionUser = AuthUserPayload & {
  email?: string;
  id?: string;
  roles?: string[];
};

export type BackendAuthResponse = {
  access_token: string;
  dev_email_verification_token: string | null;
  expires_in: number;
  refresh_token: string;
  token_type: "bearer";
  user: AuthUserPayload;
};

type SanitizedAuthResponse = {
  dev_email_verification_token: string | null;
  expires_in: number;
  user: AuthUserPayload;
};

type AuthenticatedBackendResponse = {
  backendResponse: Response;
  clearSession: boolean;
  refreshedAuth: BackendAuthResponse | null;
};

export type ResolvedSessionUser = {
  clearSession: boolean;
  refreshedAuth: BackendAuthResponse | null;
  user: BackendSessionUser | null;
};

function resolveCookieSameSite(): CookieSameSite {
  const configuredValue = process.env.YALUMNI_COOKIE_SAME_SITE?.trim().toLowerCase();
  if (configuredValue === "strict" || configuredValue === "none") {
    return configuredValue;
  }

  return "lax";
}

function resolveCookieSecure(sameSite: CookieSameSite): boolean {
  const configuredValue = process.env.YALUMNI_COOKIE_SECURE?.trim().toLowerCase();
  if (configuredValue === "true") {
    return true;
  }
  if (configuredValue === "false") {
    return sameSite === "none";
  }

  return process.env.NODE_ENV === "production" || sameSite === "none";
}

const cookieSameSite = resolveCookieSameSite();
const cookieSecure = resolveCookieSecure(cookieSameSite);

const cookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: cookieSameSite,
  secure: cookieSecure
};

const csrfCookieOptions = {
  httpOnly: false,
  path: "/",
  sameSite: cookieSameSite,
  secure: cookieSecure
};

function getRequestOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (origin) {
    return origin;
  }

  const referer = request.headers.get("referer");
  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function isTrustedOrigin(request: NextRequest): boolean {
  const requestOrigin = getRequestOrigin(request);
  if (!requestOrigin) {
    return true;
  }

  return requestOrigin === request.nextUrl.origin || trustedOriginSet.has(requestOrigin);
}

export function getAccessToken(request: NextRequest): string | null {
  return request.cookies.get(accessTokenCookieName)?.value ?? null;
}

export function getRefreshToken(request: NextRequest): string | null {
  return request.cookies.get(refreshTokenCookieName)?.value ?? null;
}

export function getCsrfToken(request: NextRequest): string | null {
  return request.cookies.get(csrfCookieName)?.value ?? null;
}

export function setCsrfCookie(response: NextResponse, token: string) {
  response.cookies.set(csrfCookieName, token, {
    ...csrfCookieOptions,
    maxAge: Math.max(1, refreshCookieDays) * 24 * 60 * 60
  });
}

export function csrfTokenForRequest(request: NextRequest): string {
  return getCsrfToken(request) ?? randomUUID();
}

export function validateCsrfToken(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ detail: "Request origin is not allowed" }, { status: 403 });
  }

  const csrfCookie = getCsrfToken(request);
  const csrfHeader = request.headers.get(csrfHeaderName);
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return NextResponse.json({ detail: "CSRF token missing or invalid" }, { status: 403 });
  }

  return null;
}

export function sanitizeAuthResponse(auth: BackendAuthResponse): SanitizedAuthResponse {
  return {
    dev_email_verification_token: auth.dev_email_verification_token,
    expires_in: auth.expires_in,
    user: auth.user
  };
}

export function setAuthCookies(response: NextResponse, auth: BackendAuthResponse) {
  response.cookies.set(accessTokenCookieName, auth.access_token, {
    ...cookieOptions,
    maxAge: Math.max(60, auth.expires_in)
  });
  response.cookies.set(refreshTokenCookieName, auth.refresh_token, {
    ...cookieOptions,
    maxAge: Math.max(1, refreshCookieDays) * 24 * 60 * 60
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(accessTokenCookieName, "", {
    ...cookieOptions,
    maxAge: 0
  });
  response.cookies.set(refreshTokenCookieName, "", {
    ...cookieOptions,
    maxAge: 0
  });
  response.cookies.set(csrfCookieName, "", {
    ...csrfCookieOptions,
    maxAge: 0
  });
}

export async function readBackendError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string | { msg?: string }[] };
    if (typeof body.detail === "string") {
      return body.detail;
    }
    if (Array.isArray(body.detail)) {
      return body.detail.map((item) => item.msg).filter(Boolean).join(" ");
    }
  } catch {
    return response.statusText || "Request failed";
  }

  return response.statusText || "Request failed";
}

export async function backendErrorResponse(backendResponse: Response): Promise<NextResponse> {
  return NextResponse.json(
    { detail: await readBackendError(backendResponse) },
    { status: backendResponse.status }
  );
}

export function backendUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${serverApiBaseUrl}${normalizedPath}`;
}

export function buildBackendHeaders(
  request: NextRequest,
  options: {
    accessToken?: string | null;
    contentType?: string | null;
    refreshToken?: string | null;
  } = {}
): Headers {
  const headers = new Headers();
  const accept = request.headers.get("accept");
  const userAgent = request.headers.get("user-agent");
  const forwardedFor = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");

  if (accept) {
    headers.set("accept", accept);
  }
  if (options.contentType) {
    headers.set("content-type", options.contentType);
  }
  if (userAgent) {
    headers.set("user-agent", userAgent);
  }
  if (forwardedFor) {
    headers.set("x-forwarded-for", forwardedFor);
  }
  if (options.accessToken) {
    headers.set("authorization", `Bearer ${options.accessToken}`);
  }
  if (options.refreshToken) {
    headers.set("x-refresh-token", options.refreshToken);
  }

  return headers;
}

export async function refreshSession(request: NextRequest): Promise<BackendAuthResponse | null> {
  const refreshToken = getRefreshToken(request);
  if (!refreshToken) {
    return null;
  }

  const backendResponse = await fetch(backendUrl("/api/v1/auth/refresh"), {
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "user-agent": request.headers.get("user-agent") ?? "YALUMNI super-admin session"
    },
    method: "POST"
  });

  if (!backendResponse.ok) {
    return null;
  }

  return (await backendResponse.json()) as BackendAuthResponse;
}

async function fetchSessionUserWithToken(
  request: NextRequest,
  accessToken: string,
  refreshToken: string | null
): Promise<BackendSessionUser | null> {
  const backendResponse = await fetch(backendUrl("/api/v1/auth/me"), {
    cache: "no-store",
    headers: buildBackendHeaders(request, {
      accessToken,
      refreshToken
    }),
    method: "GET"
  });

  if (!backendResponse.ok) {
    return null;
  }

  return (await backendResponse.json()) as BackendSessionUser;
}

export async function resolveSessionUser(request: NextRequest): Promise<ResolvedSessionUser> {
  const accessToken = getAccessToken(request);
  const refreshToken = getRefreshToken(request);

  let refreshedAuth: BackendAuthResponse | null = null;
  let sessionAccessToken = accessToken;
  let sessionRefreshToken = refreshToken;

  if (!sessionAccessToken && sessionRefreshToken) {
    refreshedAuth = await refreshSession(request);
    if (!refreshedAuth) {
      return { clearSession: true, refreshedAuth: null, user: null };
    }

    sessionAccessToken = refreshedAuth.access_token;
    sessionRefreshToken = refreshedAuth.refresh_token;
  }

  if (!sessionAccessToken) {
    return { clearSession: false, refreshedAuth, user: null };
  }

  const initialUser = await fetchSessionUserWithToken(
    request,
    sessionAccessToken,
    sessionRefreshToken ?? null
  );
  if (initialUser) {
    return { clearSession: false, refreshedAuth, user: initialUser };
  }

  if (!sessionRefreshToken || refreshedAuth) {
    return { clearSession: true, refreshedAuth, user: null };
  }

  refreshedAuth = await refreshSession(request);
  if (!refreshedAuth) {
    return { clearSession: true, refreshedAuth: null, user: null };
  }

  const refreshedUser = await fetchSessionUserWithToken(
    request,
    refreshedAuth.access_token,
    refreshedAuth.refresh_token
  );
  if (!refreshedUser) {
    return { clearSession: true, refreshedAuth, user: null };
  }

  return { clearSession: false, refreshedAuth, user: refreshedUser };
}

export function proxyBackendResponse(
  backendResponse: Response,
  options: { clearSession?: boolean; refreshedAuth?: BackendAuthResponse | null } = {}
): NextResponse {
  const headers = new Headers();
  const contentType = backendResponse.headers.get("content-type");
  const contentDisposition = backendResponse.headers.get("content-disposition");
  const cacheControl = backendResponse.headers.get("cache-control");

  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (contentDisposition) {
    headers.set("content-disposition", contentDisposition);
  }
  headers.set("cache-control", cacheControl ?? "no-store");

  const response = new NextResponse(backendResponse.body, {
    headers,
    status: backendResponse.status,
    statusText: backendResponse.statusText
  });

  if (options.refreshedAuth) {
    setAuthCookies(response, options.refreshedAuth);
  }
  if (options.clearSession) {
    clearAuthCookies(response);
  }

  return response;
}

export async function fetchAuthenticatedBackend(
  request: NextRequest,
  backendPath: string,
  options: {
    body?: BodyInit | null;
    contentType?: string | null;
    method: string;
  }
): Promise<AuthenticatedBackendResponse> {
  const accessToken = getAccessToken(request);
  const refreshToken = getRefreshToken(request);

  if (!accessToken) {
    return {
      backendResponse: Response.json({ detail: "Authentication required" }, { status: 401 }),
      clearSession: false,
      refreshedAuth: null
    };
  }

  const requestInit: RequestInit = {
    body: options.body,
    cache: "no-store",
    headers: buildBackendHeaders(request, {
      accessToken,
      contentType: options.contentType,
      refreshToken
    }),
    method: options.method
  };

  let backendResponse = await fetch(backendUrl(backendPath), requestInit);

  if (backendResponse.status !== 401 || !refreshToken) {
    return {
      backendResponse,
      clearSession: backendResponse.status === 401,
      refreshedAuth: null
    };
  }

  const refreshedAuth = await refreshSession(request);
  if (!refreshedAuth) {
    return {
      backendResponse,
      clearSession: true,
      refreshedAuth: null
    };
  }

  backendResponse = await fetch(backendUrl(backendPath), {
    ...requestInit,
    headers: buildBackendHeaders(request, {
      accessToken: refreshedAuth.access_token,
      contentType: options.contentType,
      refreshToken: refreshedAuth.refresh_token
    })
  });

  return {
    backendResponse,
    clearSession: backendResponse.status === 401,
    refreshedAuth
  };
}
