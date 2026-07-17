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
  recovery_codes_remaining: number;
};

export type TwoFactorSetup = {
  secret: string;
  otpauth_url: string;
  enabled: boolean;
};

export type TwoFactorEnableResponse = {
  user: AuthUser;
  recovery_codes: string[];
  recovery_codes_remaining: number;
};

export type TwoFactorRecoveryCodesResponse = {
  recovery_codes: string[];
  recovery_codes_remaining: number;
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

export type NotificationItem = {
  id: string;
  user_id: string;
  actor_user_id: string | null;
  actor_display_name: string | null;
  event_type: string;
  title: string;
  body: string | null;
  target_url: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  email_digest_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationListResponse = {
  notifications: NotificationItem[];
  total: number;
  unread_count: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type NotificationReadAllResponse = {
  marked_read: number;
  unread_count: number;
};

export type NotificationStreamSnapshot = {
  generated_at: string;
  latest_notification: NotificationItem | null;
  unread_count: number;
};

export type NotificationPreference = {
  id: string;
  user_id: string;
  in_app_enabled: boolean;
  email_digest_frequency: "DAILY" | "NONE" | "WEEKLY";
  muted_event_types: string[];
  created_at: string;
  updated_at: string;
};

export type NotificationPreferenceUpdate = {
  email_digest_frequency?: "DAILY" | "NONE" | "WEEKLY";
  in_app_enabled?: boolean;
  muted_event_types?: string[];
};

export type NotificationDigestFrequency = "DAILY" | "WEEKLY";

export type NotificationDigestRunPayload = {
  dry_run?: boolean;
  frequency?: NotificationDigestFrequency;
  include_read?: boolean;
  limit?: number;
  max_items_per_email?: number;
};

export type NotificationDigestDelivery = {
  user_id: string;
  email: string;
  frequency: NotificationDigestFrequency;
  notification_count: number;
  delivered: boolean;
  error: string | null;
};

export type NotificationDigestRunResponse = {
  frequency: NotificationDigestFrequency;
  dry_run: boolean;
  generated_at: string;
  candidate_user_count: number;
  sent_count: number;
  skipped_count: number;
  notification_count: number;
  deliveries: NotificationDigestDelivery[];
};

export type ConversationParticipant = {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  role: string;
  last_read_at: string | null;
  created_at: string;
};

export type DirectMessage = {
  id: string;
  conversation_id: string;
  sender_user_id: string | null;
  sender_display_name: string;
  body: string;
  status: string;
  removed_by_user_id: string | null;
  removed_at: string | null;
  moderation_note: string | null;
  moderation_severity: string | null;
  escalation_status: string | null;
  escalated_by_user_id: string | null;
  escalated_at: string | null;
  sent_at: string;
  created_at: string;
  updated_at: string;
};

export type DirectMessageReport = {
  id: string;
  message_id: string;
  conversation_id: string;
  reporter_user_id: string | null;
  reporter_display_name: string;
  reason: string;
  note: string | null;
  status: string;
  moderator_note: string | null;
  severity: string | null;
  escalation_status: string | null;
  escalated_by_user_id: string | null;
  escalated_at: string | null;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DirectMessageReportQueueItem = DirectMessageReport & {
  sender_display_name: string;
  sender_user_id: string | null;
  message_body: string;
  message_status: string;
  message_removed_at: string | null;
  message_sent_at: string;
};

export type DirectMessageReportQueueResponse = {
  reports: DirectMessageReportQueueItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type RemovedDirectMessageQueueItem = DirectMessage & {
  removed_by_display_name: string;
  report_count: number;
};

export type RemovedDirectMessageQueueResponse = {
  messages: RemovedDirectMessageQueueItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type Conversation = {
  id: string;
  conversation_type: string;
  participants: ConversationParticipant[];
  last_message: DirectMessage | null;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationListResponse = {
  conversations: Conversation[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type MessageListResponse = {
  messages: DirectMessage[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type ConversationCreatePayload = {
  initial_message?: string | null;
  participant_user_id: string;
};

export type IntroductionRequest = {
  id: string;
  requester_user_id: string;
  requester_display_name: string;
  requester_email: string;
  recipient_user_id: string;
  recipient_display_name: string;
  recipient_email: string;
  conversation_id: string | null;
  note: string | null;
  status: string;
  responded_by_user_id: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type IntroductionRequestListResponse = {
  incoming: IntroductionRequest[];
  outgoing: IntroductionRequest[];
  actionable_count: number;
};

export type IntroductionRequestCreatePayload = {
  recipient_user_id: string;
  note?: string | null;
};

export type IntroductionRequestReviewPayload = {
  note?: string | null;
};

export type MessageCreatePayload = {
  body: string;
};

export type DirectMessageReportCreatePayload = {
  note?: string | null;
  reason?: "HARASSMENT" | "IMPERSONATION" | "OTHER" | "SPAM" | "UNSAFE_CONTENT";
};

export type MessageReadResponse = {
  conversation_id: string;
  last_read_at: string;
  unread_count: number;
};

export type UserBlock = {
  id: string;
  blocker_user_id: string;
  blocked_user_id: string;
  blocked_display_name: string;
  reason: string | null;
  created_at: string;
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

export type OnboardingWorkflowState = {
  id: string;
  user_id: string;
  current_step_key: string | null;
  completed_step_keys: string[];
  last_viewed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OnboardingWorkflowStateUpdate = {
  current_step_key?: string | null;
  completed_step_keys?: string[];
  mark_complete?: boolean | null;
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

export type MwfAlumniProfile = {
  source_id: number;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  country_slug: string | null;
  country_label: string | null;
  bio: string | null;
  field_of_study: string | null;
  expertise_labels: string[];
  leadership_institute: string | null;
  us_state: string | null;
  program_years: string[];
  image_url: string | null;
  source_detail_url: string | null;
  last_seen_at: string;
};

export type MwfAlumniSyncRun = {
  id: string;
  source_url: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  fetched_count: number;
  imported_count: number;
  updated_count: number;
  deactivated_count: number;
  error_message: string | null;
};

export type MwfAlumniSyncStatus = {
  active_profile_count: number;
  cache_stale: boolean;
  cache_empty: boolean;
  sync_in_progress: boolean;
  cache_ttl_hours: number;
  last_synced_at: string | null;
  latest_run: MwfAlumniSyncRun | null;
};

export type MwfAlumniSearchResponse = {
  has_more: boolean;
  limit: number;
  offset: number;
  profiles: MwfAlumniProfile[];
  sync: MwfAlumniSyncStatus;
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
  moderation_note: string | null;
  moderation_severity: string | null;
  escalation_status: string | null;
  escalated_by_user_id: string | null;
  escalated_at: string | null;
  comment_count: number;
  reaction_count: number;
  viewer_reacted: boolean;
  open_report_count: number;
  media: CommunityPostMedia[];
  created_at: string;
  updated_at: string;
};

export type CommunityPostMedia = {
  id: string;
  post_id: string;
  uploaded_by_user_id: string | null;
  file_name: string;
  content_type: string;
  file_size_bytes: number;
  alt_text: string | null;
  status: string;
  removed_by_user_id: string | null;
  removed_at: string | null;
  download_url: string;
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

export type CommunityPostComment = {
  id: string;
  post_id: string;
  author_user_id: string | null;
  author_display_name: string;
  body: string;
  status: string;
  removed_by_user_id: string | null;
  removed_at: string | null;
  moderation_note: string | null;
  moderation_severity: string | null;
  escalation_status: string | null;
  escalated_by_user_id: string | null;
  escalated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CommunityPostCommentListResponse = {
  comments: CommunityPostComment[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type CommunityPostReactionResponse = {
  post_id: string;
  reaction_type: string;
  reacted: boolean;
  reaction_count: number;
};

export type CommunityPostReport = {
  id: string;
  post_id: string;
  reporter_user_id: string | null;
  reporter_display_name: string;
  reason: string;
  note: string | null;
  status: string;
  moderator_note: string | null;
  severity: string | null;
  escalation_status: string | null;
  escalated_by_user_id: string | null;
  escalated_at: string | null;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CommunityPostReportListResponse = {
  reports: CommunityPostReport[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type CommunityPostReportQueueItem = CommunityPostReport & {
  post_author_display_name: string;
  post_body: string;
  post_status: string;
  post_removed_at: string | null;
  post_created_at: string;
};

export type CommunityPostReportQueueResponse = {
  reports: CommunityPostReportQueueItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type CommunityAdminPostReportQueueItem = CommunityPostReportQueueItem & {
  community_id: string;
  community_name: string;
  community_slug: string;
};

export type CommunityAdminPostReportQueueResponse = {
  reports: CommunityAdminPostReportQueueItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type CommunityRemovedPostQueueItem = CommunityPost & {
  removed_by_display_name: string;
};

export type CommunityRemovedPostQueueResponse = {
  posts: CommunityRemovedPostQueueItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type CommunityAdminRemovedPostQueueItem = CommunityRemovedPostQueueItem & {
  community_name: string;
  community_slug: string;
};

export type CommunityAdminRemovedPostQueueResponse = {
  posts: CommunityAdminRemovedPostQueueItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type CommunityRemovedCommentQueueItem = CommunityPostComment & {
  removed_by_display_name: string;
  post_author_display_name: string;
  post_body: string;
  post_status: string;
  post_created_at: string;
};

export type CommunityRemovedCommentQueueResponse = {
  comments: CommunityRemovedCommentQueueItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type CommunityAdminRemovedCommentQueueItem = CommunityRemovedCommentQueueItem & {
  community_id: string;
  community_name: string;
  community_slug: string;
};

export type CommunityAdminRemovedCommentQueueResponse = {
  comments: CommunityAdminRemovedCommentQueueItem[];
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

export type CommunityPostCommentCreatePayload = {
  body: string;
};

export type CommunityPostReactionPayload = {
  reaction_type?: "LIKE";
};

export type CommunityPostReportCreatePayload = {
  note?: string | null;
  reason?: "HARASSMENT" | "MISINFORMATION" | "OTHER" | "SPAM" | "UNRELATED";
};

export type CommunityModerationReviewUpdatePayload = {
  escalation_status?: "ESCALATED" | "NONE" | null;
  moderator_note?: string | null;
  severity?: "CRITICAL" | "HIGH" | "LOW" | "MEDIUM" | null;
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

export function confirmTwoFactor(
  accessToken: string,
  code: string
): Promise<TwoFactorEnableResponse> {
  return protectedApiFetch<TwoFactorEnableResponse>("/api/v1/auth/me/2fa/confirm", {
    body: JSON.stringify({ code }),
    headers: authHeaders(accessToken),
    method: "POST"
  });
}

export function disableTwoFactor(
  accessToken: string,
  payload: { code?: string; password: string; recovery_code?: string }
): Promise<AuthUser> {
  return protectedApiFetch<AuthUser>("/api/v1/auth/me/2fa/disable", {
    body: JSON.stringify(payload),
    headers: authHeaders(accessToken),
    method: "POST"
  });
}

export function regenerateTwoFactorRecoveryCodes(
  accessToken: string,
  payload: { code?: string; password: string; recovery_code?: string }
): Promise<TwoFactorRecoveryCodesResponse> {
  return protectedApiFetch<TwoFactorRecoveryCodesResponse>(
    "/api/v1/auth/me/2fa/recovery-codes/regenerate",
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
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

export function listNotifications(
  accessToken: string,
  params: { limit?: number; offset?: number; status?: "ALL" | "READ" | "UNREAD" } = {}
): Promise<NotificationListResponse> {
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
  return protectedApiFetch<NotificationListResponse>(
    `/api/v1/notifications${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function markNotificationRead(
  accessToken: string,
  notificationId: string
): Promise<NotificationItem> {
  return protectedApiFetch<NotificationItem>(
    `/api/v1/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function markAllNotificationsRead(
  accessToken: string
): Promise<NotificationReadAllResponse> {
  return protectedApiFetch<NotificationReadAllResponse>("/api/v1/notifications/read-all", {
    headers: authHeaders(accessToken),
    method: "POST"
  });
}

export function getNotificationPreferences(accessToken: string): Promise<NotificationPreference> {
  return protectedApiFetch<NotificationPreference>("/api/v1/notifications/preferences", {
    headers: authHeaders(accessToken)
  });
}

export function updateNotificationPreferences(
  accessToken: string,
  payload: NotificationPreferenceUpdate
): Promise<NotificationPreference> {
  return protectedApiFetch<NotificationPreference>("/api/v1/notifications/preferences", {
    body: JSON.stringify(payload),
    headers: authHeaders(accessToken),
    method: "PATCH"
  });
}

export function runNotificationEmailDigest(
  accessToken: string,
  payload: NotificationDigestRunPayload
): Promise<NotificationDigestRunResponse> {
  return protectedApiFetch<NotificationDigestRunResponse>(
    "/api/v1/notifications/admin/email-digests/run",
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function listConversations(
  accessToken: string,
  params: { limit?: number; offset?: number } = {}
): Promise<ConversationListResponse> {
  const searchParams = new URLSearchParams();
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset) {
    searchParams.set("offset", String(params.offset));
  }

  const query = searchParams.toString();
  return protectedApiFetch<ConversationListResponse>(
    `/api/v1/messages/conversations${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function createDirectConversation(
  accessToken: string,
  payload: ConversationCreatePayload
): Promise<Conversation> {
  return protectedApiFetch<Conversation>("/api/v1/messages/conversations", {
    body: JSON.stringify(payload),
    headers: authHeaders(accessToken),
    method: "POST"
  });
}

export function listIntroductionRequests(
  accessToken: string
): Promise<IntroductionRequestListResponse> {
  return protectedApiFetch<IntroductionRequestListResponse>("/api/v1/messages/introduction-requests", {
    headers: authHeaders(accessToken)
  });
}

export function createIntroductionRequest(
  accessToken: string,
  payload: IntroductionRequestCreatePayload
): Promise<IntroductionRequest> {
  return protectedApiFetch<IntroductionRequest>("/api/v1/messages/introduction-requests", {
    body: JSON.stringify(payload),
    headers: authHeaders(accessToken),
    method: "POST"
  });
}

export function acceptIntroductionRequest(
  accessToken: string,
  introductionRequestId: string,
  payload: IntroductionRequestReviewPayload = {}
): Promise<IntroductionRequest> {
  return protectedApiFetch<IntroductionRequest>(
    `/api/v1/messages/introduction-requests/${encodeURIComponent(introductionRequestId)}/accept`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function declineIntroductionRequest(
  accessToken: string,
  introductionRequestId: string,
  payload: IntroductionRequestReviewPayload = {}
): Promise<IntroductionRequest> {
  return protectedApiFetch<IntroductionRequest>(
    `/api/v1/messages/introduction-requests/${encodeURIComponent(introductionRequestId)}/decline`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function cancelIntroductionRequest(
  accessToken: string,
  introductionRequestId: string,
  payload: IntroductionRequestReviewPayload = {}
): Promise<IntroductionRequest> {
  return protectedApiFetch<IntroductionRequest>(
    `/api/v1/messages/introduction-requests/${encodeURIComponent(introductionRequestId)}/cancel`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function listConversationMessages(
  accessToken: string,
  conversationId: string,
  params: { limit?: number; offset?: number } = {}
): Promise<MessageListResponse> {
  const searchParams = new URLSearchParams();
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset) {
    searchParams.set("offset", String(params.offset));
  }

  const query = searchParams.toString();
  return protectedApiFetch<MessageListResponse>(
    `/api/v1/messages/conversations/${encodeURIComponent(conversationId)}/messages${
      query ? `?${query}` : ""
    }`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function sendDirectMessage(
  accessToken: string,
  conversationId: string,
  payload: MessageCreatePayload
): Promise<DirectMessage> {
  return protectedApiFetch<DirectMessage>(
    `/api/v1/messages/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function createDirectMessageReport(
  accessToken: string,
  conversationId: string,
  messageId: string,
  payload: DirectMessageReportCreatePayload
): Promise<DirectMessageReport> {
  return protectedApiFetch<DirectMessageReport>(
    `/api/v1/messages/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/reports`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function markConversationRead(
  accessToken: string,
  conversationId: string
): Promise<MessageReadResponse> {
  return protectedApiFetch<MessageReadResponse>(
    `/api/v1/messages/conversations/${encodeURIComponent(conversationId)}/read`,
    {
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function listAdminDirectMessageReports(
  accessToken: string,
  params: {
    escalationStatus?: string;
    limit?: number;
    offset?: number;
    q?: string;
    reason?: string;
    severity?: string;
    status?: string;
  } = {}
): Promise<DirectMessageReportQueueResponse> {
  const searchParams = new URLSearchParams();
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.reason) {
    searchParams.set("reason", params.reason);
  }
  if (params.severity) {
    searchParams.set("severity", params.severity);
  }
  if (params.escalationStatus) {
    searchParams.set("escalation_status", params.escalationStatus);
  }
  if (params.q) {
    searchParams.set("q", params.q);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset) {
    searchParams.set("offset", String(params.offset));
  }

  const query = searchParams.toString();
  return protectedApiFetch<DirectMessageReportQueueResponse>(
    `/api/v1/messages/admin/moderation/reports${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function listAdminRemovedDirectMessages(
  accessToken: string,
  params: {
    escalationStatus?: string;
    limit?: number;
    offset?: number;
    q?: string;
    severity?: string;
  } = {}
): Promise<RemovedDirectMessageQueueResponse> {
  const searchParams = new URLSearchParams();
  if (params.severity) {
    searchParams.set("severity", params.severity);
  }
  if (params.escalationStatus) {
    searchParams.set("escalation_status", params.escalationStatus);
  }
  if (params.q) {
    searchParams.set("q", params.q);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset) {
    searchParams.set("offset", String(params.offset));
  }

  const query = searchParams.toString();
  return protectedApiFetch<RemovedDirectMessageQueueResponse>(
    `/api/v1/messages/admin/moderation/removed-messages${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function resolveDirectMessageReport(
  accessToken: string,
  reportId: string
): Promise<DirectMessageReport> {
  return protectedApiFetch<DirectMessageReport>(
    `/api/v1/messages/admin/moderation/reports/${encodeURIComponent(reportId)}/resolve`,
    {
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function updateDirectMessageReportReview(
  accessToken: string,
  reportId: string,
  payload: CommunityModerationReviewUpdatePayload
): Promise<DirectMessageReport> {
  return protectedApiFetch<DirectMessageReport>(
    `/api/v1/messages/admin/moderation/reports/${encodeURIComponent(reportId)}/review`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "PATCH"
    }
  );
}

export function updateDirectMessageModerationReview(
  accessToken: string,
  messageId: string,
  payload: CommunityModerationReviewUpdatePayload
): Promise<DirectMessage> {
  return protectedApiFetch<DirectMessage>(
    `/api/v1/messages/admin/moderation/messages/${encodeURIComponent(messageId)}/review`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "PATCH"
    }
  );
}

export function removeDirectMessage(
  accessToken: string,
  messageId: string,
  payload: CommunityModerationReviewUpdatePayload = {}
): Promise<DirectMessage> {
  return protectedApiFetch<DirectMessage>(
    `/api/v1/messages/admin/moderation/messages/${encodeURIComponent(messageId)}/remove`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function restoreDirectMessage(
  accessToken: string,
  messageId: string
): Promise<DirectMessage> {
  return protectedApiFetch<DirectMessage>(
    `/api/v1/messages/admin/moderation/messages/${encodeURIComponent(messageId)}/restore`,
    {
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function listUserBlocks(accessToken: string): Promise<UserBlock[]> {
  return protectedApiFetch<UserBlock[]>("/api/v1/messages/blocks", {
    headers: authHeaders(accessToken)
  });
}

export function blockUser(
  accessToken: string,
  payload: { blocked_user_id: string; reason?: string | null }
): Promise<UserBlock> {
  return protectedApiFetch<UserBlock>("/api/v1/messages/blocks", {
    body: JSON.stringify(payload),
    headers: authHeaders(accessToken),
    method: "POST"
  });
}

export function unblockUser(accessToken: string, blockedUserId: string): Promise<void> {
  return protectedApiFetch<void>(
    `/api/v1/messages/blocks/${encodeURIComponent(blockedUserId)}`,
    {
      headers: authHeaders(accessToken),
      method: "DELETE"
    }
  );
}

export async function streamNotificationSnapshots(
  accessToken: string,
  options: {
    onSnapshot: (snapshot: NotificationStreamSnapshot) => void;
    pollSeconds?: number;
    signal?: AbortSignal;
  }
): Promise<void> {
  const searchParams = new URLSearchParams();
  searchParams.set("poll_seconds", String(options.pollSeconds ?? 8));
  const response = await fetch(`/api/backend/api/v1/notifications/stream?${searchParams}`, {
    credentials: "same-origin",
    headers: authHeaders(accessToken),
    signal: options.signal
  });

  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  if (!response.body) {
    throw new ApiError("Notification stream is unavailable", response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    let eventBoundary = buffer.indexOf("\n\n");
    while (eventBoundary >= 0) {
      const eventText = buffer.slice(0, eventBoundary);
      buffer = buffer.slice(eventBoundary + 2);
      const data = parseSseData(eventText);
      if (data) {
        options.onSnapshot(JSON.parse(data) as NotificationStreamSnapshot);
      }
      eventBoundary = buffer.indexOf("\n\n");
    }
  }
}

function parseSseData(eventText: string): string | null {
  const dataLines = eventText
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, ""));

  return dataLines.length > 0 ? dataLines.join("\n") : null;
}

export function getMyAlumniProfile(accessToken: string): Promise<AlumniProfile> {
  return protectedApiFetch<AlumniProfile>("/api/v1/alumni/me/profile", {
    headers: authHeaders(accessToken)
  });
}

export function getMyOnboardingWorkflowState(
  accessToken: string
): Promise<OnboardingWorkflowState> {
  return protectedApiFetch<OnboardingWorkflowState>("/api/v1/alumni/me/onboarding-state", {
    headers: authHeaders(accessToken)
  });
}

export function updateMyOnboardingWorkflowState(
  accessToken: string,
  payload: OnboardingWorkflowStateUpdate
): Promise<OnboardingWorkflowState> {
  return protectedApiFetch<OnboardingWorkflowState>("/api/v1/alumni/me/onboarding-state", {
    body: JSON.stringify(payload),
    headers: authHeaders(accessToken),
    method: "PATCH"
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

export function searchMwfAlumniDirectory(
  accessToken: string,
  params: {
    country?: string;
    expertise?: string;
    fieldOfStudy?: string;
    leadershipInstitute?: string;
    limit?: number;
    offset?: number;
    q?: string;
    sort?: string;
    year?: string;
  } = {}
): Promise<MwfAlumniSearchResponse> {
  const searchParams = new URLSearchParams();
  if (params.q) {
    searchParams.set("q", params.q);
  }
  if (params.country) {
    searchParams.set("country", params.country);
  }
  if (params.year) {
    searchParams.set("year", params.year);
  }
  if (params.fieldOfStudy) {
    searchParams.set("field_of_study", params.fieldOfStudy);
  }
  if (params.expertise) {
    searchParams.set("expertise", params.expertise);
  }
  if (params.leadershipInstitute) {
    searchParams.set("leadership_institute", params.leadershipInstitute);
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
  return protectedApiFetch<MwfAlumniSearchResponse>(
    `/api/v1/alumni/mwf/search${query ? `?${query}` : ""}`,
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

export function uploadCommunityPostMedia(
  accessToken: string,
  communityId: string,
  postId: string,
  payload: { altText?: string | null; file: File }
): Promise<CommunityPostMedia> {
  const formData = new FormData();
  formData.set("file", payload.file);
  if (payload.altText) {
    formData.set("alt_text", payload.altText);
  }

  return protectedApiFetch<CommunityPostMedia>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/media`,
    {
      body: formData,
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export async function downloadCommunityPostMedia(
  accessToken: string,
  media: CommunityPostMedia
): Promise<Blob> {
  const response = await fetch(`/api/backend${media.download_url}`, {
    credentials: "same-origin",
    headers: authHeaders(accessToken)
  });

  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }

  return response.blob();
}

export function removeCommunityPostMedia(
  accessToken: string,
  communityId: string,
  postId: string,
  mediaId: string
): Promise<CommunityPostMedia> {
  return protectedApiFetch<CommunityPostMedia>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/media/${encodeURIComponent(mediaId)}/remove`,
    {
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function restoreCommunityPostMedia(
  accessToken: string,
  communityId: string,
  postId: string,
  mediaId: string
): Promise<CommunityPostMedia> {
  return protectedApiFetch<CommunityPostMedia>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/media/${encodeURIComponent(mediaId)}/restore`,
    {
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

export function restoreCommunityPost(
  accessToken: string,
  communityId: string,
  postId: string
): Promise<CommunityPost> {
  return protectedApiFetch<CommunityPost>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/restore`,
    {
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function listCommunityPostComments(
  accessToken: string,
  communityId: string,
  postId: string,
  params: { limit?: number; offset?: number; status?: string } = {}
): Promise<CommunityPostCommentListResponse> {
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
  return protectedApiFetch<CommunityPostCommentListResponse>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/comments${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function createCommunityPostComment(
  accessToken: string,
  communityId: string,
  postId: string,
  payload: CommunityPostCommentCreatePayload
): Promise<CommunityPostComment> {
  return protectedApiFetch<CommunityPostComment>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/comments`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function removeCommunityPostComment(
  accessToken: string,
  communityId: string,
  postId: string,
  commentId: string
): Promise<CommunityPostComment> {
  return protectedApiFetch<CommunityPostComment>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/remove`,
    {
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function restoreCommunityPostComment(
  accessToken: string,
  communityId: string,
  postId: string,
  commentId: string
): Promise<CommunityPostComment> {
  return protectedApiFetch<CommunityPostComment>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/restore`,
    {
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function toggleCommunityPostReaction(
  accessToken: string,
  communityId: string,
  postId: string,
  payload: CommunityPostReactionPayload = { reaction_type: "LIKE" }
): Promise<CommunityPostReactionResponse> {
  return protectedApiFetch<CommunityPostReactionResponse>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/reaction`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function createCommunityPostReport(
  accessToken: string,
  communityId: string,
  postId: string,
  payload: CommunityPostReportCreatePayload
): Promise<CommunityPostReport> {
  return protectedApiFetch<CommunityPostReport>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/reports`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function listCommunityPostReports(
  accessToken: string,
  communityId: string,
  postId: string,
  params: { limit?: number; offset?: number; status?: string } = {}
): Promise<CommunityPostReportListResponse> {
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
  return protectedApiFetch<CommunityPostReportListResponse>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/reports${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function listCommunityPostReportQueue(
  accessToken: string,
  communityId: string,
  params: { escalationStatus?: string; limit?: number; offset?: number; severity?: string; status?: string } = {}
): Promise<CommunityPostReportQueueResponse> {
  const searchParams = new URLSearchParams();
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.severity) {
    searchParams.set("severity", params.severity);
  }
  if (params.escalationStatus) {
    searchParams.set("escalation_status", params.escalationStatus);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset) {
    searchParams.set("offset", String(params.offset));
  }

  const query = searchParams.toString();
  return protectedApiFetch<CommunityPostReportQueueResponse>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/post-reports${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function listAdminCommunityPostReportQueue(
  accessToken: string,
  params: {
    communityId?: string;
    escalationStatus?: string;
    limit?: number;
    offset?: number;
    q?: string;
    reason?: string;
    severity?: string;
    status?: string;
  } = {}
): Promise<CommunityAdminPostReportQueueResponse> {
  const searchParams = new URLSearchParams();
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.communityId) {
    searchParams.set("community_id", params.communityId);
  }
  if (params.reason) {
    searchParams.set("reason", params.reason);
  }
  if (params.severity) {
    searchParams.set("severity", params.severity);
  }
  if (params.escalationStatus) {
    searchParams.set("escalation_status", params.escalationStatus);
  }
  if (params.q) {
    searchParams.set("q", params.q);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset) {
    searchParams.set("offset", String(params.offset));
  }

  const query = searchParams.toString();
  return protectedApiFetch<CommunityAdminPostReportQueueResponse>(
    `/api/v1/communities/admin/moderation/post-reports${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function listCommunityRemovedPosts(
  accessToken: string,
  communityId: string,
  params: { escalationStatus?: string; limit?: number; offset?: number; severity?: string } = {}
): Promise<CommunityRemovedPostQueueResponse> {
  const searchParams = new URLSearchParams();
  if (params.severity) {
    searchParams.set("severity", params.severity);
  }
  if (params.escalationStatus) {
    searchParams.set("escalation_status", params.escalationStatus);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset) {
    searchParams.set("offset", String(params.offset));
  }

  const query = searchParams.toString();
  return protectedApiFetch<CommunityRemovedPostQueueResponse>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/removed-posts${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function listAdminCommunityRemovedPosts(
  accessToken: string,
  params: {
    communityId?: string;
    escalationStatus?: string;
    limit?: number;
    offset?: number;
    q?: string;
    severity?: string;
  } = {}
): Promise<CommunityAdminRemovedPostQueueResponse> {
  const searchParams = new URLSearchParams();
  if (params.communityId) {
    searchParams.set("community_id", params.communityId);
  }
  if (params.q) {
    searchParams.set("q", params.q);
  }
  if (params.severity) {
    searchParams.set("severity", params.severity);
  }
  if (params.escalationStatus) {
    searchParams.set("escalation_status", params.escalationStatus);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset) {
    searchParams.set("offset", String(params.offset));
  }

  const query = searchParams.toString();
  return protectedApiFetch<CommunityAdminRemovedPostQueueResponse>(
    `/api/v1/communities/admin/moderation/removed-posts${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function listCommunityRemovedComments(
  accessToken: string,
  communityId: string,
  params: { escalationStatus?: string; limit?: number; offset?: number; severity?: string } = {}
): Promise<CommunityRemovedCommentQueueResponse> {
  const searchParams = new URLSearchParams();
  if (params.severity) {
    searchParams.set("severity", params.severity);
  }
  if (params.escalationStatus) {
    searchParams.set("escalation_status", params.escalationStatus);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset) {
    searchParams.set("offset", String(params.offset));
  }

  const query = searchParams.toString();
  return protectedApiFetch<CommunityRemovedCommentQueueResponse>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/removed-comments${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function listAdminCommunityRemovedComments(
  accessToken: string,
  params: {
    communityId?: string;
    escalationStatus?: string;
    limit?: number;
    offset?: number;
    q?: string;
    severity?: string;
  } = {}
): Promise<CommunityAdminRemovedCommentQueueResponse> {
  const searchParams = new URLSearchParams();
  if (params.communityId) {
    searchParams.set("community_id", params.communityId);
  }
  if (params.q) {
    searchParams.set("q", params.q);
  }
  if (params.severity) {
    searchParams.set("severity", params.severity);
  }
  if (params.escalationStatus) {
    searchParams.set("escalation_status", params.escalationStatus);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset) {
    searchParams.set("offset", String(params.offset));
  }

  const query = searchParams.toString();
  return protectedApiFetch<CommunityAdminRemovedCommentQueueResponse>(
    `/api/v1/communities/admin/moderation/removed-comments${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken)
    }
  );
}

export function resolveCommunityPostReport(
  accessToken: string,
  communityId: string,
  postId: string,
  reportId: string
): Promise<CommunityPostReport> {
  return protectedApiFetch<CommunityPostReport>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/reports/${encodeURIComponent(reportId)}/resolve`,
    {
      headers: authHeaders(accessToken),
      method: "POST"
    }
  );
}

export function updateCommunityPostReportReview(
  accessToken: string,
  communityId: string,
  postId: string,
  reportId: string,
  payload: CommunityModerationReviewUpdatePayload
): Promise<CommunityPostReport> {
  return protectedApiFetch<CommunityPostReport>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/reports/${encodeURIComponent(reportId)}/review`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "PATCH"
    }
  );
}

export function updateCommunityPostModerationReview(
  accessToken: string,
  communityId: string,
  postId: string,
  payload: CommunityModerationReviewUpdatePayload
): Promise<CommunityPost> {
  return protectedApiFetch<CommunityPost>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/moderation-review`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "PATCH"
    }
  );
}

export function updateCommunityPostCommentModerationReview(
  accessToken: string,
  communityId: string,
  postId: string,
  commentId: string,
  payload: CommunityModerationReviewUpdatePayload
): Promise<CommunityPostComment> {
  return protectedApiFetch<CommunityPostComment>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/moderation-review`,
    {
      body: JSON.stringify(payload),
      headers: authHeaders(accessToken),
      method: "PATCH"
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
