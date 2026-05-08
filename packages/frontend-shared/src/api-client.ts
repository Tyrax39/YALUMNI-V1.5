export type AuthUser = {
  created_at?: string;
  display_name: string;
  email: string;
  email_verified?: boolean;
  first_name?: string | null;
  id: string;
  is_active?: boolean;
  last_name?: string | null;
  roles: string[];
};

export type AdminOverview = {
  active_users?: number;
  active_sessions?: number;
  admin_users?: number;
  latest_security_events?: unknown[];
  pending_verification_users?: number;
  roles?: Record<string, number>;
  total_users?: number;
  unverified_users?: number;
  verified_users?: number;
};

export type AdminAuditEvent = {
  event_type?: string;
  user_email?: string | null;
  user_display_name?: string | null;
  created_at: string;
  id: string;
  metadata?: Record<string, unknown> | null;
  target_type?: string | null;
};

export type AdminAuditEventListResponse = {
  events: AdminAuditEvent[];
  limit: number;
  offset: number;
  total: number;
};

export class ApiClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
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
    return response.statusText || "Request failed";
  }

  return response.statusText || "Request failed";
}

export async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers: {
      accept: "application/json",
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new ApiClientError(await readError(response), response.status);
  }

  return (await response.json()) as T;
}

export function fetchSessionUser(): Promise<AuthUser> {
  return fetchJson<AuthUser>("/api/backend/api/v1/auth/me");
}

export function fetchAdminOverview(): Promise<AdminOverview> {
  return fetchJson<AdminOverview>("/api/backend/api/v1/auth/admin/overview");
}

export function fetchAdminAuditEvents(limit = 6): Promise<AdminAuditEventListResponse> {
  return fetchJson<AdminAuditEventListResponse>(
    `/api/backend/api/v1/auth/admin/audit-events?limit=${limit}`
  );
}
