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

export type AdminVerificationRequest = {
  affiliation_country?: string | null;
  affiliation_notes?: string | null;
  affiliation_program?: string | null;
  created_at: string;
  display_name?: string | null;
  email?: string | null;
  evidence?: Array<{ id: string; label?: string | null; file_name?: string | null }>;
  evidence_count?: number;
  id: string;
  profile_snapshot?: {
    city?: string | null;
    completion_percentage?: number;
    country?: string | null;
    headline?: string | null;
    organization?: string | null;
    program_affiliations?: Array<{
      cohort_year?: number | null;
      country?: string | null;
      program_name: string;
      status?: string;
    }>;
    sector?: string | null;
  };
  request_type?: string;
  requested_at?: string | null;
  reviewer_note?: string | null;
  status: string;
  submitted_note?: string | null;
  updated_at?: string;
  user_display_name?: string | null;
  user_email?: string | null;
  user_id?: string;
};

export type AdminVerificationRequestListResponse = {
  requests: AdminVerificationRequest[];
};

export type AdminVerificationAction = "approve" | "reject" | "request-info";

export type CommunityPostReport = {
  community_id: string;
  community_name?: string | null;
  community_slug?: string | null;
  created_at: string;
  escalation_status?: string | null;
  id: string;
  post_author_display_name?: string | null;
  post_body?: string | null;
  post_id: string;
  reason: string;
  reporter_display_name?: string | null;
  severity?: string | null;
  status: string;
};

export type CommunityRemovedPost = {
  author_display_name?: string | null;
  body?: string | null;
  community_id: string;
  community_name?: string | null;
  community_slug?: string | null;
  escalation_status?: string | null;
  id: string;
  moderation_severity?: string | null;
  removed_at?: string | null;
  removed_by_display_name?: string | null;
};

export type CommunityRemovedComment = {
  author_display_name?: string | null;
  body?: string | null;
  community_id: string;
  community_name?: string | null;
  community_slug?: string | null;
  escalation_status?: string | null;
  id: string;
  moderation_severity?: string | null;
  post_body?: string | null;
  post_id: string;
  removed_at?: string | null;
  removed_by_display_name?: string | null;
};

export type DirectMessageReport = {
  created_at: string;
  escalation_status?: string | null;
  id: string;
  message_body?: string | null;
  message_id: string;
  message_removed_at?: string | null;
  message_sent_at?: string | null;
  message_status?: string | null;
  reason: string;
  reporter_display_name?: string | null;
  sender_display_name?: string | null;
  sender_user_id?: string | null;
  severity?: string | null;
  status: string;
};

export type RemovedDirectMessage = {
  body?: string | null;
  escalation_status?: string | null;
  id: string;
  moderation_severity?: string | null;
  removed_at?: string | null;
  removed_by_display_name?: string | null;
  report_count?: number;
  sender_display_name?: string | null;
};

export type CommunityPostReportResponse = {
  has_more?: boolean;
  limit?: number;
  offset?: number;
  reports: CommunityPostReport[];
  total: number;
};

export type CommunityRemovedPostResponse = {
  has_more?: boolean;
  limit?: number;
  offset?: number;
  posts: CommunityRemovedPost[];
  total: number;
};

export type CommunityRemovedCommentResponse = {
  comments: CommunityRemovedComment[];
  has_more?: boolean;
  limit?: number;
  offset?: number;
  total: number;
};

export type DirectMessageReportResponse = {
  has_more?: boolean;
  limit?: number;
  offset?: number;
  reports: DirectMessageReport[];
  total: number;
};

export type RemovedDirectMessageResponse = {
  has_more?: boolean;
  limit?: number;
  messages: RemovedDirectMessage[];
  offset?: number;
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

export async function fetchCsrfToken(): Promise<string> {
  const response = await fetchJson<{ csrf_token: string }>("/api/session/csrf");
  return response.csrf_token;
}

export async function mutateJson<T>(
  path: string,
  method: "DELETE" | "PATCH" | "POST",
  body?: unknown
): Promise<T> {
  const csrfToken = await fetchCsrfToken();

  return fetchJson<T>(path, {
    body: typeof body === "undefined" ? undefined : JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken
    },
    method
  });
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

export function fetchAdminVerificationRequests(
  status = "PENDING_REVIEW"
): Promise<AdminVerificationRequestListResponse> {
  return fetchJson<AdminVerificationRequestListResponse>(
    `/api/backend/api/v1/alumni/admin/verification-requests?status=${encodeURIComponent(status)}`
  );
}

export function reviewAdminVerificationRequest(
  requestId: string,
  action: AdminVerificationAction,
  reviewerNote?: string
): Promise<AdminVerificationRequest> {
  return mutateJson<AdminVerificationRequest>(
    `/api/backend/api/v1/alumni/admin/verification-requests/${requestId}/${action}`,
    "POST",
    { reviewer_note: reviewerNote ?? null }
  );
}

export function fetchCommunityPostReports(limit = 8): Promise<CommunityPostReportResponse> {
  return fetchJson<CommunityPostReportResponse>(
    `/api/backend/api/v1/communities/admin/moderation/post-reports?status=OPEN&limit=${limit}`
  );
}

export function fetchCommunityRemovedPosts(limit = 6): Promise<CommunityRemovedPostResponse> {
  return fetchJson<CommunityRemovedPostResponse>(
    `/api/backend/api/v1/communities/admin/moderation/removed-posts?limit=${limit}`
  );
}

export function fetchCommunityRemovedComments(limit = 6): Promise<CommunityRemovedCommentResponse> {
  return fetchJson<CommunityRemovedCommentResponse>(
    `/api/backend/api/v1/communities/admin/moderation/removed-comments?limit=${limit}`
  );
}

export function resolveCommunityPostReport(report: CommunityPostReport): Promise<CommunityPostReport> {
  return mutateJson<CommunityPostReport>(
    `/api/backend/api/v1/communities/${report.community_id}/posts/${report.post_id}/reports/${report.id}/resolve`,
    "POST"
  );
}

export function restoreCommunityPost(post: CommunityRemovedPost): Promise<CommunityRemovedPost> {
  return mutateJson<CommunityRemovedPost>(
    `/api/backend/api/v1/communities/${post.community_id}/posts/${post.id}/restore`,
    "POST"
  );
}

export function restoreCommunityPostComment(
  comment: CommunityRemovedComment
): Promise<CommunityRemovedComment> {
  return mutateJson<CommunityRemovedComment>(
    `/api/backend/api/v1/communities/${comment.community_id}/posts/${comment.post_id}/comments/${comment.id}/restore`,
    "POST"
  );
}

export function fetchDirectMessageReports(limit = 8): Promise<DirectMessageReportResponse> {
  return fetchJson<DirectMessageReportResponse>(
    `/api/backend/api/v1/messages/admin/moderation/reports?status=OPEN&limit=${limit}`
  );
}

export function fetchRemovedDirectMessages(limit = 6): Promise<RemovedDirectMessageResponse> {
  return fetchJson<RemovedDirectMessageResponse>(
    `/api/backend/api/v1/messages/admin/moderation/removed-messages?limit=${limit}`
  );
}

export function resolveDirectMessageReport(reportId: string): Promise<DirectMessageReport> {
  return mutateJson<DirectMessageReport>(
    `/api/backend/api/v1/messages/admin/moderation/reports/${reportId}/resolve`,
    "POST"
  );
}

export function removeDirectMessage(messageId: string): Promise<DirectMessageReport> {
  return mutateJson<DirectMessageReport>(
    `/api/backend/api/v1/messages/admin/moderation/messages/${messageId}/remove`,
    "POST"
  );
}

export function restoreDirectMessage(messageId: string): Promise<RemovedDirectMessage> {
  return mutateJson<RemovedDirectMessage>(
    `/api/backend/api/v1/messages/admin/moderation/messages/${messageId}/restore`,
    "POST"
  );
}
