export type AuthUser = {
  id: string;
  email: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  email_verified_at: string | null;
  roles: string[];
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  user: AuthUser;
  dev_email_verification_token: string | null;
};

export type RegisterPayload = {
  email: string;
  password: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type DevTokenResponse = {
  message: string;
  dev_token: string | null;
};

export type AuthSessionInfo = {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  is_current: boolean;
  is_active: boolean;
};

export type AuthSessionsResponse = {
  sessions: AuthSessionInfo[];
};

export type SessionRevocationResponse = {
  message: string;
  revoked_session_id: string;
  revoked_current_session: boolean;
};

export type AdminSecurityEvent = {
  id: string;
  event_type: string;
  user_id: string | null;
  created_at: string;
};

export type AdminOverview = {
  total_users: number;
  verified_users: number;
  unverified_users: number;
  active_sessions: number;
  admin_users: number;
  pending_verification_users: number;
  latest_security_events: AdminSecurityEvent[];
};

export const adminRoles: readonly string[] = [
  "SUPER_ADMIN",
  "PLATFORM_ADMIN",
  "VERIFICATION_ADMIN",
  "MODERATOR",
  "FINANCE_ADMIN",
  "ELECTION_ADMIN"
];

const fallbackApiBaseUrl = "http://127.0.0.1:8002";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? fallbackApiBaseUrl;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string | { msg?: string }[] };
    if (typeof body.detail === "string") {
      return body.detail;
    }
    if (Array.isArray(body.detail)) {
      return body.detail.map((item) => item.msg).filter(Boolean).join(" ");
    }
  } catch {
    return "Request failed";
  }

  return "Request failed";
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers
    }
  });

  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function register(payload: RegisterPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/v1/auth/register", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/v1/auth/login", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}

export function getMe(accessToken: string): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/v1/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

function authHeaders(accessToken: string, refreshToken?: string | null) {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(refreshToken ? { "X-Refresh-Token": refreshToken } : {})
  };
}

export function logout(refreshToken: string): Promise<void> {
  return apiFetch<void>("/api/v1/auth/logout", {
    body: JSON.stringify({ refresh_token: refreshToken }),
    method: "POST"
  });
}

export function getSessions(
  accessToken: string,
  refreshToken?: string | null
): Promise<AuthSessionsResponse> {
  return apiFetch<AuthSessionsResponse>("/api/v1/auth/sessions", {
    headers: authHeaders(accessToken, refreshToken)
  });
}

export function revokeSession(
  accessToken: string,
  sessionId: string,
  refreshToken?: string | null
): Promise<SessionRevocationResponse> {
  return apiFetch<SessionRevocationResponse>(`/api/v1/auth/sessions/${sessionId}`, {
    headers: authHeaders(accessToken, refreshToken),
    method: "DELETE"
  });
}

export function forgotPassword(email: string): Promise<DevTokenResponse> {
  return apiFetch<DevTokenResponse>("/api/v1/auth/password/forgot", {
    body: JSON.stringify({ email }),
    method: "POST"
  });
}

export function resetPassword(token: string, newPassword: string): Promise<DevTokenResponse> {
  return apiFetch<DevTokenResponse>("/api/v1/auth/password/reset", {
    body: JSON.stringify({ new_password: newPassword, token }),
    method: "POST"
  });
}

export function verifyEmail(token: string): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/v1/auth/email/verify", {
    body: JSON.stringify({ token }),
    method: "POST"
  });
}

export function bootstrapLocalAdmin(accessToken: string): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/v1/auth/dev/bootstrap-admin", {
    headers: authHeaders(accessToken),
    method: "POST"
  });
}

export function getAdminOverview(accessToken: string): Promise<AdminOverview> {
  return apiFetch<AdminOverview>("/api/v1/auth/admin/overview", {
    headers: authHeaders(accessToken)
  });
}
