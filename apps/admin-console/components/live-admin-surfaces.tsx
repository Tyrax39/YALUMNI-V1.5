"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  type AdminVerificationAction,
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
  type CommunityRemovedComment,
  type CommunityRemovedCommentResponse,
  type CommunityRemovedPost,
  type CommunityRemovedPostResponse,
  type CommunityPostReportResponse,
  type DirectMessageReportResponse,
  type RemovedDirectMessage,
  type RemovedDirectMessageResponse
} from "@yalumni/frontend-shared";
import {
  CheckCircle2,
  ClipboardCheck,
  MessageSquareWarning,
  RefreshCcw,
  RotateCcw,
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

export function LiveVerificationQueue() {
  const [state, setState] = useState<VerificationState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchAdminVerificationRequests()
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
  }, [reloadKey]);

  function refreshVerificationQueue() {
    setState({ status: "loading" });
    setReloadKey((current) => current + 1);
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
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetchCommunityPostReports(),
      fetchCommunityRemovedPosts(),
      fetchCommunityRemovedComments(),
      fetchDirectMessageReports(),
      fetchRemovedDirectMessages()
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
  }, [reloadKey]);

  function refreshModerationQueues() {
    setState({ status: "loading" });
    setReloadKey((current) => current + 1);
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

      {state.status === "loading" ? <LoadingPanel label="Loading moderation queues." /> : null}
      {state.status === "error" ? <ErrorPanel message={state.message} /> : null}

      {state.status === "ready" ? (
        <div className="mt-5 grid gap-5">
          <QueuePanel
            count={state.communityReports.total}
            description="Reported posts across communities."
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
                  />
                ))
              ) : (
                <EmptyPanel label="No removed comments in this queue." />
              )}
            </QueuePanel>

            <QueuePanel
              count={state.removedMessages.total}
              description="Removed direct messages available for restoration."
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
  title
}: {
  children: ReactNode;
  count: number;
  description: string;
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
    </section>
  );
}

function CommunityReportRow({
  busyAction,
  onResolve,
  report
}: {
  busyAction: string | null;
  onResolve: (report: CommunityPostReport) => void;
  report: CommunityPostReport;
}) {
  return (
    <ModerationRow
      actions={
        <ActionButton
          busy={busyAction === `community-report:${report.id}`}
          icon={<CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
          label="Resolve"
          onClick={() => onResolve(report)}
          tone="primary"
        />
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
  report
}: {
  busyAction: string | null;
  onRemove: (report: DirectMessageReport) => void;
  onResolve: (report: DirectMessageReport) => void;
  report: DirectMessageReport;
}) {
  return (
    <ModerationRow
      actions={
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
  post
}: {
  busyAction: string | null;
  onRestore: (post: CommunityRemovedPost) => void;
  post: CommunityRemovedPost;
}) {
  return (
    <RemovedContentRow
      body={post.body || "No post preview available."}
      busy={busyAction === `post-restore:${post.id}`}
      meta={`${post.community_name ?? "Community"} · removed by ${post.removed_by_display_name ?? "unknown"}`}
      onRestore={() => onRestore(post)}
      title={post.author_display_name || "Removed post"}
    />
  );
}

function RemovedCommentRow({
  busyAction,
  comment,
  onRestore
}: {
  busyAction: string | null;
  comment: CommunityRemovedComment;
  onRestore: (comment: CommunityRemovedComment) => void;
}) {
  return (
    <RemovedContentRow
      body={comment.body || "No comment preview available."}
      busy={busyAction === `comment-restore:${comment.id}`}
      meta={`${comment.community_name ?? "Community"} · removed by ${comment.removed_by_display_name ?? "unknown"}`}
      onRestore={() => onRestore(comment)}
      title={comment.author_display_name || "Removed comment"}
    />
  );
}

function RemovedMessageRow({
  busyAction,
  item,
  onRestore
}: {
  busyAction: string | null;
  item: RemovedDirectMessage;
  onRestore: (item: RemovedDirectMessage) => void;
}) {
  return (
    <RemovedContentRow
      body={item.body || "No message preview available."}
      busy={busyAction === `message-restore:${item.id}`}
      meta={`Sender ${item.sender_display_name ?? "unknown"} · ${item.report_count ?? 0} reports`}
      onRestore={() => onRestore(item)}
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
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
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
        <div className="min-w-40">{actions}</div>
      </div>
    </article>
  );
}

function RemovedContentRow({
  body,
  busy,
  meta,
  onRestore,
  title
}: {
  body: string;
  busy: boolean;
  meta: string;
  onRestore: () => void;
  title: string;
}) {
  return (
    <article className="rounded-lg border border-border bg-white p-4">
      <h4 className="text-sm font-bold text-ink">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-muted">{truncate(body, 140)}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">{meta}</p>
      <div className="mt-3">
        <ActionButton
          busy={busy}
          icon={<RotateCcw aria-hidden="true" className="h-4 w-4" />}
          label="Restore"
          onClick={onRestore}
          tone="neutral"
        />
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

function compactStrings(values: Array<null | string | undefined>) {
  return values.filter((value): value is string => Boolean(value));
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
