"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import {
  AdminOverview,
  AdminAuditEvent,
  adminRoles,
  ApiError,
  downloadVerificationEvidence,
  getAdminAuditEvents,
  getAdminOverview,
  getAdminVerificationRequests,
  reviewVerificationRequest,
  VerificationRequest,
  VerificationReviewAction
} from "@/lib/api";

const upcomingQueues = [
  ["User management", "Assign roles, review account status, and audit sensitive changes."],
  ["Moderation", "Resolve reports for posts, profiles, messages, events, and communities."],
  ["Governance", "Prepare contribution, election, and audit workflows for later phases."]
] as const;

type OverviewState =
  | { status: "loading" }
  | { status: "ready"; overview: AdminOverview }
  | { status: "error"; message: string };

type QueueState =
  | { status: "loading" }
  | { status: "ready"; requests: VerificationRequest[] }
  | { status: "error"; message: string };

type AuditState =
  | { status: "loading" }
  | { status: "ready"; events: AdminAuditEvent[]; limit: number; offset: number; total: number }
  | { status: "error"; message: string };

type AuditFilters = {
  eventType: string;
  offset: number;
  userId: string;
};

const auditLimit = 25;

export function AdminConsole() {
  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link className="focus-ring rounded-lg" href="/">
            <Image
              alt="YALUMNI"
              className="block h-auto w-[132px] object-contain sm:w-[156px]"
              height={34}
              priority
              src="/brand/yalumni-logo-horizontal.svg"
              width={156}
            />
          </Link>
          <Link className="text-sm font-semibold text-primary" href="/dashboard">
            Member dashboard
          </Link>
        </div>
      </header>
      <ProtectedRoute
        allowLocalAdminBootstrap
        description="Admin queues require a platform, verification, moderation, finance, election, or super-admin role."
        requiredRoles={adminRoles}
        title="Admin console"
      >
        {({ accessToken, user }) => (
          <AdminOverviewPanel accessToken={accessToken} email={user.email} />
        )}
      </ProtectedRoute>
    </main>
  );
}

function AdminOverviewPanel({ accessToken, email }: { accessToken: string; email: string }) {
  const [state, setState] = useState<OverviewState>({ status: "loading" });

  useEffect(() => {
    getAdminOverview(accessToken)
      .then((overview) => setState({ status: "ready", overview }))
      .catch(() =>
        setState({
          status: "error",
          message: "The admin overview could not be loaded for this session."
        })
      );
  }, [accessToken]);

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
        Admin console
      </p>
      <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold text-ink">
        Operational queues for verification, trust, and governance.
      </h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
        Signed in as {email}. This route now checks live API permissions before showing privileged
        workflow data.
      </p>

      {state.status === "loading" ? (
        <div className="mt-10 rounded-lg border border-border bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold text-muted">Loading admin overview...</p>
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="mt-10 rounded-lg border border-red-200 bg-red-50 p-6 shadow-soft">
          <p className="text-sm font-semibold text-red-700">{state.message}</p>
        </div>
      ) : null}

      {state.status === "ready" ? (
        <>
          <div className="mt-10 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            <MetricCard label="Total users" value={state.overview.total_users} />
            <MetricCard label="Verified" value={state.overview.verified_users} />
            <MetricCard label="Unverified" value={state.overview.unverified_users} />
            <MetricCard label="Active sessions" value={state.overview.active_sessions} />
            <MetricCard label="Admins" value={state.overview.admin_users} />
          </div>

          <VerificationQueuePanel accessToken={accessToken} />
          <AuditLogPanel accessToken={accessToken} />

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {upcomingQueues.map(([title, body]) => (
              <article className="rounded-lg border border-border bg-white p-6 shadow-soft" key={title}>
                <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-lg border border-border bg-white p-6 shadow-soft">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">
                  Latest security events
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Recent auth and role-sensitive actions for audit visibility.
                </p>
              </div>
              <p className="text-sm font-semibold text-primary">
                Pending email verification: {state.overview.pending_verification_users}
              </p>
            </div>
            <div className="mt-5 divide-y divide-border">
              {state.overview.latest_security_events.map((event) => (
                <div className="grid gap-2 py-4 text-sm sm:grid-cols-[1fr_auto]" key={event.id}>
                  <p className="font-semibold text-ink">{event.event_type.replaceAll("_", " ")}</p>
                  <time className="text-muted" dateTime={event.created_at}>
                    {new Date(event.created_at).toLocaleString()}
                  </time>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function AuditLogPanel({ accessToken }: { accessToken: string }) {
  const [state, setState] = useState<AuditState>({ status: "loading" });
  const [eventTypeInput, setEventTypeInput] = useState("");
  const [userIdInput, setUserIdInput] = useState("");
  const [filters, setFilters] = useState<AuditFilters>({
    eventType: "",
    offset: 0,
    userId: ""
  });

  useEffect(() => {
    let isMounted = true;

    getAdminAuditEvents(accessToken, {
      eventType: filters.eventType,
      limit: auditLimit,
      offset: filters.offset,
      userId: filters.userId
    })
      .then((response) => {
        if (!isMounted) {
          return;
        }
        setState({
          status: "ready",
          events: response.events,
          limit: response.limit,
          offset: response.offset,
          total: response.total
        });
      })
      .catch((caught) => {
        if (!isMounted) {
          return;
        }
        setState({
          status: "error",
          message: caught instanceof ApiError ? caught.message : "Audit log could not be loaded."
        });
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, filters.eventType, filters.offset, filters.userId]);

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "loading" });
    setFilters({
      eventType: eventTypeInput.trim(),
      offset: 0,
      userId: userIdInput.trim()
    });
  }

  function clearFilters() {
    setEventTypeInput("");
    setUserIdInput("");
    setState({ status: "loading" });
    setFilters({ eventType: "", offset: 0, userId: "" });
  }

  const canPageBackward = state.status === "ready" && state.offset > 0;
  const canPageForward =
    state.status === "ready" && state.offset + state.limit < state.total;

  return (
    <section className="mt-10 rounded-lg border border-border bg-white p-6 shadow-soft">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Audit log</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Inspect recorded auth, session, profile, verification, and admin-sensitive events.
          </p>
        </div>
        {state.status === "ready" ? (
          <p className="text-sm font-semibold text-primary">
            Showing {state.events.length} of {state.total}
          </p>
        ) : null}
      </div>

      <form
        className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]"
        onSubmit={handleFilterSubmit}
      >
        <AuditInput
          label="Event type"
          onChange={setEventTypeInput}
          placeholder="auth.login or verification"
          value={eventTypeInput}
        />
        <AuditInput
          label="User ID"
          onChange={setUserIdInput}
          placeholder="UUID"
          value={userIdInput}
        />
        <button
          className="focus-ring h-12 self-end rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#003d7d]"
          type="submit"
        >
          Filter
        </button>
        <button
          className="focus-ring h-12 self-end rounded-lg border border-border bg-white px-5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
          onClick={clearFilters}
          type="button"
        >
          Clear
        </button>
      </form>

      {state.status === "loading" ? (
        <p className="mt-6 text-sm font-semibold text-muted">Loading audit events...</p>
      ) : null}

      {state.status === "error" ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.message}
        </p>
      ) : null}

      {state.status === "ready" ? (
        <>
          <div className="mt-5 divide-y divide-border">
            {state.events.length === 0 ? (
              <p className="py-6 text-sm font-semibold text-muted">
                No audit events match the current filters.
              </p>
            ) : null}
            {state.events.map((event) => (
              <AuditEventRow event={event} key={event.id} />
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted">
              Offset {state.offset} · Page size {state.limit}
            </p>
            <div className="flex gap-2">
              <button
                className="focus-ring rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canPageBackward}
                onClick={() => {
                  setState({ status: "loading" });
                  setFilters((current) => ({
                    ...current,
                    offset: Math.max(current.offset - auditLimit, 0)
                  }));
                }}
                type="button"
              >
                Previous
              </button>
              <button
                className="focus-ring rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canPageForward}
                onClick={() => {
                  setState({ status: "loading" });
                  setFilters((current) => ({
                    ...current,
                    offset: current.offset + auditLimit
                  }));
                }}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function AuditInput({
  label,
  onChange,
  placeholder,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <input
        className="h-12 rounded-lg border border-border bg-white px-4 text-sm font-normal text-ink outline-none transition focus:border-primary"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function AuditEventRow({ event }: { event: AdminAuditEvent }) {
  const userLabel =
    event.user_display_name || event.user_email || event.user_id || "System / unknown user";
  const metadata = event.metadata ? JSON.stringify(event.metadata) : null;

  return (
    <article className="grid gap-4 py-4 xl:grid-cols-[0.8fr_1.2fr_0.8fr]">
      <div>
        <p className="font-semibold text-ink">{event.event_type}</p>
        <time className="mt-1 block text-sm text-muted" dateTime={event.created_at}>
          {new Date(event.created_at).toLocaleString()}
        </time>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{userLabel}</p>
        {event.user_email ? (
          <p className="mt-1 break-all text-sm text-muted">{event.user_email}</p>
        ) : null}
        {metadata ? (
          <p className="mt-2 break-all rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs leading-5 text-muted">
            {metadata}
          </p>
        ) : null}
      </div>
      <dl className="grid gap-2 text-sm">
        <AuditDetail label="IP" value={event.ip_address ?? "Not captured"} />
        <AuditDetail label="User agent" value={event.user_agent ?? "Not captured"} />
      </dl>
    </article>
  );
}

function AuditDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-ink">{value}</dd>
    </div>
  );
}

function VerificationQueuePanel({ accessToken }: { accessToken: string }) {
  const [state, setState] = useState<QueueState>({ status: "loading" });
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    reloadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function reloadQueue() {
    setState({ status: "loading" });
    try {
      const response = await getAdminVerificationRequests(accessToken);
      setState({ status: "ready", requests: response.requests });
    } catch (caught) {
      setState({
        status: "error",
        message:
          caught instanceof ApiError
            ? caught.message
            : "Verification queue could not be loaded."
      });
    }
  }

  function updateReviewNote(requestId: string, value: string) {
    setReviewNotes((current) => ({ ...current, [requestId]: value }));
  }

  async function handleReview(request: VerificationRequest, action: VerificationReviewAction) {
    const actionKey = `${request.id}:${action}`;
    setBusyAction(actionKey);
    setMessage(null);
    try {
      const reviewed = await reviewVerificationRequest(
        accessToken,
        request.id,
        action,
        reviewNotes[request.id]
      );
      setState((current) =>
        current.status === "ready"
          ? {
              status: "ready",
              requests: current.requests.filter((item) => item.id !== request.id)
            }
          : current
      );
      setMessage(`${reviewed.display_name} marked ${formatStatus(reviewed.status)}.`);
    } catch (caught) {
      setMessage(
        caught instanceof ApiError ? caught.message : "Verification request could not be reviewed."
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="mt-10 rounded-lg border border-border bg-white p-6 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Verification queue</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Review completed member profiles, grant verified alumni access, reject mismatches, or
            request clearer evidence.
          </p>
        </div>
        <button
          className="focus-ring rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
          onClick={reloadQueue}
          type="button"
        >
          Refresh
        </button>
      </div>

      {message ? (
        <p className="mt-5 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-muted">
          {message}
        </p>
      ) : null}

      {state.status === "loading" ? (
        <p className="mt-6 text-sm font-semibold text-muted">Loading verification queue...</p>
      ) : null}

      {state.status === "error" ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.message}
        </p>
      ) : null}

      {state.status === "ready" ? (
        <div className="mt-5 divide-y divide-border">
          {state.requests.length === 0 ? (
            <p className="py-6 text-sm font-semibold text-muted">
              No verification requests are waiting for review.
            </p>
          ) : null}
          {state.requests.map((request) => (
            <VerificationQueueRow
              accessToken={accessToken}
              busyAction={busyAction}
              key={request.id}
              onReview={handleReview}
              onReviewNoteChange={updateReviewNote}
              request={request}
              reviewNote={reviewNotes[request.id] ?? ""}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function VerificationQueueRow({
  accessToken,
  busyAction,
  onReview,
  onReviewNoteChange,
  request,
  reviewNote
}: {
  accessToken: string;
  busyAction: string | null;
  onReview: (request: VerificationRequest, action: VerificationReviewAction) => void;
  onReviewNoteChange: (requestId: string, value: string) => void;
  request: VerificationRequest;
  reviewNote: string;
}) {
  const snapshot = request.profile_snapshot;
  const programs = snapshot.program_affiliations ?? [];
  const [openingEvidenceId, setOpeningEvidenceId] = useState<string | null>(null);
  const [evidenceMessage, setEvidenceMessage] = useState<string | null>(null);

  async function handleOpenEvidence(evidenceId: string) {
    setOpeningEvidenceId(evidenceId);
    setEvidenceMessage(null);
    try {
      const blob = await downloadVerificationEvidence(accessToken, request.id, evidenceId);
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 30_000);
    } catch (caught) {
      setEvidenceMessage(
        caught instanceof ApiError ? caught.message : "Evidence file could not be opened."
      );
    } finally {
      setOpeningEvidenceId(null);
    }
  }

  return (
    <article className="grid gap-5 py-6 xl:grid-cols-[1fr_0.55fr]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-xl font-semibold text-ink">{request.display_name}</h3>
          <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-secondary">
            {formatStatus(request.status)}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">{request.email}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <QueueDetail label="Completion" value={`${snapshot.completion_percentage ?? 0}%`} />
          <QueueDetail label="Country" value={snapshot.country ?? "Not set"} />
          <QueueDetail label="Sector" value={snapshot.sector ?? "Not set"} />
          <QueueDetail label="Organization" value={snapshot.organization ?? "Not set"} />
          <QueueDetail label="Role" value={snapshot.job_title ?? "Not set"} />
          <QueueDetail label="Submitted" value={new Date(request.created_at).toLocaleString()} />
        </dl>
        {programs.length > 0 ? (
          <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Program record
            </p>
            {programs.map((program) => (
              <p className="mt-2 text-sm font-semibold text-ink" key={program.program_name}>
                {[program.program_name, program.cohort_year, program.city, program.country]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ))}
          </div>
        ) : null}
        {request.submitted_note ? (
          <p className="mt-4 rounded-lg border border-border bg-white px-4 py-3 text-sm leading-6 text-muted">
            {request.submitted_note}
          </p>
        ) : null}
        <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Evidence
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {request.evidence.length} file{request.evidence.length === 1 ? "" : "s"} attached
              </p>
            </div>
            {evidenceMessage ? (
              <p className="text-sm font-semibold text-danger">{evidenceMessage}</p>
            ) : null}
          </div>
          {request.evidence.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {request.evidence.map((evidence) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  key={evidence.id}
                >
                  <div>
                    <p className="font-semibold text-ink">
                      {evidence.label || evidence.file_name}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-muted">
                      {evidence.content_type} · {formatBytes(evidence.file_size_bytes)}
                    </p>
                  </div>
                  <button
                    className="focus-ring rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={Boolean(openingEvidenceId)}
                    onClick={() => handleOpenEvidence(evidence.id)}
                    type="button"
                  >
                    {openingEvidenceId === evidence.id ? "Opening..." : "Open"}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Reviewer note
          <textarea
            className="min-h-24 rounded-lg border border-border bg-white px-4 py-3 text-sm font-normal leading-6 text-ink outline-none transition focus:border-primary"
            onChange={(event) => onReviewNoteChange(request.id, event.target.value)}
            placeholder="Add an audit note for this decision."
            value={reviewNote}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <ReviewButton
            action="approve"
            busyAction={busyAction}
            label="Approve"
            onClick={() => onReview(request, "approve")}
            requestId={request.id}
            tone="primary"
          />
          <ReviewButton
            action="request-info"
            busyAction={busyAction}
            label="Request info"
            onClick={() => onReview(request, "request-info")}
            requestId={request.id}
            tone="neutral"
          />
          <ReviewButton
            action="reject"
            busyAction={busyAction}
            label="Reject"
            onClick={() => onReview(request, "reject")}
            requestId={request.id}
            tone="danger"
          />
        </div>
      </div>
    </article>
  );
}

function QueueDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}

function ReviewButton({
  action,
  busyAction,
  label,
  onClick,
  requestId,
  tone
}: {
  action: VerificationReviewAction;
  busyAction: string | null;
  label: string;
  onClick: () => void;
  requestId: string;
  tone: "danger" | "neutral" | "primary";
}) {
  const isBusy = busyAction === `${requestId}:${action}`;
  const toneClass =
    tone === "primary"
      ? "bg-primary text-white hover:bg-[#003d7d]"
      : tone === "danger"
        ? "border border-red-200 text-danger hover:border-danger"
        : "border border-border text-ink hover:border-primary hover:text-primary";

  return (
    <button
      className={`focus-ring inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClass}`}
      disabled={Boolean(busyAction)}
      onClick={onClick}
      type="button"
    >
      {isBusy ? "Working..." : label}
    </button>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-3 font-display text-3xl font-bold text-primary">{value}</p>
    </article>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
