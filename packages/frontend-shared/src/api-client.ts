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

export type AdminVerificationEvidence = {
  content_type?: string | null;
  created_at?: string;
  file_name?: string | null;
  file_size_bytes?: number | null;
  id: string;
  label?: string | null;
  storage_provider?: string | null;
  uploaded_by_user_id?: string | null;
};

export type AdminVerificationRequest = {
  affiliation_country?: string | null;
  affiliation_notes?: string | null;
  affiliation_program?: string | null;
  created_at: string;
  display_name?: string | null;
  email?: string | null;
  evidence?: AdminVerificationEvidence[];
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

export type ModerationReviewPayload = {
  escalation_status?: string | null;
  moderator_note?: string | null;
  severity?: string | null;
};

export type CommunityPostReport = {
  community_id: string;
  community_name?: string | null;
  community_slug?: string | null;
  created_at: string;
  escalation_status?: string | null;
  id: string;
  moderator_note?: string | null;
  note?: string | null;
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
  moderation_note?: string | null;
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
  moderation_note?: string | null;
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
  moderator_note?: string | null;
  note?: string | null;
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
  moderation_note?: string | null;
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

export type Opportunity = {
  application_url?: string | null;
  country?: string | null;
  created_at: string;
  created_by_display_name?: string | null;
  created_by_user_id?: string | null;
  deadline_at?: string | null;
  description: string;
  id: string;
  location?: string | null;
  opportunity_type: string;
  organization: string;
  published_at?: string | null;
  remote_policy: string;
  reviewed_at?: string | null;
  reviewed_by_display_name?: string | null;
  reviewed_by_user_id?: string | null;
  reviewer_note?: string | null;
  status: string;
  title: string;
  updated_at: string;
};

export type OpportunityListResponse = {
  has_more: boolean;
  limit: number;
  offset: number;
  opportunities: Opportunity[];
  total: number;
};

export type OpportunityPayload = {
  application_url?: string | null;
  country?: string | null;
  deadline_at?: string | null;
  description: string;
  location?: string | null;
  opportunity_type?: string;
  organization: string;
  remote_policy?: string;
  title: string;
};

export type OpportunityFilters = {
  country?: string;
  limit?: number;
  mine?: boolean;
  offset?: number;
  opportunityType?: string;
  q?: string;
  remotePolicy?: string;
  status?: string;
};

export type OpportunityReviewPayload = {
  reviewer_note?: string | null;
};

export type ModerationQueueFilters = {
  escalationStatus?: string;
  limit?: number;
  offset?: number;
  q?: string;
  reason?: string;
  severity?: string;
  status?: string;
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

export function verificationEvidenceDownloadUrl(requestId: string, evidenceId: string): string {
  return `/api/backend/api/v1/alumni/verification-requests/${encodeURIComponent(
    requestId
  )}/evidence/${encodeURIComponent(evidenceId)}/download`;
}

function moderationQueryString(filters: ModerationQueueFilters, defaults: ModerationQueueFilters = {}) {
  const params = new URLSearchParams();
  const merged = { ...defaults, ...filters };

  for (const [key, value] of Object.entries(merged)) {
    if (typeof value === "undefined" || value === null || value === "") {
      continue;
    }

    const queryKey = key === "escalationStatus" ? "escalation_status" : key;
    params.set(queryKey, String(value));
  }

  return params.toString();
}

function opportunityQueryString(filters: OpportunityFilters = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === "undefined" || value === null || value === "") {
      continue;
    }

    const queryKey =
      key === "opportunityType" ? "opportunity_type" : key === "remotePolicy" ? "remote_policy" : key;
    params.set(queryKey, String(value));
  }

  return params.toString();
}

export function fetchOpportunities(
  filters: OpportunityFilters = {}
): Promise<OpportunityListResponse> {
  const query = opportunityQueryString({ limit: 12, offset: 0, ...filters });
  return fetchJson<OpportunityListResponse>(`/api/backend/api/v1/opportunities?${query}`);
}

export function fetchOpportunity(opportunityId: string): Promise<Opportunity> {
  return fetchJson<Opportunity>(
    `/api/backend/api/v1/opportunities/${encodeURIComponent(opportunityId)}`
  );
}

export function createOpportunity(payload: OpportunityPayload): Promise<Opportunity> {
  return mutateJson<Opportunity>("/api/backend/api/v1/opportunities", "POST", payload);
}

export function fetchAdminOpportunityQueue(
  filters: OpportunityFilters = {}
): Promise<OpportunityListResponse> {
  const query = opportunityQueryString({ limit: 12, offset: 0, status: "PENDING_REVIEW", ...filters });
  return fetchJson<OpportunityListResponse>(
    `/api/backend/api/v1/opportunities/admin/review-queue?${query}`
  );
}

export function approveOpportunity(
  opportunityId: string,
  payload: OpportunityReviewPayload = {}
): Promise<Opportunity> {
  return mutateJson<Opportunity>(
    `/api/backend/api/v1/opportunities/admin/${encodeURIComponent(opportunityId)}/approve`,
    "POST",
    payload
  );
}

export function rejectOpportunity(
  opportunityId: string,
  payload: OpportunityReviewPayload = {}
): Promise<Opportunity> {
  return mutateJson<Opportunity>(
    `/api/backend/api/v1/opportunities/admin/${encodeURIComponent(opportunityId)}/reject`,
    "POST",
    payload
  );
}

export function requestOpportunityChanges(
  opportunityId: string,
  payload: OpportunityReviewPayload = {}
): Promise<Opportunity> {
  return mutateJson<Opportunity>(
    `/api/backend/api/v1/opportunities/admin/${encodeURIComponent(opportunityId)}/request-changes`,
    "POST",
    payload
  );
}

export function fetchCommunityPostReports(
  filters: ModerationQueueFilters = {}
): Promise<CommunityPostReportResponse> {
  const query = moderationQueryString(filters, { limit: 8, offset: 0, status: "OPEN" });
  return fetchJson<CommunityPostReportResponse>(
    `/api/backend/api/v1/communities/admin/moderation/post-reports?${query}`
  );
}

export function fetchCommunityRemovedPosts(
  filters: ModerationQueueFilters = {}
): Promise<CommunityRemovedPostResponse> {
  const query = moderationQueryString(filters, { limit: 6, offset: 0 });
  return fetchJson<CommunityRemovedPostResponse>(
    `/api/backend/api/v1/communities/admin/moderation/removed-posts?${query}`
  );
}

export function fetchCommunityRemovedComments(
  filters: ModerationQueueFilters = {}
): Promise<CommunityRemovedCommentResponse> {
  const query = moderationQueryString(filters, { limit: 6, offset: 0 });
  return fetchJson<CommunityRemovedCommentResponse>(
    `/api/backend/api/v1/communities/admin/moderation/removed-comments?${query}`
  );
}

export function resolveCommunityPostReport(report: CommunityPostReport): Promise<CommunityPostReport> {
  return mutateJson<CommunityPostReport>(
    `/api/backend/api/v1/communities/${report.community_id}/posts/${report.post_id}/reports/${report.id}/resolve`,
    "POST"
  );
}

export function updateCommunityPostReportReview(
  report: CommunityPostReport,
  payload: ModerationReviewPayload
): Promise<CommunityPostReport> {
  return mutateJson<CommunityPostReport>(
    `/api/backend/api/v1/communities/${report.community_id}/posts/${report.post_id}/reports/${report.id}/review`,
    "PATCH",
    payload
  );
}

export function updateCommunityPostModerationReview(
  post: CommunityRemovedPost,
  payload: ModerationReviewPayload
): Promise<CommunityRemovedPost> {
  return mutateJson<CommunityRemovedPost>(
    `/api/backend/api/v1/communities/${post.community_id}/posts/${post.id}/moderation-review`,
    "PATCH",
    payload
  );
}

export function updateCommunityPostCommentModerationReview(
  comment: CommunityRemovedComment,
  payload: ModerationReviewPayload
): Promise<CommunityRemovedComment> {
  return mutateJson<CommunityRemovedComment>(
    `/api/backend/api/v1/communities/${comment.community_id}/posts/${comment.post_id}/comments/${comment.id}/moderation-review`,
    "PATCH",
    payload
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

export function fetchDirectMessageReports(
  filters: ModerationQueueFilters = {}
): Promise<DirectMessageReportResponse> {
  const query = moderationQueryString(filters, { limit: 8, offset: 0, status: "OPEN" });
  return fetchJson<DirectMessageReportResponse>(
    `/api/backend/api/v1/messages/admin/moderation/reports?${query}`
  );
}

export function fetchRemovedDirectMessages(
  filters: ModerationQueueFilters = {}
): Promise<RemovedDirectMessageResponse> {
  const query = moderationQueryString(filters, { limit: 6, offset: 0 });
  return fetchJson<RemovedDirectMessageResponse>(
    `/api/backend/api/v1/messages/admin/moderation/removed-messages?${query}`
  );
}

export function resolveDirectMessageReport(reportId: string): Promise<DirectMessageReport> {
  return mutateJson<DirectMessageReport>(
    `/api/backend/api/v1/messages/admin/moderation/reports/${reportId}/resolve`,
    "POST"
  );
}

export function updateDirectMessageReportReview(
  reportId: string,
  payload: ModerationReviewPayload
): Promise<DirectMessageReport> {
  return mutateJson<DirectMessageReport>(
    `/api/backend/api/v1/messages/admin/moderation/reports/${reportId}/review`,
    "PATCH",
    payload
  );
}

export function updateDirectMessageModerationReview(
  messageId: string,
  payload: ModerationReviewPayload
): Promise<RemovedDirectMessage> {
  return mutateJson<RemovedDirectMessage>(
    `/api/backend/api/v1/messages/admin/moderation/messages/${messageId}/review`,
    "PATCH",
    payload
  );
}

export function removeDirectMessage(
  messageId: string,
  payload: ModerationReviewPayload = {}
): Promise<DirectMessageReport> {
  return mutateJson<DirectMessageReport>(
    `/api/backend/api/v1/messages/admin/moderation/messages/${messageId}/remove`,
    "POST",
    payload
  );
}

export function restoreDirectMessage(messageId: string): Promise<RemovedDirectMessage> {
  return mutateJson<RemovedDirectMessage>(
    `/api/backend/api/v1/messages/admin/moderation/messages/${messageId}/restore`,
    "POST"
  );
}
