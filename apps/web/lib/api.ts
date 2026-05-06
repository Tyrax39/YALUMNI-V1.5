export type AuthUser = {
  id: string;
  email: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  email_verified_at: string | null;
  two_factor_enabled: boolean;
  roles: string[];
};

export type AuthResponse = {
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

export type TwoFactorStatus = {
  enabled: boolean;
  admin_two_factor_required: boolean;
  admin_two_factor_satisfied: boolean;
};

export type TwoFactorSetup = {
  secret: string;
  otpauth_url: string;
  enabled: boolean;
};

type CsrfResponse = {
  csrf_token: string;
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

export type AdminAuditEvent = {
  id: string;
  event_type: string;
  user_id: string | null;
  user_email: string | null;
  user_display_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type AdminAuditEventListResponse = {
  events: AdminAuditEvent[];
  total: number;
  limit: number;
  offset: number;
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

export type ProgramAffiliation = {
  id: string;
  program_name: string;
  cohort_year: number | null;
  country: string | null;
  city: string | null;
  status: string;
  created_at: string;
};

export type AlumniProfile = {
  id: string;
  user_id: string;
  headline: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  sector: string | null;
  organization: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  skills: string[];
  visibility: Record<string, boolean>;
  profile_completed_at: string | null;
  completion_percentage: number;
  profile_photo_url: string | null;
  profile_photo_file_name: string | null;
  profile_photo_content_type: string | null;
  profile_photo_file_size_bytes: number | null;
  profile_photo_updated_at: string | null;
  program_affiliations: ProgramAffiliation[];
};

export type AlumniProfileUpdate = {
  headline?: string | null;
  bio?: string | null;
  country?: string | null;
  city?: string | null;
  sector?: string | null;
  organization?: string | null;
  job_title?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
  skills?: string[] | null;
  visibility?: Record<string, boolean> | null;
};

export type ProgramAffiliationPayload = {
  program_name: string;
  cohort_year?: number | null;
  country?: string | null;
  city?: string | null;
  status?: string;
};

export type VerificationRequest = {
  id: string;
  profile_id: string;
  user_id: string;
  display_name: string;
  email: string;
  request_type: string;
  status: string;
  submitted_note: string | null;
  reviewer_note: string | null;
  profile_snapshot: {
    completion_percentage?: number;
    headline?: string | null;
    bio?: string | null;
    country?: string | null;
    city?: string | null;
    sector?: string | null;
    organization?: string | null;
    job_title?: string | null;
    skills?: string[];
    program_affiliations?: Array<{
      program_name: string;
      cohort_year: number | null;
      country: string | null;
      city: string | null;
      status: string;
    }>;
  };
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  evidence: VerificationEvidence[];
};

export type VerificationRequestListResponse = {
  requests: VerificationRequest[];
};

export type VerificationRequestPayload = {
  request_type?: string;
  submitted_note?: string | null;
};

export type VerificationReviewAction = "approve" | "reject" | "request-info";

export type VerificationEvidence = {
  id: string;
  label: string | null;
  file_name: string;
  content_type: string;
  file_size_bytes: number;
  storage_provider: string;
  uploaded_by_user_id: string | null;
  created_at: string;
};

export type AlumniDirectoryProgram = {
  program_name: string;
  cohort_year: number | null;
  country: string | null;
  city: string | null;
  status: string;
};

export type AlumniDirectoryProfile = {
  user_id: string;
  display_name: string;
  email: string | null;
  headline: string | null;
  country: string | null;
  city: string | null;
  sector: string | null;
  organization: string | null;
  job_title: string | null;
  profile_photo_url: string | null;
  skills: string[];
  program_affiliations: AlumniDirectoryProgram[];
  profile_completed_at: string | null;
};

export type AlumniDirectorySearchResponse = {
  has_more: boolean;
  limit: number;
  offset: number;
  profiles: AlumniDirectoryProfile[];
  total: number;
};

export type Community = {
  id: string;
  name: string;
  slug: string;
  community_type: string;
  description: string | null;
  country: string | null;
  city: string | null;
  sector: string | null;
  program_name: string | null;
  cohort_year: number | null;
  visibility: string;
  join_policy: string;
  member_count: number;
  membership_status: string | null;
  membership_role: string | null;
  created_at: string;
};

export type CommunityListResponse = {
  communities: Community[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type CommunityMember = {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  role: string;
  status: string;
  joined_at: string | null;
  created_at: string;
};

export type CommunityMemberListResponse = {
  members: CommunityMember[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type CommunityInvitation = {
  id: string;
  community_id: string;
  invited_email: string;
  invited_role: string;
  status: string;
  invited_by_user_id: string | null;
  accepted_by_user_id: string | null;
  accepted_at: string | null;
  canceled_at: string | null;
  expires_at: string;
  created_at: string;
  dev_invitation_token: string | null;
};

export type CommunityInvitationListResponse = {
  invitations: CommunityInvitation[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type CommunityPost = {
  id: string;
  community_id: string;
  author_user_id: string | null;
  author_display_name: string;
  body: string;
  status: string;
  removed_by_user_id: string | null;
  removed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CommunityPostListResponse = {
  posts: CommunityPost[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type CommunityCreatePayload = {
  name: string;
  community_type?: string;
  description?: string | null;
  country?: string | null;
  city?: string | null;
  sector?: string | null;
  program_name?: string | null;
  cohort_year?: number | null;
  visibility?: string;
  join_policy?: string;
};

export type CommunityUpdatePayload = Partial<CommunityCreatePayload>;

export type CommunityInvitationCreatePayload = {
  email: string;
  role?: "MANAGER" | "MEMBER";
};

export type CommunityOwnershipTransferPayload = {
  new_owner_membership_id: string;
};

export type CommunityPostCreatePayload = {
  body: string;
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
  const hasFormDataBody = typeof FormData !== "undefined" && init.body instanceof FormData;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(hasFormDataBody ? {} : { "Content-Type": "application/json" }),
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

const csrfCookieName = "yalumni_csrf_token";
const csrfHeaderName = "X-CSRF-Token";
const csrfProtectedMethods = new Set(["DELETE", "PATCH", "POST", "PUT"]);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${name}=`;
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

async function getCsrfToken(): Promise<string> {
  const existingToken = readCookie(csrfCookieName);
  if (existingToken) {
    return existingToken;
  }

  const response = await fetch("/api/session/csrf", {
    cache: "no-store",
    credentials: "same-origin"
  });

  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }

  const body = (await response.json()) as CsrfResponse;
  return body.csrf_token;
}

async function webApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const hasFormDataBody = typeof FormData !== "undefined" && init.body instanceof FormData;
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (!hasFormDataBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (csrfProtectedMethods.has(method)) {
    headers.set(csrfHeaderName, await getCsrfToken());
  }

  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers
  });

  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function protectedApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  return webApiFetch<T>(`/api/backend${path}`, init);
}

export function register(payload: RegisterPayload): Promise<AuthResponse> {
  return webApiFetch<AuthResponse>("/api/session/register", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return webApiFetch<AuthResponse>("/api/session/login", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}

export function getMe(accessToken?: string): Promise<AuthUser> {
  void accessToken;
  return protectedApiFetch<AuthUser>("/api/v1/auth/me");
}

export function getTwoFactorStatus(accessToken: string): Promise<TwoFactorStatus> {
  return protectedApiFetch<TwoFactorStatus>("/api/v1/auth/me/security", {
    headers: authHeaders(accessToken)
  });
}

export function setupTwoFactor(
  accessToken: string,
  password: string
): Promise<TwoFactorSetup> {
  return protectedApiFetch<TwoFactorSetup>("/api/v1/auth/me/2fa/setup", {
    body: JSON.stringify({ password }),
    headers: authHeaders(accessToken),
    method: "POST"
  });
}

export function confirmTwoFactor(accessToken: string, code: string): Promise<AuthUser> {
  return protectedApiFetch<AuthUser>("/api/v1/auth/me/2fa/confirm", {
    body: JSON.stringify({ code }),
    headers: authHeaders(accessToken),
    method: "POST"
  });
}

export function disableTwoFactor(
  accessToken: string,
  payload: { code: string; password: string }
): Promise<AuthUser> {
  return protectedApiFetch<AuthUser>("/api/v1/auth/me/2fa/disable", {
    body: JSON.stringify(payload),
    headers: authHeaders(accessToken),
    method: "POST"
  });
}

function authHeaders(accessToken: string, refreshToken?: string | null) {
  void accessToken;
  void refreshToken;
  return {};
}

export function logout(refreshToken?: string | null): Promise<void> {
  void refreshToken;
  return webApiFetch<void>("/api/session/logout", {
    method: "POST"
  });
}

export function getSessions(
  accessToken: string,
  refreshToken?: string | null
): Promise<AuthSessionsResponse> {
  return protectedApiFetch<AuthSessionsResponse>("/api/v1/auth/sessions", {
    headers: authHeaders(accessToken, refreshToken)
  });
}

export function revokeSession(
  accessToken: string,
  sessionId: string,
  refreshToken?: string | null
): Promise<SessionRevocationResponse> {
  return webApiFetch<SessionRevocationResponse>(`/api/session/sessions/${sessionId}`, {
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
  return protectedApiFetch<AuthUser>("/api/v1/auth/dev/bootstrap-admin", {
    headers: authHeaders(accessToken),
    method: "POST"
  });
}

export function getAdminOverview(accessToken: string): Promise<AdminOverview> {
  return protectedApiFetch<AdminOverview>("/api/v1/auth/admin/overview", {
    headers: authHeaders(accessToken)
  });
}

export function getAdminAuditEvents(
  accessToken: string,
  params: { eventType?: string; limit?: number; offset?: number; userId?: string } = {}
): Promise<AdminAuditEventListResponse> {
  const searchParams = new URLSearchParams();
  if (params.eventType) {
    searchParams.set("event_type", params.eventType);
  }
  if (params.userId) {
    searchParams.set("user_id", params.userId);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset) {
    searchParams.set("offset", String(params.offset));
  }

  const query = searchParams.toString();
  return protectedApiFetch<AdminAuditEventListResponse>(
    `/api/v1/auth/admin/audit-events${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function getMyAlumniProfile(accessToken: string): Promise<AlumniProfile> {
  return protectedApiFetch<AlumniProfile>("/api/v1/alumni/me/profile", {
    headers: authHeaders(accessToken)
  });
}

export function updateMyAlumniProfile(
  accessToken: string,
  payload: AlumniProfileUpdate
): Promise<AlumniProfile> {
  return protectedApiFetch<AlumniProfile>("/api/v1/alumni/me/profile", {
    body: JSON.stringify(payload),
    headers: authHeaders(accessToken),
    method: "PATCH"
  });
}

export function uploadProfilePhoto(accessToken: string, file: File): Promise<AlumniProfile> {
  const formData = new FormData();
  formData.set("file", file);

  return protectedApiFetch<AlumniProfile>("/api/v1/alumni/me/profile-photo", {
    body: formData,
    headers: authHeaders(accessToken),
    method: "POST"
  });
}

export function deleteProfilePhoto(accessToken: string): Promise<AlumniProfile> {
  return protectedApiFetch<AlumniProfile>("/api/v1/alumni/me/profile-photo", {
    headers: authHeaders(accessToken),
    method: "DELETE"
  });
}

export async function downloadProfilePhoto(
  accessToken: string,
  userId: string
): Promise<Blob> {
  const response = await fetch(`/api/backend/api/v1/alumni/${userId}/photo`, {
    credentials: "same-origin",
    headers: authHeaders(accessToken)
  });

  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }

  return response.blob();
}

export function addProgramAffiliation(
  accessToken: string,
  payload: ProgramAffiliationPayload
): Promise<AlumniProfile> {
  return protectedApiFetch<AlumniProfile>("/api/v1/alumni/me/program-affiliations", {
    body: JSON.stringify(payload),
    headers: authHeaders(accessToken),
    method: "POST"
  });
}

export function getMyVerificationRequests(
  accessToken: string
): Promise<VerificationRequestListResponse> {
  return protectedApiFetch<VerificationRequestListResponse>("/api/v1/alumni/me/verification-requests", {
    headers: authHeaders(accessToken)
  });
}

export function submitVerificationRequest(
  accessToken: string,
  payload: VerificationRequestPayload
): Promise<VerificationRequest> {
  return protectedApiFetch<VerificationRequest>("/api/v1/alumni/me/verification-requests", {
    body: JSON.stringify(payload),
    headers: authHeaders(accessToken),
    method: "POST"
  });
}

export function getAdminVerificationRequests(
  accessToken: string,
  status = "PENDING_REVIEW"
): Promise<VerificationRequestListResponse> {
  return protectedApiFetch<VerificationRequestListResponse>(
    `/api/v1/alumni/admin/verification-requests?status=${encodeURIComponent(status)}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function reviewVerificationRequest(
  accessToken: string,
  requestId: string,
  action: VerificationReviewAction,
  reviewerNote?: string | null
): Promise<VerificationRequest> {
  return protectedApiFetch<VerificationRequest>(
    `/api/v1/alumni/admin/verification-requests/${requestId}/${action}`,
    {
      body: JSON.stringify({ reviewer_note: reviewerNote ?? null }),
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function uploadVerificationEvidence(
  accessToken: string,
  requestId: string,
  payload: { file: File; label?: string | null }
): Promise<VerificationEvidence> {
  const formData = new FormData();
  formData.set("file", payload.file);
  if (payload.label) {
    formData.set("label", payload.label);
  }

  return protectedApiFetch<VerificationEvidence>(
    `/api/v1/alumni/me/verification-requests/${requestId}/evidence`,
    {
      body: formData,
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export async function downloadVerificationEvidence(
  accessToken: string,
  requestId: string,
  evidenceId: string
): Promise<Blob> {
  const response = await fetch(
    `/api/backend/api/v1/alumni/verification-requests/${requestId}/evidence/${evidenceId}/download`,
    {
      credentials: "same-origin",
      headers: authHeaders(accessToken)
    }
  );

  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }

  return response.blob();
}

export function searchAlumniDirectory(
  accessToken: string,
  params: {
    city?: string;
    cohortYear?: number | null;
    country?: string;
    limit?: number;
    offset?: number;
    programName?: string;
    q?: string;
    sector?: string;
    skill?: string;
    sort?: string;
  } = {}
): Promise<AlumniDirectorySearchResponse> {
  const searchParams = new URLSearchParams();
  if (params.q) {
    searchParams.set("q", params.q);
  }
  if (params.country) {
    searchParams.set("country", params.country);
  }
  if (params.city) {
    searchParams.set("city", params.city);
  }
  if (params.sector) {
    searchParams.set("sector", params.sector);
  }
  if (params.programName) {
    searchParams.set("program_name", params.programName);
  }
  if (params.cohortYear) {
    searchParams.set("cohort_year", String(params.cohortYear));
  }
  if (params.skill) {
    searchParams.set("skill", params.skill);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset) {
    searchParams.set("offset", String(params.offset));
  }
  if (params.sort) {
    searchParams.set("sort", params.sort);
  }

  const query = searchParams.toString();
  return protectedApiFetch<AlumniDirectorySearchResponse>(
    `/api/v1/alumni/search${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function getAlumniDirectoryProfile(
  accessToken: string,
  userId: string
): Promise<AlumniDirectoryProfile> {
  return protectedApiFetch<AlumniDirectoryProfile>(
    `/api/v1/alumni/${encodeURIComponent(userId)}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function listCommunities(
  accessToken: string,
  params: {
    communityType?: string;
    country?: string;
    limit?: number;
    membership?: string;
    offset?: number;
    q?: string;
    sector?: string;
  } = {}
): Promise<CommunityListResponse> {
  const searchParams = new URLSearchParams();
  if (params.q) {
    searchParams.set("q", params.q);
  }
  if (params.communityType) {
    searchParams.set("community_type", params.communityType);
  }
  if (params.country) {
    searchParams.set("country", params.country);
  }
  if (params.sector) {
    searchParams.set("sector", params.sector);
  }
  if (params.membership) {
    searchParams.set("membership", params.membership);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset) {
    searchParams.set("offset", String(params.offset));
  }

  const query = searchParams.toString();
  return protectedApiFetch<CommunityListResponse>(
    `/api/v1/communities${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function createCommunity(
  accessToken: string,
  payload: CommunityCreatePayload
): Promise<Community> {
  return protectedApiFetch<Community>("/api/v1/communities", {
    body: JSON.stringify(payload),
    headers: authHeaders(accessToken),
    method: "POST"
  });
}

export function getCommunity(accessToken: string, communityId: string): Promise<Community> {
  return protectedApiFetch<Community>(
    `/api/v1/communities/${encodeURIComponent(communityId)}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function updateCommunity(
  accessToken: string,
  communityId: string,
  payload: CommunityUpdatePayload
): Promise<Community> {
  return protectedApiFetch<Community>(
    `/api/v1/communities/${encodeURIComponent(communityId)}`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "PATCH"
    }
  );
}

export function listCommunityMembers(
  accessToken: string,
  communityId: string,
  params: { limit?: number; offset?: number; status?: string } = {}
): Promise<CommunityMemberListResponse> {
  const searchParams = new URLSearchParams();
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset) {
    searchParams.set("offset", String(params.offset));
  }

  const query = searchParams.toString();
  return protectedApiFetch<CommunityMemberListResponse>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/members${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function listCommunityInvitations(
  accessToken: string,
  communityId: string,
  params: { limit?: number; offset?: number; status?: string } = {}
): Promise<CommunityInvitationListResponse> {
  const searchParams = new URLSearchParams();
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset) {
    searchParams.set("offset", String(params.offset));
  }

  const query = searchParams.toString();
  return protectedApiFetch<CommunityInvitationListResponse>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/invitations${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function createCommunityInvitation(
  accessToken: string,
  communityId: string,
  payload: CommunityInvitationCreatePayload
): Promise<CommunityInvitation> {
  return protectedApiFetch<CommunityInvitation>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/invitations`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function cancelCommunityInvitation(
  accessToken: string,
  communityId: string,
  invitationId: string
): Promise<CommunityInvitation> {
  return protectedApiFetch<CommunityInvitation>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/invitations/${encodeURIComponent(invitationId)}/cancel`,
    {
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function acceptCommunityInvitation(
  accessToken: string,
  token: string
): Promise<Community> {
  return protectedApiFetch<Community>("/api/v1/communities/invitations/accept", {
    body: JSON.stringify({ token }),
    headers: authHeaders(accessToken),
    method: "POST"
  });
}

export function listCommunityPosts(
  accessToken: string,
  communityId: string,
  params: { limit?: number; offset?: number; status?: string } = {}
): Promise<CommunityPostListResponse> {
  const searchParams = new URLSearchParams();
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset) {
    searchParams.set("offset", String(params.offset));
  }

  const query = searchParams.toString();
  return protectedApiFetch<CommunityPostListResponse>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/posts${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function createCommunityPost(
  accessToken: string,
  communityId: string,
  payload: CommunityPostCreatePayload
): Promise<CommunityPost> {
  return protectedApiFetch<CommunityPost>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/posts`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function removeCommunityPost(
  accessToken: string,
  communityId: string,
  postId: string
): Promise<CommunityPost> {
  return protectedApiFetch<CommunityPost>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/remove`,
    {
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function transferCommunityOwnership(
  accessToken: string,
  communityId: string,
  payload: CommunityOwnershipTransferPayload
): Promise<Community> {
  return protectedApiFetch<Community>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/ownership-transfer`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function approveCommunityMember(
  accessToken: string,
  communityId: string,
  membershipId: string
): Promise<CommunityMember> {
  return protectedApiFetch<CommunityMember>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/members/${encodeURIComponent(membershipId)}/approve`,
    {
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function rejectCommunityMember(
  accessToken: string,
  communityId: string,
  membershipId: string
): Promise<CommunityMember> {
  return protectedApiFetch<CommunityMember>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/members/${encodeURIComponent(membershipId)}/reject`,
    {
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function updateCommunityMemberRole(
  accessToken: string,
  communityId: string,
  membershipId: string,
  role: "MANAGER" | "MEMBER"
): Promise<CommunityMember> {
  return protectedApiFetch<CommunityMember>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/members/${encodeURIComponent(membershipId)}`,
    {
      body: JSON.stringify({ role }),
      headers: authHeaders(accessToken),
      method: "PATCH"
    }
  );
}

export function removeCommunityMember(
  accessToken: string,
  communityId: string,
  membershipId: string
): Promise<CommunityMember> {
  return protectedApiFetch<CommunityMember>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/members/${encodeURIComponent(membershipId)}/remove`,
    {
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function joinCommunity(accessToken: string, communityId: string): Promise<Community> {
  return protectedApiFetch<Community>(`/api/v1/communities/${communityId}/join`, {
    headers: authHeaders(accessToken),
    method: "POST"
  });
}

export function leaveCommunity(accessToken: string, communityId: string): Promise<Community> {
  return protectedApiFetch<Community>(`/api/v1/communities/${communityId}/leave`, {
    headers: authHeaders(accessToken),
    method: "POST"
  });
}
