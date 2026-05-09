"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  type AdminVerificationAction,
  type AdminVerificationEvidence,
  type AdminVerificationRequest,
  type CommunityPostReport,
  type DirectMessageReport,
  fetchAdminVerificationRequests,
  fetchCommunityPostReports,
  fetchCommunityRemovedComments,
  fetchCommunityRemovedPosts,
  fetchDirectMessageReports,
  fetchRemovedDirectMessages,
  removeDirectMessage,
  resolveCommunityPostReport,
  resolveDirectMessageReport,
  restoreCommunityPost,
  restoreCommunityPostComment,
  restoreDirectMessage,
  reviewAdminVerificationRequest,
  updateCommunityPostCommentModerationReview,
  updateCommunityPostModerationReview,
  updateCommunityPostReportReview,
  updateDirectMessageModerationReview,
  updateDirectMessageReportReview,
  verificationEvidenceDownloadUrl,
  type CommunityRemovedComment,
  type CommunityRemovedCommentResponse,
  type CommunityRemovedPost,
  type CommunityRemovedPostResponse,
  type CommunityPostReportResponse,
  type DirectMessageReportResponse,
  type ModerationQueueFilters,
  type ModerationReviewPayload,
  type RemovedDirectMessage,
  type RemovedDirectMessageResponse
} from "@yalumni/frontend-shared";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eye,
  FilterX,
  FileText,
  MessageSquareWarning,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  UserCheck,
  XCircle
} from "lucide-react";

type VerificationState =
  | { status: "loading" }
  | { requests: AdminVerificationRequest[]; status: "ready" }
  | { message: string; status: "error" };

type ModerationState =
  | { status: "loading" }
  | {
      communityRemovedComments: CommunityRemovedCommentResponse;
      communityRemovedPosts: CommunityRemovedPostResponse;
      communityReports: CommunityPostReportResponse;
      messageReports: DirectMessageReportResponse;
      removedMessages: RemovedDirectMessageResponse;
      status: "ready";
    }
  | { message: string; status: "error" };

type ModerationQueueKey =
  | "communityRemovedComments"
  | "communityRemovedPosts"
  | "communityReports"
  | "messageReports"
  | "removedMessages";

type ModerationFilterState = {
  escalationStatus: string;
  q: string;
  severity: string;
  status: "ALL" | "OPEN" | "RESOLVED";
};

const MODERATION_QUEUE_LIMITS: Record<ModerationQueueKey, number> = {
  communityRemovedComments: 6,
  communityRemovedPosts: 6,
  communityReports: 8,
  messageReports: 8,
  removedMessages: 6
};

const INITIAL_MODERATION_OFFSETS: Record<ModerationQueueKey, number> = {
  communityRemovedComments: 0,
  communityRemovedPosts: 0,
  communityReports: 0,
  messageReports: 0,
  removedMessages: 0
};

export function LiveVerificationQueue() {
  const [state, setState] = useState<VerificationState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("PENDING_REVIEW");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchAdminVerificationRequests(statusFilter)
      .then((response) => {
        if (!isMounted) {
          return;
        }
        setState({ requests: response.requests, status: "ready" });
      })
      .catch((caught) => {
        if (!isMounted) {
          return;
        }
        setState({
          message:
            caught instanceof Error ? caught.message : "The verification queue could not be loaded.",
          status: "error"
        });
      });

    return () => {
      isMounted = false;
    };
  }, [reloadKey, statusFilter]);

  function refreshVerificationQueue() {
    setState({ status: "loading" });
    setReloadKey((current) => current + 1);
  }

  function updateVerificationStatus(value: string) {
    setStatusFilter(value);
    setState({ status: "loading" });
  }

  const metrics = useMemo(() => {
    if (state.status !== "ready") {
      return [
        ["Pending requests", "n/a"],
        ["Evidence files", "n/a"],
        ["Complete profiles", "n/a"]
      ];
    }

    const evidenceCount = state.requests.reduce(
      (total, request) => total + (request.evidence?.length ?? request.evidence_count ?? 0),
      0
    );
    const completeProfiles = state.requests.filter(
      (request) => (request.profile_snapshot?.completion_percentage ?? 0) >= 80
    ).length;

    return [
      ["Pending requests", String(state.requests.length)],
      ["Evidence files", String(evidenceCount)],
      ["Complete profiles", String(completeProfiles)]
    ];
  }, [state]);

  async function handleReview(request: AdminVerificationRequest, action: AdminVerificationAction) {
    setBusyAction(`${action}:${request.id}`);
    setMessage(null);

    try {
      await reviewAdminVerificationRequest(request.id, action, reviewNotes[request.id]);
      setMessage(reviewMessage(action));
      setReviewNotes((current) => {
        const next = { ...current };
        delete next[request.id];
        return next;
      });
      refreshVerificationQueue();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "The verification action failed.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
      <LiveSurfaceHeader
        description="Review live alumni verification submissions from the FastAPI identity service."
        icon={<UserCheck aria-hidden="true" className="h-5 w-5" />}
        onRefresh={refreshVerificationQueue}
        title="Live verification queue"
      />

      <MetricStrip metrics={metrics} />
      <Notice message={message} />
      <div className="mt-5 rounded-lg border border-border bg-surface p-4">
        <FilterSelect
          label="Verification queue"
          onChange={updateVerificationStatus}
          options={[
            ["PENDING_REVIEW", "Pending review"],
            ["MORE_INFO_REQUESTED", "More info requested"],
            ["APPROVED", "Approved"],
            ["REJECTED", "Rejected"],
            ["ALL", "All requests"]
          ]}
          value={statusFilter}
        />
      </div>

      {state.status === "loading" ? (
        <LoadingPanel label="Loading pending verification requests." />
      ) : null}

      {state.status === "error" ? <ErrorPanel message={state.message} /> : null}

      {state.status === "ready" ? (
        <div className="mt-5 grid gap-4">
          {state.requests.length ? (
            state.requests.map((request) => (
              <article className="rounded-lg border border-border bg-surface p-4" key={request.id}>
                <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-ink">{verificationName(request)}</h3>
                      <Pill label={request.status} />
                      <Pill label={request.request_type ?? "verification"} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-muted">{verificationEmail(request)}</p>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                      {request.submitted_note || request.profile_snapshot?.headline || "No submitted note."}
                    </p>
                    <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-3">
                      <CompactFact
                        label="Profile"
                        value={`${request.profile_snapshot?.completion_percentage ?? 0}% complete`}
                      />
                      <CompactFact
                        label="Location"
                        value={
                          [request.profile_snapshot?.city, request.profile_snapshot?.country]
                            .filter(Boolean)
                            .join(", ") || "Not provided"
                        }
                      />
                      <CompactFact
                        label="Evidence"
                        value={`${request.evidence?.length ?? request.evidence_count ?? 0} file(s)`}
                      />
                    </div>
                    <EvidenceList evidence={request.evidence ?? []} requestId={request.id} />
                  </div>
                  <div className="min-w-64">
                    <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                      Reviewer note
                    </label>
                    <textarea
                      className="mt-2 min-h-24 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      onChange={(event) =>
                        setReviewNotes((current) => ({
                          ...current,
                          [request.id]: event.target.value
                        }))
                      }
                      placeholder="Optional private note"
                      value={reviewNotes[request.id] ?? ""}
                    />
                    <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                      <ActionButton
                        busy={busyAction === `approve:${request.id}`}
                        icon={<CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
                        label="Approve"
                        onClick={() => handleReview(request, "approve")}
                        tone="primary"
                      />
                      <ActionButton
                        busy={busyAction === `request-info:${request.id}`}
                        icon={<ClipboardCheck aria-hidden="true" className="h-4 w-4" />}
                        label="Request info"
                        onClick={() => handleReview(request, "request-info")}
                        tone="neutral"
                      />
                      <ActionButton
                        busy={busyAction === `reject:${request.id}`}
                        icon={<XCircle aria-hidden="true" className="h-4 w-4" />}
                        label="Reject"
                        onClick={() => handleReview(request, "reject")}
                        tone="danger"
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <EmptyPanel label="No pending verification requests match this queue." />
          )}
        </div>
      ) : null}
    </section>
  );
}

export function LiveModerationQueues() {
  const [state, setState] = useState<ModerationState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [filters, setFilters] = useState<ModerationFilterState>({
    escalationStatus: "",
    q: "",
    severity: "",
    status: "OPEN"
  });
  const [offsets, setOffsets] = useState<Record<ModerationQueueKey, number>>(
    INITIAL_MODERATION_OFFSETS
  );
  const [message, setMessage] = useState<string | null>(null);

  const sharedFilters = useMemo<ModerationQueueFilters>(
    () => ({
      escalationStatus: filters.escalationStatus || undefined,
      q: filters.q.trim() || undefined,
      severity: filters.severity || undefined
    }),
    [filters.escalationStatus, filters.q, filters.severity]
  );

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetchCommunityPostReports({
        ...sharedFilters,
        limit: MODERATION_QUEUE_LIMITS.communityReports,
        offset: offsets.communityReports,
        status: filters.status
      }),
      fetchCommunityRemovedPosts({
        ...sharedFilters,
        limit: MODERATION_QUEUE_LIMITS.communityRemovedPosts,
        offset: offsets.communityRemovedPosts
      }),
      fetchCommunityRemovedComments({
        ...sharedFilters,
        limit: MODERATION_QUEUE_LIMITS.communityRemovedComments,
        offset: offsets.communityRemovedComments
      }),
      fetchDirectMessageReports({
        ...sharedFilters,
        limit: MODERATION_QUEUE_LIMITS.messageReports,
        offset: offsets.messageReports,
        status: filters.status
      }),
      fetchRemovedDirectMessages({
        ...sharedFilters,
        limit: MODERATION_QUEUE_LIMITS.removedMessages,
        offset: offsets.removedMessages
      })
    ])
      .then(
        ([
          communityReports,
          communityRemovedPosts,
          communityRemovedComments,
          messageReports,
          removedMessages
        ]) => {
          if (!isMounted) {
            return;
          }
          setState({
            communityRemovedComments,
            communityRemovedPosts,
            communityReports,
            messageReports,
            removedMessages,
            status: "ready"
          });
        }
      )
      .catch((caught) => {
        if (!isMounted) {
          return;
        }
        setState({
          message: caught instanceof Error ? caught.message : "Moderation queues could not be loaded.",
          status: "error"
        });
      });

    return () => {
      isMounted = false;
    };
  }, [filters.status, offsets, reloadKey, sharedFilters]);

  function refreshModerationQueues() {
    setState({ status: "loading" });
    setReloadKey((current) => current + 1);
  }

  function updateFilter(patch: Partial<ModerationFilterState>) {
    setFilters((current) => ({ ...current, ...patch }));
    setOffsets(INITIAL_MODERATION_OFFSETS);
    setState({ status: "loading" });
  }

  function resetFilters() {
    setFilters({
      escalationStatus: "",
      q: "",
      severity: "",
      status: "OPEN"
    });
    setOffsets(INITIAL_MODERATION_OFFSETS);
    setState({ status: "loading" });
  }

  function moveQueue(queue: ModerationQueueKey, direction: "next" | "previous") {
    setOffsets((current) => {
      const limit = MODERATION_QUEUE_LIMITS[queue];
      return {
        ...current,
        [queue]:
          direction === "next"
            ? current[queue] + limit
            : Math.max(0, current[queue] - limit)
      };
    });
    setState({ status: "loading" });
  }

  const metrics = useMemo(() => {
    if (state.status !== "ready") {
      return [
        ["Community reports", "n/a"],
        ["Message reports", "n/a"],
        ["Removed content", "n/a"]
      ];
    }

    return [
      ["Community reports", String(state.communityReports.total)],
      ["Message reports", String(state.messageReports.total)],
      [
        "Removed content",
        String(
          state.communityRemovedPosts.total +
            state.communityRemovedComments.total +
            state.removedMessages.total
        )
      ]
    ];
  }, [state]);

  async function runAction(actionKey: string, action: () => Promise<unknown>, successMessage: string) {
    setBusyAction(actionKey);
    setMessage(null);

    try {
      await action();
      setMessage(successMessage);
      refreshModerationQueues();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Moderation action failed.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
      <LiveSurfaceHeader
        description="Operate the live community and direct-message safety queues from the separated RBAC console."
        icon={<ShieldAlert aria-hidden="true" className="h-5 w-5" />}
        onRefresh={refreshModerationQueues}
        title="Live moderation queues"
      />

      <MetricStrip metrics={metrics} />
      <Notice message={message} />
      <ModerationFilterBar filters={filters} onChange={updateFilter} onReset={resetFilters} />

      {state.status === "loading" ? <LoadingPanel label="Loading moderation queues." /> : null}
      {state.status === "error" ? <ErrorPanel message={state.message} /> : null}

      {state.status === "ready" ? (
        <div className="mt-5 grid gap-5">
          <QueuePanel
            count={state.communityReports.total}
            description="Reported posts across communities."
            footer={
              <QueuePager
                itemCount={state.communityReports.reports.length}
                onNext={() => moveQueue("communityReports", "next")}
                onPrevious={() => moveQueue("communityReports", "previous")}
                response={state.communityReports}
              />
            }
            title="Community post reports"
          >
            {state.communityReports.reports.length ? (
              state.communityReports.reports.map((report) => (
                <CommunityReportRow
                  busyAction={busyAction}
                  key={report.id}
                  onResolve={(item) =>
                    runAction(
                      `community-report:${item.id}`,
                      () => resolveCommunityPostReport(item),
                      "Community report resolved."
                    )
                  }
                  onSaveReview={(item, payload) =>
                    runAction(
                      `community-report-review:${item.id}`,
                      () => updateCommunityPostReportReview(item, payload),
                      "Community report review saved."
                    )
                  }
                  report={report}
                />
              ))
            ) : (
              <EmptyPanel label="No open community reports." />
            )}
          </QueuePanel>

          <QueuePanel
            count={state.messageReports.total}
            description="Reported direct messages that may require moderator action."
            footer={
              <QueuePager
                itemCount={state.messageReports.reports.length}
                onNext={() => moveQueue("messageReports", "next")}
                onPrevious={() => moveQueue("messageReports", "previous")}
                response={state.messageReports}
              />
            }
            title="Direct message reports"
          >
            {state.messageReports.reports.length ? (
              state.messageReports.reports.map((report) => (
                <DirectMessageReportRow
                  busyAction={busyAction}
                  key={report.id}
                  onRemove={(item) =>
                    runAction(
                      `message-remove:${item.message_id}`,
                      () => removeDirectMessage(item.message_id),
                      "Reported message removed."
                    )
                  }
                  onResolve={(item) =>
                    runAction(
                      `message-report:${item.id}`,
                      () => resolveDirectMessageReport(item.id),
                      "Message report resolved."
                    )
                  }
                  onSaveReview={(item, payload) =>
                    runAction(
                      `message-report-review:${item.id}`,
                      () => updateDirectMessageReportReview(item.id, payload),
                      "Message report review saved."
                    )
                  }
                  report={report}
                />
              ))
            ) : (
              <EmptyPanel label="No open direct message reports." />
            )}
          </QueuePanel>

          <div className="grid gap-5 xl:grid-cols-3">
            <QueuePanel
              count={state.communityRemovedPosts.total}
              description="Removed community posts available for restoration."
              footer={
                <QueuePager
                  itemCount={state.communityRemovedPosts.posts.length}
                  onNext={() => moveQueue("communityRemovedPosts", "next")}
                  onPrevious={() => moveQueue("communityRemovedPosts", "previous")}
                  response={state.communityRemovedPosts}
                />
              }
              title="Removed posts"
            >
              {state.communityRemovedPosts.posts.length ? (
                state.communityRemovedPosts.posts.map((post) => (
                  <RemovedPostRow
                    busyAction={busyAction}
                    key={post.id}
                    onRestore={(item) =>
                      runAction(
                        `post-restore:${item.id}`,
                        () => restoreCommunityPost(item),
                        "Post restored."
                      )
                    }
                    onSaveReview={(item, payload) =>
                      runAction(
                        `post-review:${item.id}`,
                        () => updateCommunityPostModerationReview(item, payload),
                        "Post review metadata saved."
                      )
                    }
                    post={post}
                  />
                ))
              ) : (
                <EmptyPanel label="No removed posts in this queue." />
              )}
            </QueuePanel>

            <QueuePanel
              count={state.communityRemovedComments.total}
              description="Removed comments available for restoration."
              footer={
                <QueuePager
                  itemCount={state.communityRemovedComments.comments.length}
                  onNext={() => moveQueue("communityRemovedComments", "next")}
                  onPrevious={() => moveQueue("communityRemovedComments", "previous")}
                  response={state.communityRemovedComments}
                />
              }
              title="Removed comments"
            >
              {state.communityRemovedComments.comments.length ? (
                state.communityRemovedComments.comments.map((comment) => (
                  <RemovedCommentRow
                    busyAction={busyAction}
                    comment={comment}
                    key={comment.id}
                    onRestore={(item) =>
                      runAction(
                        `comment-restore:${item.id}`,
                        () => restoreCommunityPostComment(item),
                        "Comment restored."
                      )
                    }
                    onSaveReview={(item, payload) =>
                      runAction(
                        `comment-review:${item.id}`,
                        () => updateCommunityPostCommentModerationReview(item, payload),
                        "Comment review metadata saved."
                      )
                    }
                  />
                ))
              ) : (
                <EmptyPanel label="No removed comments in this queue." />
              )}
            </QueuePanel>

            <QueuePanel
              count={state.removedMessages.total}
              description="Removed direct messages available for restoration."
              footer={
                <QueuePager
                  itemCount={state.removedMessages.messages.length}
                  onNext={() => moveQueue("removedMessages", "next")}
                  onPrevious={() => moveQueue("removedMessages", "previous")}
                  response={state.removedMessages}
                />
              }
              title="Removed messages"
            >
              {state.removedMessages.messages.length ? (
                state.removedMessages.messages.map((item) => (
                  <RemovedMessageRow
                    busyAction={busyAction}
                    item={item}
                    key={item.id}
                    onRestore={(messageItem) =>
                      runAction(
                        `message-restore:${messageItem.id}`,
                        () => restoreDirectMessage(messageItem.id),
                        "Direct message restored."
                      )
                    }
                    onSaveReview={(messageItem, payload) =>
                      runAction(
                        `message-review:${messageItem.id}`,
                        () => updateDirectMessageModerationReview(messageItem.id, payload),
                        "Message review metadata saved."
                      )
                    }
                  />
                ))
              ) : (
                <EmptyPanel label="No removed messages in this queue." />
              )}
            </QueuePanel>
          </div>

          <div className="rounded-lg border border-dashed border-border bg-surface p-4 text-sm leading-6 text-muted">
            Stories, resources, and opportunity moderation remain route-ready prototype surfaces until
            those backend modules are implemented.
          </div>
        </div>
      ) : null}
    </section>
  );
}

function LiveSurfaceHeader({
  description,
  icon,
  onRefresh,
  title
}: {
  description: string;
  icon: ReactNode;
  onRefresh: () => void;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white">
          {icon}
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p>
        </div>
      </div>
      <button
        className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
        onClick={onRefresh}
        type="button"
      >
        <RefreshCcw aria-hidden="true" className="h-4 w-4" />
        Refresh
      </button>
    </div>
  );
}

function MetricStrip({ metrics }: { metrics: string[][] }) {
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-3">
      {metrics.map(([label, value]) => (
        <div className="rounded-lg border border-border bg-surface p-4" key={label}>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold text-primary">{value}</p>
        </div>
      ))}
    </div>
  );
}

function QueuePanel({
  children,
  count,
  description,
  footer,
  title
}: {
  children: ReactNode;
  count: number;
  description: string;
  footer?: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        </div>
        <Pill label={`${count} total`} />
      </div>
      <div className="mt-4 grid gap-3">{children}</div>
      {footer ? <div className="mt-4 border-t border-border pt-3">{footer}</div> : null}
    </section>
  );
}

function ModerationFilterBar({
  filters,
  onChange,
  onReset
}: {
  filters: ModerationFilterState;
  onChange: (patch: Partial<ModerationFilterState>) => void;
  onReset: () => void;
}) {
  return (
    <div className="mt-5 rounded-lg border border-border bg-surface p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_repeat(3,160px)_auto] lg:items-end">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Search queues
          <span className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            />
            <input
              className="min-h-11 w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              onChange={(event) => onChange({ q: event.target.value })}
              placeholder="Search content, notes, or communities"
              type="search"
              value={filters.q}
            />
          </span>
        </label>
        <FilterSelect
          label="Reports"
          onChange={(value) => onChange({ status: value as ModerationFilterState["status"] })}
          options={[
            ["OPEN", "Open"],
            ["RESOLVED", "Resolved"],
            ["ALL", "All"]
          ]}
          value={filters.status}
        />
        <FilterSelect
          label="Severity"
          onChange={(value) => onChange({ severity: value })}
          options={[
            ["", "Any severity"],
            ["LOW", "Low"],
            ["MEDIUM", "Medium"],
            ["HIGH", "High"],
            ["CRITICAL", "Critical"]
          ]}
          value={filters.severity}
        />
        <FilterSelect
          label="Escalation"
          onChange={(value) => onChange({ escalationStatus: value })}
          options={[
            ["", "Any status"],
            ["NONE", "Not escalated"],
            ["ESCALATED", "Escalated"]
          ]}
          value={filters.escalationStatus}
        />
        <button
          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
          onClick={onReset}
          type="button"
        >
          <FilterX aria-hidden="true" className="h-4 w-4" />
          Reset
        </button>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <select
        className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue || optionLabel} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function QueuePager({
  itemCount,
  onNext,
  onPrevious,
  response
}: {
  itemCount: number;
  onNext: () => void;
  onPrevious: () => void;
  response: { has_more?: boolean; limit?: number; offset?: number; total: number };
}) {
  const offset = response.offset ?? 0;
  const start = response.total ? offset + 1 : 0;
  const end = response.total ? offset + itemCount : 0;

  return (
    <div className="flex flex-col gap-3 text-sm font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {start}-{end} of {response.total}
      </span>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          disabled={offset <= 0}
          onClick={onPrevious}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          Previous
        </button>
        <button
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!response.has_more}
          onClick={onNext}
          type="button"
        >
          Next
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function CommunityReportRow({
  busyAction,
  onResolve,
  onSaveReview,
  report
}: {
  busyAction: string | null;
  onResolve: (report: CommunityPostReport) => void;
  onSaveReview: (report: CommunityPostReport, payload: ModerationReviewPayload) => void;
  report: CommunityPostReport;
}) {
  return (
    <ModerationRow
      actions={
        <div className="grid gap-2">
          <ActionButton
            busy={busyAction === `community-report:${report.id}`}
            icon={<CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
            label="Resolve"
            onClick={() => onResolve(report)}
            tone="primary"
          />
          <ReviewControls
            busy={busyAction === `community-report-review:${report.id}`}
            onSave={(payload) => onSaveReview(report, payload)}
            source={report}
          />
        </div>
      }
      body={report.post_body || "No post preview available."}
      meta={[
        report.community_name || "Community",
        `Reported by ${report.reporter_display_name ?? "unknown"}`,
        formatDate(report.created_at)
      ]}
      pills={compactStrings([report.reason, report.severity, report.status])}
      title={report.post_author_display_name || "Reported post"}
    />
  );
}

function DirectMessageReportRow({
  busyAction,
  onRemove,
  onResolve,
  onSaveReview,
  report
}: {
  busyAction: string | null;
  onRemove: (report: DirectMessageReport) => void;
  onResolve: (report: DirectMessageReport) => void;
  onSaveReview: (report: DirectMessageReport, payload: ModerationReviewPayload) => void;
  report: DirectMessageReport;
}) {
  return (
    <ModerationRow
      actions={
        <div className="grid gap-2">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <ActionButton
              busy={busyAction === `message-report:${report.id}`}
              icon={<CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
              label="Resolve"
              onClick={() => onResolve(report)}
              tone="primary"
            />
            <ActionButton
              busy={busyAction === `message-remove:${report.message_id}`}
              icon={<MessageSquareWarning aria-hidden="true" className="h-4 w-4" />}
              label="Remove"
              onClick={() => onRemove(report)}
              tone="danger"
            />
          </div>
          <ReviewControls
            busy={busyAction === `message-report-review:${report.id}`}
            onSave={(payload) => onSaveReview(report, payload)}
            source={report}
          />
        </div>
      }
      body={report.message_body || "No message preview available."}
      meta={[
        `Sender ${report.sender_display_name ?? "unknown"}`,
        `Reported by ${report.reporter_display_name ?? "unknown"}`,
        formatDate(report.created_at)
      ]}
      pills={compactStrings([report.reason, report.severity, report.status])}
      title="Reported direct message"
    />
  );
}

function RemovedPostRow({
  busyAction,
  onRestore,
  onSaveReview,
  post
}: {
  busyAction: string | null;
  onRestore: (post: CommunityRemovedPost) => void;
  onSaveReview: (post: CommunityRemovedPost, payload: ModerationReviewPayload) => void;
  post: CommunityRemovedPost;
}) {
  return (
    <RemovedContentRow
      body={post.body || "No post preview available."}
      busy={busyAction === `post-restore:${post.id}`}
      meta={`${post.community_name ?? "Community"} · removed by ${post.removed_by_display_name ?? "unknown"}`}
      onRestore={() => onRestore(post)}
      reviewControls={
        <ReviewControls
          busy={busyAction === `post-review:${post.id}`}
          onSave={(payload) => onSaveReview(post, payload)}
          source={post}
        />
      }
      title={post.author_display_name || "Removed post"}
    />
  );
}

function RemovedCommentRow({
  busyAction,
  comment,
  onRestore,
  onSaveReview
}: {
  busyAction: string | null;
  comment: CommunityRemovedComment;
  onRestore: (comment: CommunityRemovedComment) => void;
  onSaveReview: (comment: CommunityRemovedComment, payload: ModerationReviewPayload) => void;
}) {
  return (
    <RemovedContentRow
      body={comment.body || "No comment preview available."}
      busy={busyAction === `comment-restore:${comment.id}`}
      meta={`${comment.community_name ?? "Community"} · removed by ${comment.removed_by_display_name ?? "unknown"}`}
      onRestore={() => onRestore(comment)}
      reviewControls={
        <ReviewControls
          busy={busyAction === `comment-review:${comment.id}`}
          onSave={(payload) => onSaveReview(comment, payload)}
          source={comment}
        />
      }
      title={comment.author_display_name || "Removed comment"}
    />
  );
}

function RemovedMessageRow({
  busyAction,
  item,
  onRestore,
  onSaveReview
}: {
  busyAction: string | null;
  item: RemovedDirectMessage;
  onRestore: (item: RemovedDirectMessage) => void;
  onSaveReview: (item: RemovedDirectMessage, payload: ModerationReviewPayload) => void;
}) {
  return (
    <RemovedContentRow
      body={item.body || "No message preview available."}
      busy={busyAction === `message-restore:${item.id}`}
      meta={`Sender ${item.sender_display_name ?? "unknown"} · ${item.report_count ?? 0} reports`}
      onRestore={() => onRestore(item)}
      reviewControls={
        <ReviewControls
          busy={busyAction === `message-review:${item.id}`}
          onSave={(payload) => onSaveReview(item, payload)}
          source={item}
        />
      }
      title="Removed direct message"
    />
  );
}

function ModerationRow({
  actions,
  body,
  meta,
  pills,
  title
}: {
  actions: ReactNode;
  body: string;
  meta: string[];
  pills: string[];
  title: string;
}) {
  return (
    <article className="rounded-lg border border-border bg-white p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-ink">{title}</h4>
            {pills.map((pill) => (
              <Pill key={pill} label={pill} />
            ))}
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">{truncate(body)}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
            {meta.join(" · ")}
          </p>
        </div>
        <div>{actions}</div>
      </div>
    </article>
  );
}

function RemovedContentRow({
  body,
  busy,
  meta,
  onRestore,
  reviewControls,
  title
}: {
  body: string;
  busy: boolean;
  meta: string;
  onRestore: () => void;
  reviewControls: ReactNode;
  title: string;
}) {
  return (
    <article className="rounded-lg border border-border bg-white p-4">
      <h4 className="text-sm font-bold text-ink">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-muted">{truncate(body, 140)}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">{meta}</p>
      <div className="mt-3 grid gap-3">
        <ActionButton
          busy={busy}
          icon={<RotateCcw aria-hidden="true" className="h-4 w-4" />}
          label="Restore"
          onClick={onRestore}
          tone="neutral"
        />
        {reviewControls}
      </div>
    </article>
  );
}

function ActionButton({
  busy,
  icon,
  label,
  onClick,
  tone
}: {
  busy: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone: "danger" | "neutral" | "primary";
}) {
  const toneClass =
    tone === "primary"
      ? "border-primary bg-primary text-white hover:bg-[#003d7d]"
      : tone === "danger"
        ? "border-[#df331b] bg-[#df331b] text-white hover:bg-[#b82716]"
        : "border-border bg-white text-ink hover:border-primary hover:text-primary";

  return (
    <button
      className={`focus-ring inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClass}`}
      disabled={busy}
      onClick={onClick}
      type="button"
    >
      {icon}
      {busy ? "Working" : label}
    </button>
  );
}

function ReviewControls({
  busy,
  onSave,
  source
}: {
  busy: boolean;
  onSave: (payload: ModerationReviewPayload) => void;
  source: ReviewSource;
}) {
  const [note, setNote] = useState(source.moderator_note ?? source.moderation_note ?? source.note ?? "");
  const [severity, setSeverity] = useState(source.severity ?? source.moderation_severity ?? "");
  const [escalationStatus, setEscalationStatus] = useState(source.escalation_status ?? "");

  function handleSave() {
    const payload: ModerationReviewPayload = {
      moderator_note: note.trim() || null
    };

    if (severity) {
      payload.severity = severity;
    }
    if (escalationStatus) {
      payload.escalation_status = escalationStatus;
    }
    onSave(payload);
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <label className="text-xs font-bold uppercase tracking-[0.1em] text-muted">
        Review metadata
      </label>
      <textarea
        className="mt-2 min-h-20 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => setNote(event.target.value)}
        placeholder="Moderator note"
        value={note}
      />
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <select
          className="min-h-10 rounded-md border border-border bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          onChange={(event) => setSeverity(event.target.value)}
          value={severity}
        >
          <option value="">Keep severity</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <select
          className="min-h-10 rounded-md border border-border bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          onChange={(event) => setEscalationStatus(event.target.value)}
          value={escalationStatus}
        >
          <option value="">Keep escalation</option>
          <option value="NONE">None</option>
          <option value="ESCALATED">Escalated</option>
        </select>
      </div>
      <div className="mt-2">
        <ActionButton
          busy={busy}
          icon={<Save aria-hidden="true" className="h-4 w-4" />}
          label="Save review"
          onClick={handleSave}
          tone="neutral"
        />
      </div>
    </div>
  );
}

type ReviewSource = {
  escalation_status?: string | null;
  moderation_note?: string | null;
  moderation_severity?: string | null;
  moderator_note?: string | null;
  note?: string | null;
  severity?: string | null;
};

function EvidenceList({
  evidence,
  requestId
}: {
  evidence: AdminVerificationEvidence[];
  requestId: string;
}) {
  const [previewEvidenceId, setPreviewEvidenceId] = useState<string | null>(null);
  const previewItem = evidence.find((item) => item.id === previewEvidenceId) ?? null;

  if (!evidence.length) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-border bg-white px-4 py-3 text-sm font-semibold text-muted">
        No evidence files attached.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-white">
      <div className="border-b border-border px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-muted">
        Evidence files
      </div>
      <div className="divide-y divide-border">
        {evidence.map((item) => (
          <div className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center" key={item.id}>
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate text-sm font-bold text-ink">
                <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                {item.file_name ?? item.label ?? "Evidence file"}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted">
                {[item.label, item.content_type, formatFileSize(item.file_size_bytes)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {isPreviewableEvidence(item) ? (
                <button
                  className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
                  onClick={() =>
                    setPreviewEvidenceId((current) => (current === item.id ? null : item.id))
                  }
                  type="button"
                >
                  <Eye aria-hidden="true" className="h-4 w-4" />
                  {previewEvidenceId === item.id ? "Hide" : "Preview"}
                </button>
              ) : null}
              <a
                className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
                href={verificationEvidenceDownloadUrl(requestId, item.id)}
                rel="noreferrer"
                target="_blank"
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                Download
              </a>
            </div>
          </div>
        ))}
      </div>
      {previewItem ? <EvidencePreview item={previewItem} requestId={requestId} /> : null}
    </div>
  );
}

function EvidencePreview({
  item,
  requestId
}: {
  item: AdminVerificationEvidence;
  requestId: string;
}) {
  const url = verificationEvidenceDownloadUrl(requestId, item.id);
  const contentType = item.content_type ?? "";

  return (
    <div className="border-t border-border bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
        Previewing {item.file_name ?? item.label ?? "evidence"}
      </p>
      {contentType.startsWith("image/") ? (
        // Private evidence previews must use the browser session cookie directly.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={item.file_name ?? item.label ?? "Verification evidence preview"}
          className="mt-3 max-h-[420px] w-full rounded-lg border border-border bg-white object-contain"
          src={url}
        />
      ) : null}
      {contentType === "application/pdf" ? (
        <iframe
          className="mt-3 h-[420px] w-full rounded-lg border border-border bg-white"
          src={url}
          title={item.file_name ?? item.label ?? "Verification evidence PDF preview"}
        />
      ) : null}
    </div>
  );
}

function CompactFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-white px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function Notice({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-ink">
      {message}
    </div>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="mt-5 rounded-lg border border-border bg-surface p-4 text-sm font-semibold text-muted">
      {label}
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-lg border border-[#ffb7a8] bg-[#fff2ed] p-4 text-sm font-semibold text-[#b82716]">
      {message}
    </div>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-white p-4 text-sm font-semibold text-muted">
      {label}
    </div>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded-md border border-border bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
      {label}
    </span>
  );
}

function verificationName(request: AdminVerificationRequest) {
  return request.display_name ?? request.user_display_name ?? "Unknown alumni";
}

function verificationEmail(request: AdminVerificationRequest) {
  return request.email ?? request.user_email ?? "No email provided";
}

function reviewMessage(action: AdminVerificationAction) {
  if (action === "approve") {
    return "Verification request approved.";
  }
  if (action === "reject") {
    return "Verification request rejected.";
  }
  return "More information requested from the member.";
}

function truncate(value: string, maxLength = 220) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function formatFileSize(value: null | number | undefined) {
  if (typeof value !== "number") {
    return null;
  }

  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewableEvidence(item: AdminVerificationEvidence) {
  return Boolean(
    item.content_type?.startsWith("image/") || item.content_type === "application/pdf"
  );
}

function compactStrings(values: Array<null | string | undefined>) {
  return values.filter((value): value is string => Boolean(value));
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
