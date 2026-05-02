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

const fallbackApiBaseUrl = "http://127.0.0.1:8001";

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

export function logout(refreshToken: string): Promise<void> {
  return apiFetch<void>("/api/v1/auth/logout", {
    body: JSON.stringify({ refresh_token: refreshToken }),
    method: "POST"
  });
}
