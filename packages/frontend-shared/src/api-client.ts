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

export type MwfAlumniSyncRun = {
  deactivated_count: number;
  error_message: string | null;
  fetched_count: number;
  finished_at: string | null;
  id: string;
  imported_count: number;
  source_url: string;
  started_at: string;
  status: string;
  updated_count: number;
};

export type MwfAlumniSyncStatus = {
  active_profile_count: number;
  cache_empty: boolean;
  cache_stale: boolean;
  cache_ttl_hours: number;
  last_synced_at: string | null;
  latest_run: MwfAlumniSyncRun | null;
  sync_in_progress: boolean;
  worker_interval_seconds: number;
};

export type MwfAlumniSyncRunListResponse = {
  limit: number;
  runs: MwfAlumniSyncRun[];
  total: number;
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

export type EventItem = {
  attendee_count: number;
  capacity?: number | null;
  city?: string | null;
  country?: string | null;
  created_at: string;
  created_by_display_name?: string | null;
  created_by_user_id?: string | null;
  description: string;
  ends_at: string;
  event_type: string;
  id: string;
  is_registered: boolean;
  location?: string | null;
  mode: string;
  registration_url?: string | null;
  starts_at: string;
  status: string;
  summary: string;
  timezone: string;
  title: string;
  updated_at: string;
};

export type EventAgendaItem = {
  description?: string | null;
  ends_at?: string | null;
  id: string;
  sort_order: number;
  speaker_name?: string | null;
  starts_at?: string | null;
  title: string;
};

export type EventAttendee = {
  display_name: string;
  email: string;
  id: string;
  registered_at: string;
  status: string;
  user_id: string;
};

export type EventListResponse = {
  events: EventItem[];
  has_more: boolean;
  limit: number;
  offset: number;
  total: number;
};

export type EventPayload = {
  agenda_items?: Array<{
    description?: string | null;
    ends_at?: string | null;
    speaker_name?: string | null;
    starts_at?: string | null;
    title: string;
  }>;
  capacity?: number | null;
  city?: string | null;
  country?: string | null;
  description: string;
  ends_at: string;
  event_type?: string;
  location?: string | null;
  mode?: string;
  registration_url?: string | null;
  starts_at: string;
  summary: string;
  timezone?: string;
  title: string;
};

export type EventFilters = {
  country?: string;
  eventType?: string;
  limit?: number;
  mine?: boolean;
  mode?: string;
  offset?: number;
  q?: string;
};

export type InitiativeMilestone = {
  description?: string | null;
  due_at?: string | null;
  id: string;
  sort_order: number;
  status: string;
  title: string;
};

export type InitiativeItem = {
  city?: string | null;
  country?: string | null;
  created_at: string;
  created_by_display_name?: string | null;
  created_by_user_id?: string | null;
  description: string;
  ends_at?: string | null;
  focus_area: string;
  id: string;
  impact_goal?: string | null;
  milestone_count: number;
  milestones: InitiativeMilestone[];
  partner_organization?: string | null;
  stage: string;
  starts_at?: string | null;
  status: string;
  summary: string;
  support_needed?: string | null;
  target_beneficiaries?: number | null;
  title: string;
  updated_at: string;
};

export type InitiativeListResponse = {
  has_more: boolean;
  initiatives: InitiativeItem[];
  limit: number;
  offset: number;
  total: number;
};

export type InitiativePayload = {
  city?: string | null;
  country?: string | null;
  description: string;
  ends_at?: string | null;
  focus_area?: string;
  impact_goal?: string | null;
  milestones?: Array<{
    description?: string | null;
    due_at?: string | null;
    status?: string;
    title: string;
  }>;
  partner_organization?: string | null;
  stage?: string;
  starts_at?: string | null;
  summary: string;
  support_needed?: string | null;
  target_beneficiaries?: number | null;
  title: string;
};

export type InitiativeFilters = {
  country?: string;
  focusArea?: string;
  limit?: number;
  mine?: boolean;
  offset?: number;
  q?: string;
  stage?: string;
};

export type MentorProfile = {
  active_request_count: number;
  availability_status: string;
  bio: string;
  countries: string[];
  created_at: string;
  display_name: string;
  expertise_areas: string[];
  headline: string;
  id: string;
  is_accepting_requests: boolean;
  is_active: boolean;
  max_active_mentees: number;
  preferred_meeting_format: string;
  sectors: string[];
  updated_at: string;
  user_id: string;
  years_experience?: number | null;
};

export type MentorProfilePayload = {
  availability_status?: string;
  bio: string;
  countries?: string[];
  expertise_areas?: string[];
  headline: string;
  is_accepting_requests?: boolean;
  is_active?: boolean;
  max_active_mentees?: number;
  preferred_meeting_format?: string;
  sectors?: string[];
  years_experience?: number | null;
};

export type MentorProfileListResponse = {
  has_more: boolean;
  limit: number;
  mentors: MentorProfile[];
  offset: number;
  total: number;
};

export type MentorshipRequest = {
  created_at: string;
  focus_area: string;
  goals: string;
  id: string;
  mentor_display_name: string;
  mentor_profile_id: string;
  mentor_user_id: string;
  message?: string | null;
  requester_display_name: string;
  requester_user_id: string;
  reviewer_note?: string | null;
  status: string;
  updated_at: string;
};

export type MentorshipRequestPayload = {
  focus_area: string;
  goals: string;
  mentor_profile_id: string;
  message?: string | null;
};

export type MentorshipSummary = {
  incoming_requests: MentorshipRequest[];
  mentor_profile: MentorProfile | null;
  outgoing_requests: MentorshipRequest[];
  recommended_mentors: MentorProfile[];
};

export type MentorFilters = {
  availabilityStatus?: string;
  country?: string;
  expertise?: string;
  includeSelf?: boolean;
  limit?: number;
  offset?: number;
  q?: string;
  sector?: string;
};

export type ElectionItem = {
  candidate_count: number;
  can_vote: boolean;
  closed_at?: string | null;
  created_at: string;
  created_by_display_name?: string | null;
  created_by_user_id?: string | null;
  description: string;
  ends_at: string;
  has_voted: boolean;
  id: string;
  opened_at?: string | null;
  privacy_mode: string;
  quorum_count: number;
  results_visibility: string;
  scope_label?: string | null;
  scope_type: string;
  starts_at: string;
  status: string;
  summary: string;
  title: string;
  updated_at: string;
  voter_count: number;
  vote_count: number;
};

export type ElectionCandidate = {
  created_at: string;
  display_name: string;
  election_id: string;
  headline?: string | null;
  id: string;
  sort_order: number;
  statement: string;
  status: string;
  updated_at: string;
  user_id?: string | null;
  vote_count: number;
};

export type ElectionVoter = {
  display_name: string;
  email: string;
  id: string;
  invited_at: string;
  status: string;
  user_id: string;
  voted_at?: string | null;
};

export type ElectionListResponse = {
  elections: ElectionItem[];
  has_more: boolean;
  limit: number;
  offset: number;
  total: number;
};

export type ElectionPayload = {
  description: string;
  ends_at: string;
  quorum_count?: number;
  results_visibility?: string;
  scope_label?: string | null;
  scope_type?: string;
  starts_at: string;
  summary: string;
  title: string;
};

export type ElectionCandidatePayload = {
  display_name: string;
  headline?: string | null;
  sort_order?: number;
  statement: string;
  user_email?: string | null;
};

export type ElectionFilters = {
  limit?: number;
  offset?: number;
  q?: string;
  scopeType?: string;
  status?: string;
};

export type ElectionVoterRollResponse = {
  added_count: number;
  already_present_count: number;
  not_found: string[];
  voters: ElectionVoter[];
};

export type ElectionResultCandidate = {
  candidate_id: string;
  display_name: string;
  headline?: string | null;
  percentage: number;
  vote_count: number;
};

export type ElectionResultsResponse = {
  candidates: ElectionResultCandidate[];
  election: ElectionItem;
  eligible_voters: number;
  quorum_met: boolean;
  results_visible: boolean;
  total_votes: number;
};

export type ElectionAuditResponse = {
  election: ElectionItem;
  events: Array<{
    created_at: string;
    event_type: string;
    id: string;
    metadata?: Record<string, unknown> | null;
    user_display_name?: string | null;
    user_email?: string | null;
  }>;
};

export type ElectionPrivacyResponse = {
  audit_note: string;
  election: ElectionItem;
  privacy_mode: string;
  vote_recording: string;
};

export type ContributionCampaign = {
  chapter_name?: string | null;
  closed_at?: string | null;
  contribution_count: number;
  country?: string | null;
  cover_image_url?: string | null;
  created_at: string;
  created_by_display_name?: string | null;
  created_by_user_id?: string | null;
  currency: string;
  description: string;
  ends_at?: string | null;
  goal_amount_cents: number;
  id: string;
  is_contributor: boolean;
  pending_amount_cents: number;
  published_at?: string | null;
  received_amount_cents: number;
  starts_at?: string | null;
  status: string;
  summary: string;
  title: string;
  updated_at: string;
};

export type ContributionCampaignListResponse = {
  campaigns: ContributionCampaign[];
  has_more: boolean;
  limit: number;
  offset: number;
  total: number;
};

export type ContributionCampaignPayload = {
  chapter_name?: string | null;
  country?: string | null;
  cover_image_url?: string | null;
  currency?: string;
  description: string;
  ends_at?: string | null;
  goal_amount_cents?: number;
  starts_at?: string | null;
  summary: string;
  title: string;
};

export type ContributionPaymentPayload = {
  amount_cents: number;
  anonymous?: boolean;
  currency?: string;
  note?: string | null;
  payment_method?: string;
  payment_reference?: string | null;
};

export type ContributionPaymentIntent = {
  amount_cents: number;
  anonymous: boolean;
  campaign_id: string;
  contributor_user_id?: string | null;
  created_at: string;
  currency: string;
  id: string;
  note?: string | null;
  payment_method: string;
  provider: string;
  provider_intent_id: string;
  status: string;
  updated_at: string;
};

export type ContributionRecord = {
  amount_cents: number;
  anonymous: boolean;
  campaign_id: string;
  campaign_title?: string | null;
  contributor_display_name?: string | null;
  contributor_user_id?: string | null;
  created_at: string;
  currency: string;
  id: string;
  note?: string | null;
  paid_at?: string | null;
  payment_method: string;
  payment_reference?: string | null;
  receipt_id?: string | null;
  receipt_number?: string | null;
  status: string;
  updated_at: string;
};

export type ContributionListResponse = {
  contributions: ContributionRecord[];
  has_more: boolean;
  limit: number;
  offset: number;
  total: number;
};

export type ContributionReceipt = {
  amount_cents: number;
  campaign_id: string;
  campaign_title: string;
  contribution_id: string;
  contributor_display_name?: string | null;
  currency: string;
  id: string;
  issued_at: string;
  issued_to_email: string;
  issued_to_name: string;
  receipt_number: string;
  status: string;
  tax_note?: string | null;
};

export type ContributionLedgerEntry = {
  amount_cents: number;
  contribution_id: string;
  created_at: string;
  currency: string;
  entry_type: string;
  id: string;
  memo?: string | null;
};

export type TreasurySummary = {
  campaign_count: number;
  campaigns: ContributionCampaign[];
  ledger_entries: ContributionLedgerEntry[];
  pending_amount_cents: number;
  published_campaign_count: number;
  receipt_count: number;
  received_amount_cents: number;
  recent_contributions: ContributionRecord[];
};

export type ContributionFilters = {
  country?: string;
  limit?: number;
  offset?: number;
  q?: string;
  status?: string;
};

export type ResourceItem = {
  country?: string | null;
  created_at: string;
  created_by_display_name?: string | null;
  created_by_user_id?: string | null;
  description: string;
  external_url?: string | null;
  id: string;
  language?: string | null;
  published_at?: string | null;
  resource_format: string;
  resource_type: string;
  reviewed_at?: string | null;
  reviewed_by_display_name?: string | null;
  reviewed_by_user_id?: string | null;
  reviewer_note?: string | null;
  status: string;
  title: string;
  topic?: string | null;
  updated_at: string;
};

export type ResourceListResponse = {
  has_more: boolean;
  limit: number;
  offset: number;
  resources: ResourceItem[];
  total: number;
};

export type ResourcePayload = {
  country?: string | null;
  description: string;
  external_url?: string | null;
  language?: string | null;
  resource_format?: string;
  resource_type?: string;
  title: string;
  topic?: string | null;
};

export type ResourceFilters = {
  country?: string;
  limit?: number;
  mine?: boolean;
  offset?: number;
  q?: string;
  resourceFormat?: string;
  resourceType?: string;
  status?: string;
  topic?: string;
};

export type ResourceReviewPayload = {
  reviewer_note?: string | null;
};

export type SuccessStory = {
  beneficiary_count?: number | null;
  body: string;
  cohort_year?: number | null;
  country?: string | null;
  created_at: string;
  created_by_display_name?: string | null;
  created_by_user_id?: string | null;
  external_url?: string | null;
  id: string;
  impact_metric?: string | null;
  media_url?: string | null;
  program?: string | null;
  published_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by_display_name?: string | null;
  reviewed_by_user_id?: string | null;
  reviewer_note?: string | null;
  sector?: string | null;
  status: string;
  summary: string;
  title: string;
  updated_at: string;
};

export type SuccessStoryListResponse = {
  has_more: boolean;
  limit: number;
  offset: number;
  stories: SuccessStory[];
  total: number;
};

export type SuccessStoryPayload = {
  beneficiary_count?: number | null;
  body: string;
  cohort_year?: number | null;
  country?: string | null;
  external_url?: string | null;
  impact_metric?: string | null;
  media_url?: string | null;
  program?: string | null;
  sector?: string | null;
  summary: string;
  title: string;
};

export type SuccessStoryFilters = {
  country?: string;
  limit?: number;
  mine?: boolean;
  offset?: number;
  program?: string;
  q?: string;
  sector?: string;
  status?: string;
};

export type SuccessStoryReviewPayload = {
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
  method: "DELETE" | "PATCH" | "POST" | "PUT",
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

export function fetchMwfSyncStatus(): Promise<MwfAlumniSyncStatus> {
  return fetchJson<MwfAlumniSyncStatus>("/api/backend/api/v1/alumni/admin/mwf-sync");
}

export function fetchMwfSyncRuns(limit = 6): Promise<MwfAlumniSyncRunListResponse> {
  return fetchJson<MwfAlumniSyncRunListResponse>(
    `/api/backend/api/v1/alumni/admin/mwf-sync/runs?limit=${limit}`
  );
}

export function refreshMwfSync(): Promise<MwfAlumniSyncStatus> {
  return mutateJson<MwfAlumniSyncStatus>("/api/backend/api/v1/alumni/admin/mwf-sync", "POST");
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

function eventQueryString(filters: EventFilters = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === "undefined" || value === null || value === "") {
      continue;
    }

    const queryKey = key === "eventType" ? "event_type" : key;
    params.set(queryKey, String(value));
  }

  return params.toString();
}

export function fetchEvents(filters: EventFilters = {}): Promise<EventListResponse> {
  const query = eventQueryString({ limit: 12, offset: 0, ...filters });
  return fetchJson<EventListResponse>(`/api/backend/api/v1/events?${query}`);
}

export function fetchEvent(eventId: string): Promise<EventItem> {
  return fetchJson<EventItem>(`/api/backend/api/v1/events/${encodeURIComponent(eventId)}`);
}

export function createEvent(payload: EventPayload): Promise<EventItem> {
  return mutateJson<EventItem>("/api/backend/api/v1/events", "POST", payload);
}

export function fetchEventAgenda(eventId: string): Promise<EventAgendaItem[]> {
  return fetchJson<EventAgendaItem[]>(
    `/api/backend/api/v1/events/${encodeURIComponent(eventId)}/agenda`
  );
}

export function fetchEventAttendees(eventId: string): Promise<EventAttendee[]> {
  return fetchJson<EventAttendee[]>(
    `/api/backend/api/v1/events/${encodeURIComponent(eventId)}/attendees`
  );
}

export function rsvpEvent(eventId: string): Promise<EventItem> {
  return mutateJson<EventItem>(
    `/api/backend/api/v1/events/${encodeURIComponent(eventId)}/rsvp`,
    "POST"
  );
}

function initiativeQueryString(filters: InitiativeFilters = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === "undefined" || value === null || value === "") {
      continue;
    }

    const queryKey = key === "focusArea" ? "focus_area" : key;
    params.set(queryKey, String(value));
  }

  return params.toString();
}

export function fetchInitiatives(
  filters: InitiativeFilters = {}
): Promise<InitiativeListResponse> {
  const query = initiativeQueryString({ limit: 12, offset: 0, ...filters });
  return fetchJson<InitiativeListResponse>(`/api/backend/api/v1/initiatives?${query}`);
}

export function fetchInitiative(initiativeId: string): Promise<InitiativeItem> {
  return fetchJson<InitiativeItem>(
    `/api/backend/api/v1/initiatives/${encodeURIComponent(initiativeId)}`
  );
}

export function createInitiative(payload: InitiativePayload): Promise<InitiativeItem> {
  return mutateJson<InitiativeItem>("/api/backend/api/v1/initiatives", "POST", payload);
}

function mentorQueryString(filters: MentorFilters = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === "undefined" || value === null || value === "") {
      continue;
    }

    const queryKey =
      key === "availabilityStatus"
        ? "availability_status"
        : key === "includeSelf"
          ? "include_self"
          : key;
    params.set(queryKey, String(value));
  }

  return params.toString();
}

export function fetchMentorshipSummary(): Promise<MentorshipSummary> {
  return fetchJson<MentorshipSummary>("/api/backend/api/v1/mentorship/summary");
}

export function fetchMentors(filters: MentorFilters = {}): Promise<MentorProfileListResponse> {
  const query = mentorQueryString({ limit: 12, offset: 0, ...filters });
  return fetchJson<MentorProfileListResponse>(`/api/backend/api/v1/mentorship/mentors?${query}`);
}

export function fetchMyMentorProfile(): Promise<MentorProfile | null> {
  return fetchJson<MentorProfile | null>("/api/backend/api/v1/mentorship/mentors/me");
}

export function upsertMyMentorProfile(payload: MentorProfilePayload): Promise<MentorProfile> {
  return mutateJson<MentorProfile>("/api/backend/api/v1/mentorship/mentors/me", "PUT", payload);
}

export function createMentorshipRequest(
  payload: MentorshipRequestPayload
): Promise<MentorshipRequest> {
  return mutateJson<MentorshipRequest>("/api/backend/api/v1/mentorship/requests", "POST", payload);
}

export function acceptMentorshipRequest(
  requestId: string,
  reviewerNote?: string
): Promise<MentorshipRequest> {
  return mutateJson<MentorshipRequest>(
    `/api/backend/api/v1/mentorship/requests/${encodeURIComponent(requestId)}/accept`,
    "POST",
    { reviewer_note: reviewerNote ?? null }
  );
}

export function declineMentorshipRequest(
  requestId: string,
  reviewerNote?: string
): Promise<MentorshipRequest> {
  return mutateJson<MentorshipRequest>(
    `/api/backend/api/v1/mentorship/requests/${encodeURIComponent(requestId)}/decline`,
    "POST",
    { reviewer_note: reviewerNote ?? null }
  );
}

export function cancelMentorshipRequest(requestId: string): Promise<MentorshipRequest> {
  return mutateJson<MentorshipRequest>(
    `/api/backend/api/v1/mentorship/requests/${encodeURIComponent(requestId)}/cancel`,
    "POST"
  );
}

function electionQueryString(filters: ElectionFilters = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === "undefined" || value === null || value === "") {
      continue;
    }

    const queryKey = key === "scopeType" ? "scope_type" : key;
    params.set(queryKey, String(value));
  }

  return params.toString();
}

export function fetchElections(filters: ElectionFilters = {}): Promise<ElectionListResponse> {
  const query = electionQueryString({ limit: 12, offset: 0, ...filters });
  return fetchJson<ElectionListResponse>(`/api/backend/api/v1/elections?${query}`);
}

export function fetchAdminElections(
  filters: ElectionFilters = {}
): Promise<ElectionListResponse> {
  const query = electionQueryString({ limit: 12, offset: 0, status: "ALL", ...filters });
  return fetchJson<ElectionListResponse>(`/api/backend/api/v1/elections/admin?${query}`);
}

export function fetchElection(electionId: string): Promise<ElectionItem> {
  return fetchJson<ElectionItem>(`/api/backend/api/v1/elections/${encodeURIComponent(electionId)}`);
}

export function createElection(payload: ElectionPayload): Promise<ElectionItem> {
  return mutateJson<ElectionItem>("/api/backend/api/v1/elections/admin", "POST", payload);
}

export function fetchElectionCandidates(electionId: string): Promise<ElectionCandidate[]> {
  return fetchJson<ElectionCandidate[]>(
    `/api/backend/api/v1/elections/${encodeURIComponent(electionId)}/candidates`
  );
}

export function addElectionCandidate(
  electionId: string,
  payload: ElectionCandidatePayload
): Promise<ElectionCandidate> {
  return mutateJson<ElectionCandidate>(
    `/api/backend/api/v1/elections/admin/${encodeURIComponent(electionId)}/candidates`,
    "POST",
    payload
  );
}

export function fetchElectionVoterRoll(electionId: string): Promise<ElectionVoterRollResponse> {
  return fetchJson<ElectionVoterRollResponse>(
    `/api/backend/api/v1/elections/admin/${encodeURIComponent(electionId)}/voter-roll`
  );
}

export function upsertElectionVoterRoll(
  electionId: string,
  emails: string[]
): Promise<ElectionVoterRollResponse> {
  return mutateJson<ElectionVoterRollResponse>(
    `/api/backend/api/v1/elections/admin/${encodeURIComponent(electionId)}/voter-roll`,
    "POST",
    { emails }
  );
}

export function openElection(electionId: string, note?: string): Promise<ElectionItem> {
  return mutateJson<ElectionItem>(
    `/api/backend/api/v1/elections/admin/${encodeURIComponent(electionId)}/open`,
    "POST",
    { note: note ?? null }
  );
}

export function closeElection(electionId: string, note?: string): Promise<ElectionItem> {
  return mutateJson<ElectionItem>(
    `/api/backend/api/v1/elections/admin/${encodeURIComponent(electionId)}/close`,
    "POST",
    { note: note ?? null }
  );
}

export function castElectionVote(electionId: string, candidateId: string): Promise<ElectionItem> {
  return mutateJson<ElectionItem>(
    `/api/backend/api/v1/elections/${encodeURIComponent(electionId)}/vote`,
    "POST",
    { candidate_id: candidateId }
  );
}

export function fetchElectionResults(electionId: string): Promise<ElectionResultsResponse> {
  return fetchJson<ElectionResultsResponse>(
    `/api/backend/api/v1/elections/${encodeURIComponent(electionId)}/results`
  );
}

export function fetchElectionAudit(electionId: string): Promise<ElectionAuditResponse> {
  return fetchJson<ElectionAuditResponse>(
    `/api/backend/api/v1/elections/admin/${encodeURIComponent(electionId)}/audit`
  );
}

export function fetchElectionPrivacy(electionId: string): Promise<ElectionPrivacyResponse> {
  return fetchJson<ElectionPrivacyResponse>(
    `/api/backend/api/v1/elections/admin/${encodeURIComponent(electionId)}/privacy`
  );
}

function contributionQueryString(filters: ContributionFilters = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === "undefined" || value === null || value === "") {
      continue;
    }

    params.set(key, String(value));
  }

  return params.toString();
}

export function fetchContributionCampaigns(
  filters: ContributionFilters = {}
): Promise<ContributionCampaignListResponse> {
  const query = contributionQueryString({ limit: 12, offset: 0, ...filters });
  return fetchJson<ContributionCampaignListResponse>(`/api/backend/api/v1/contributions?${query}`);
}

export function fetchAdminContributionCampaigns(
  filters: ContributionFilters = {}
): Promise<ContributionCampaignListResponse> {
  const query = contributionQueryString({ limit: 12, offset: 0, status: "ALL", ...filters });
  return fetchJson<ContributionCampaignListResponse>(
    `/api/backend/api/v1/contributions/admin/campaigns?${query}`
  );
}

export function fetchContributionCampaign(campaignId: string): Promise<ContributionCampaign> {
  return fetchJson<ContributionCampaign>(
    `/api/backend/api/v1/contributions/${encodeURIComponent(campaignId)}`
  );
}

export function createContributionCampaign(
  payload: ContributionCampaignPayload
): Promise<ContributionCampaign> {
  return mutateJson<ContributionCampaign>(
    "/api/backend/api/v1/contributions/admin/campaigns",
    "POST",
    payload
  );
}

export function publishContributionCampaign(campaignId: string, note?: string): Promise<ContributionCampaign> {
  return mutateJson<ContributionCampaign>(
    `/api/backend/api/v1/contributions/admin/campaigns/${encodeURIComponent(campaignId)}/publish`,
    "POST",
    { note: note ?? null }
  );
}

export function closeContributionCampaign(campaignId: string, note?: string): Promise<ContributionCampaign> {
  return mutateJson<ContributionCampaign>(
    `/api/backend/api/v1/contributions/admin/campaigns/${encodeURIComponent(campaignId)}/close`,
    "POST",
    { note: note ?? null }
  );
}

export function recordContributionPayment(
  campaignId: string,
  payload: ContributionPaymentPayload
): Promise<ContributionRecord> {
  return mutateJson<ContributionRecord>(
    `/api/backend/api/v1/contributions/${encodeURIComponent(campaignId)}/pay`,
    "POST",
    payload
  );
}

export function createContributionPaymentIntent(
  campaignId: string,
  payload: ContributionPaymentPayload
): Promise<ContributionPaymentIntent> {
  return mutateJson<ContributionPaymentIntent>(
    `/api/backend/api/v1/contributions/${encodeURIComponent(campaignId)}/payment-intents`,
    "POST",
    payload
  );
}

export function refundContribution(contributionId: string, note?: string): Promise<ContributionRecord> {
  return mutateJson<ContributionRecord>(
    `/api/backend/api/v1/contributions/admin/contributions/${encodeURIComponent(contributionId)}/refund`,
    "POST",
    { note: note ?? null }
  );
}

export function voidContribution(contributionId: string, note?: string): Promise<ContributionRecord> {
  return mutateJson<ContributionRecord>(
    `/api/backend/api/v1/contributions/admin/contributions/${encodeURIComponent(contributionId)}/void`,
    "POST",
    { note: note ?? null }
  );
}

export function fetchContributionReceipt(receiptId: string): Promise<ContributionReceipt> {
  return fetchJson<ContributionReceipt>(
    `/api/backend/api/v1/contributions/receipts/${encodeURIComponent(receiptId)}`
  );
}

export function contributionReceiptDownloadUrl(receiptId: string): string {
  return `/api/backend/api/v1/contributions/receipts/${encodeURIComponent(receiptId)}/download`;
}

export function contributionReceiptPdfDownloadUrl(receiptId: string): string {
  return `/api/backend/api/v1/contributions/receipts/${encodeURIComponent(receiptId)}/download.pdf`;
}

export function fetchAdminContributions(
  filters: Pick<ContributionFilters, "limit" | "offset" | "status"> & { campaign_id?: string } = {}
): Promise<ContributionListResponse> {
  const query = contributionQueryString({ limit: 12, offset: 0, ...filters });
  return fetchJson<ContributionListResponse>(
    `/api/backend/api/v1/contributions/admin/contributions?${query}`
  );
}

export function adminContributionsExportUrl(
  filters: Pick<ContributionFilters, "status"> & { campaign_id?: string; limit?: number } = {}
): string {
  const query = contributionQueryString({ limit: 1000, ...filters });
  return `/api/backend/api/v1/contributions/admin/contributions/export?${query}`;
}

export function fetchTreasurySummary(): Promise<TreasurySummary> {
  return fetchJson<TreasurySummary>("/api/backend/api/v1/contributions/admin/treasury");
}

export function treasuryLedgerExportUrl(limit = 1000): string {
  return `/api/backend/api/v1/contributions/admin/treasury/export?limit=${encodeURIComponent(
    String(limit)
  )}`;
}

export function treasuryAuditPackageUrl(limit = 1000): string {
  return `/api/backend/api/v1/contributions/admin/treasury/audit-package?limit=${encodeURIComponent(
    String(limit)
  )}`;
}

export function treasuryAuditReportUrl(limit = 1000): string {
  return `/api/backend/api/v1/contributions/admin/treasury/audit-report?limit=${encodeURIComponent(
    String(limit)
  )}`;
}

function resourceQueryString(filters: ResourceFilters = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === "undefined" || value === null || value === "") {
      continue;
    }

    const queryKey =
      key === "resourceType" ? "resource_type" : key === "resourceFormat" ? "resource_format" : key;
    params.set(queryKey, String(value));
  }

  return params.toString();
}

export function fetchResources(filters: ResourceFilters = {}): Promise<ResourceListResponse> {
  const query = resourceQueryString({ limit: 12, offset: 0, ...filters });
  return fetchJson<ResourceListResponse>(`/api/backend/api/v1/resources?${query}`);
}

export function fetchResource(resourceId: string): Promise<ResourceItem> {
  return fetchJson<ResourceItem>(`/api/backend/api/v1/resources/${encodeURIComponent(resourceId)}`);
}

export function createResource(payload: ResourcePayload): Promise<ResourceItem> {
  return mutateJson<ResourceItem>("/api/backend/api/v1/resources", "POST", payload);
}

export function fetchAdminResourceQueue(
  filters: ResourceFilters = {}
): Promise<ResourceListResponse> {
  const query = resourceQueryString({ limit: 12, offset: 0, status: "PENDING_REVIEW", ...filters });
  return fetchJson<ResourceListResponse>(
    `/api/backend/api/v1/resources/admin/review-queue?${query}`
  );
}

export function approveResource(
  resourceId: string,
  payload: ResourceReviewPayload = {}
): Promise<ResourceItem> {
  return mutateJson<ResourceItem>(
    `/api/backend/api/v1/resources/admin/${encodeURIComponent(resourceId)}/approve`,
    "POST",
    payload
  );
}

export function rejectResource(
  resourceId: string,
  payload: ResourceReviewPayload = {}
): Promise<ResourceItem> {
  return mutateJson<ResourceItem>(
    `/api/backend/api/v1/resources/admin/${encodeURIComponent(resourceId)}/reject`,
    "POST",
    payload
  );
}

export function requestResourceChanges(
  resourceId: string,
  payload: ResourceReviewPayload = {}
): Promise<ResourceItem> {
  return mutateJson<ResourceItem>(
    `/api/backend/api/v1/resources/admin/${encodeURIComponent(resourceId)}/request-changes`,
    "POST",
    payload
  );
}

function successStoryQueryString(filters: SuccessStoryFilters = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === "undefined" || value === null || value === "") {
      continue;
    }

    params.set(key, String(value));
  }

  return params.toString();
}

export function fetchSuccessStories(
  filters: SuccessStoryFilters = {}
): Promise<SuccessStoryListResponse> {
  const query = successStoryQueryString({ limit: 12, offset: 0, ...filters });
  return fetchJson<SuccessStoryListResponse>(`/api/backend/api/v1/success-stories?${query}`);
}

export function fetchSuccessStory(storyId: string): Promise<SuccessStory> {
  return fetchJson<SuccessStory>(
    `/api/backend/api/v1/success-stories/${encodeURIComponent(storyId)}`
  );
}

export function createSuccessStory(payload: SuccessStoryPayload): Promise<SuccessStory> {
  return mutateJson<SuccessStory>("/api/backend/api/v1/success-stories", "POST", payload);
}

export function fetchAdminSuccessStoryQueue(
  filters: SuccessStoryFilters = {}
): Promise<SuccessStoryListResponse> {
  const query = successStoryQueryString({
    limit: 12,
    offset: 0,
    status: "PENDING_REVIEW",
    ...filters
  });
  return fetchJson<SuccessStoryListResponse>(
    `/api/backend/api/v1/success-stories/admin/review-queue?${query}`
  );
}

export function approveSuccessStory(
  storyId: string,
  payload: SuccessStoryReviewPayload = {}
): Promise<SuccessStory> {
  return mutateJson<SuccessStory>(
    `/api/backend/api/v1/success-stories/admin/${encodeURIComponent(storyId)}/approve`,
    "POST",
    payload
  );
}

export function rejectSuccessStory(
  storyId: string,
  payload: SuccessStoryReviewPayload = {}
): Promise<SuccessStory> {
  return mutateJson<SuccessStory>(
    `/api/backend/api/v1/success-stories/admin/${encodeURIComponent(storyId)}/reject`,
    "POST",
    payload
  );
}

export function requestSuccessStoryChanges(
  storyId: string,
  payload: SuccessStoryReviewPayload = {}
): Promise<SuccessStory> {
  return mutateJson<SuccessStory>(
    `/api/backend/api/v1/success-stories/admin/${encodeURIComponent(storyId)}/request-changes`,
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
