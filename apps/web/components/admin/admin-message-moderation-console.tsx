"use client";

import {
  CheckCircle2,
  MessageSquareWarning,
  RefreshCcw,
  RotateCcw,
  Search,
  Trash2
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

import {
  ModerationReviewControls,
  type ModerationEscalationStatus,
  type ModerationReviewDraft,
  type ModerationSeverity
} from "@/components/admin/admin-moderation-review-controls";
import {
  ApiError,
  DirectMessageReportQueueItem,
  DirectMessageReportQueueResponse,
  listAdminDirectMessageReports,
  listAdminRemovedDirectMessages,
  removeDirectMessage,
  RemovedDirectMessageQueueItem,
  RemovedDirectMessageQueueResponse,
  resolveDirectMessageReport,
  restoreDirectMessage,
  updateDirectMessageModerationReview,
  updateDirectMessageReportReview
} from "@/lib/api";

type MessageModerationFilters = {
  escalationStatus: string;
  q: string;
  reason: string;
  removedOffset: number;
  reportOffset: number;
  reportStatus: string;
  severity: string;
};

type MessageModerationState =
  | { status: "loading" }
  | {
      status: "ready";
      removedMessages: RemovedDirectMessageQueueResponse;
      reports: DirectMessageReportQueueResponse;
    }
  | { status: "error"; message: string };

const reportPageSize = 6;
const removedPageSize = 4;
const defaultFilters: MessageModerationFilters = {
  escalationStatus: "",
  q: "",
  reason: "",
  removedOffset: 0,
  reportOffset: 0,
  reportStatus: "OPEN",
  severity: ""
};

export function AdminMessageModerationConsole({ accessToken }: { accessToken: string }) {
  const [filters, setFilters] = useState<MessageModerationFilters>(defaultFilters);
  const [qInput, setQInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");
  const [reportStatusInput, setReportStatusInput] = useState("OPEN");
  const [severityInput, setSeverityInput] = useState("");
  const [escalationStatusInput, setEscalationStatusInput] = useState("");
  const [state, setState] = useState<MessageModerationState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ModerationReviewDraft>>({});

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      listAdminDirectMessageReports(accessToken, {
        escalationStatus: filters.escalationStatus,
        limit: reportPageSize,
        offset: filters.reportOffset,
        q: filters.q,
        reason: filters.reason,
        severity: filters.severity,
        status: filters.reportStatus
      }),
      listAdminRemovedDirectMessages(accessToken, {
        escalationStatus: filters.escalationStatus,
        limit: removedPageSize,
        offset: filters.removedOffset,
        q: filters.q,
        severity: filters.severity
      })
    ])
      .then(([reports, removedMessages]) => {
        if (!isMounted) {
          return;
        }
        setState({ status: "ready", removedMessages, reports });
      })
      .catch((caught) => {
        if (!isMounted) {
          return;
        }
        setState({
          status: "error",
          message:
            caught instanceof ApiError
              ? caught.message
              : "Direct message moderation queues could not be loaded."
        });
      });

    return () => {
      isMounted = false;
    };
  }, [
    accessToken,
    filters.escalationStatus,
    filters.q,
    filters.reason,
    filters.removedOffset,
    filters.reportOffset,
    filters.reportStatus,
    filters.severity,
    reloadKey
  ]);

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setState({ status: "loading" });
    setFilters({
      escalationStatus: escalationStatusInput,
      q: qInput.trim(),
      reason: reasonInput,
      removedOffset: 0,
      reportOffset: 0,
      reportStatus: reportStatusInput,
      severity: severityInput
    });
  }

  function clearFilters() {
    setQInput("");
    setReasonInput("");
    setReportStatusInput("OPEN");
    setSeverityInput("");
    setEscalationStatusInput("");
    setMessage(null);
    setState({ status: "loading" });
    setFilters(defaultFilters);
  }

  function refreshQueues() {
    setMessage(null);
    setState({ status: "loading" });
    setReloadKey((current) => current + 1);
  }

  function updateReviewDraft(key: string, draft: ModerationReviewDraft) {
    setReviewDrafts((current) => ({ ...current, [key]: draft }));
  }

  async function handleSaveReportReview(
    report: DirectMessageReportQueueItem,
    draft: ModerationReviewDraft
  ) {
    const key = reviewKey("report", report.id);
    setBusyAction(`review:${key}`);
    setMessage(null);
    try {
      await updateDirectMessageReportReview(accessToken, report.id, {
        escalation_status: draft.escalationStatus,
        moderator_note: draft.moderatorNote,
        severity: draft.severity
      });
      setMessage("Message report review saved.");
      setReloadKey((current) => current + 1);
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Report review could not be saved.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveMessageReview(
    item: RemovedDirectMessageQueueItem,
    draft: ModerationReviewDraft
  ) {
    const key = reviewKey("message", item.id);
    setBusyAction(`review:${key}`);
    setMessage(null);
    try {
      await updateDirectMessageModerationReview(accessToken, item.id, {
        escalation_status: draft.escalationStatus,
        moderator_note: draft.moderatorNote,
        severity: draft.severity
      });
      setMessage("Removed message review saved.");
      setReloadKey((current) => current + 1);
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Message review could not be saved.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleResolveReport(report: DirectMessageReportQueueItem) {
    setBusyAction(`report:${report.id}`);
    setMessage(null);
    try {
      await resolveDirectMessageReport(accessToken, report.id);
      setMessage("Message report resolved.");
      setReloadKey((current) => current + 1);
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Report could not be resolved.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRemoveReportedMessage(
    report: DirectMessageReportQueueItem,
    draft: ModerationReviewDraft
  ) {
    setBusyAction(`remove:${report.message_id}`);
    setMessage(null);
    try {
      await removeDirectMessage(accessToken, report.message_id, {
        escalation_status: draft.escalationStatus,
        moderator_note: draft.moderatorNote,
        severity: draft.severity
      });
      setMessage("Reported message removed.");
      setReloadKey((current) => current + 1);
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Message could not be removed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRestoreMessage(item: RemovedDirectMessageQueueItem) {
    setBusyAction(`message:${item.id}`);
    setMessage(null);
    try {
      await restoreDirectMessage(accessToken, item.id);
      setMessage("Message restored.");
      setReloadKey((current) => current + 1);
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Message could not be restored.");
    } finally {
      setBusyAction(null);
    }
  }

  const totals =
    state.status === "ready" ? state.reports.total + state.removedMessages.total : null;

  return (
    <section className="mt-10 rounded-lg border border-border bg-white p-6 shadow-soft">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Message moderation</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Review direct message reports, remove unsafe messages, and restore resolved content.
          </p>
        </div>
        <button
          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
          onClick={refreshQueues}
          type="button"
        >
          <RefreshCcw aria-hidden="true" className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <form
        className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-7"
        onSubmit={handleFilterSubmit}
      >
        <ModerationInput
          label="Search"
          onChange={setQInput}
          placeholder="Message or note"
          value={qInput}
        />
        <ModerationSelect
          label="Reason"
          onChange={setReasonInput}
          options={[
            ["", "Any"],
            ["SPAM", "Spam"],
            ["HARASSMENT", "Harassment"],
            ["IMPERSONATION", "Impersonation"],
            ["UNSAFE_CONTENT", "Unsafe content"],
            ["OTHER", "Other"]
          ]}
          value={reasonInput}
        />
        <ModerationSelect
          label="Reports"
          onChange={setReportStatusInput}
          options={[
            ["OPEN", "Open"],
            ["RESOLVED", "Resolved"],
            ["ALL", "All"]
          ]}
          value={reportStatusInput}
        />
        <ModerationSelect
          label="Severity"
          onChange={setSeverityInput}
          options={[
            ["", "Any"],
            ["LOW", "Low"],
            ["MEDIUM", "Medium"],
            ["HIGH", "High"],
            ["CRITICAL", "Critical"]
          ]}
          value={severityInput}
        />
        <ModerationSelect
          label="Escalation"
          onChange={setEscalationStatusInput}
          options={[
            ["", "Any"],
            ["NONE", "None"],
            ["ESCALATED", "Escalated"]
          ]}
          value={escalationStatusInput}
        />
        <button
          className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 self-end rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#003d7d]"
          type="submit"
        >
          <Search aria-hidden="true" className="h-4 w-4" />
          Filter
        </button>
        <button
          className="focus-ring min-h-12 self-end rounded-lg border border-border bg-white px-5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
          onClick={clearFilters}
          type="button"
        >
          Clear
        </button>
      </form>

      {message ? (
        <p className="mt-5 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-muted">
          {message}
        </p>
      ) : null}

      {state.status === "loading" ? (
        <p className="mt-6 text-sm font-semibold text-muted">Loading message queues...</p>
      ) : null}

      {state.status === "error" ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.message}
        </p>
      ) : null}

      {state.status === "ready" ? (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ModerationMetric label="Open or filtered reports" value={state.reports.total} />
            <ModerationMetric label="Removed messages" value={state.removedMessages.total} />
          </div>
          <p className="mt-4 text-sm font-semibold text-muted">
            {totals === 0
              ? "No message moderation items match these filters."
              : `${totals} total item${totals === 1 ? "" : "s"} in this view.`}
          </p>

          <div className="mt-6 grid gap-6">
            <MessageReportQueue
              busyAction={busyAction}
              onDraftChange={updateReviewDraft}
              onPage={(offset) =>
                setFilters((current) => ({ ...current, reportOffset: offset }))
              }
              onRemoveMessage={handleRemoveReportedMessage}
              onResolve={handleResolveReport}
              onSaveReview={handleSaveReportReview}
              reports={state.reports}
              reviewDrafts={reviewDrafts}
            />
            <RemovedMessageQueue
              busyAction={busyAction}
              messages={state.removedMessages}
              onDraftChange={updateReviewDraft}
              onPage={(offset) =>
                setFilters((current) => ({ ...current, removedOffset: offset }))
              }
              onRestore={handleRestoreMessage}
              onSaveReview={handleSaveMessageReview}
              reviewDrafts={reviewDrafts}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}

function MessageReportQueue({
  busyAction,
  onDraftChange,
  onPage,
  onRemoveMessage,
  onResolve,
  onSaveReview,
  reports,
  reviewDrafts
}: {
  busyAction: string | null;
  onDraftChange: (key: string, draft: ModerationReviewDraft) => void;
  onPage: (offset: number) => void;
  onRemoveMessage: (report: DirectMessageReportQueueItem, draft: ModerationReviewDraft) => void;
  onResolve: (report: DirectMessageReportQueueItem) => void;
  onSaveReview: (report: DirectMessageReportQueueItem, draft: ModerationReviewDraft) => void;
  reports: DirectMessageReportQueueResponse;
  reviewDrafts: Record<string, ModerationReviewDraft>;
}) {
  return (
    <ModerationQueueFrame
      count={reports.total}
      description="Direct messages reported by conversation participants."
      onPage={onPage}
      pageSize={reports.limit}
      title="Reported messages"
      visibleCount={reports.reports.length}
      visibleOffset={reports.offset}
    >
      {reports.reports.length === 0 ? (
        <EmptyQueue label="No message reports match these filters." />
      ) : null}
      {reports.reports.map((report) => {
        const key = reviewKey("report", report.id);
        const draft = reviewDrafts[key] ?? reviewDraftFromReport(report);
        const canRemove = report.message_status === "ACTIVE";
        return (
          <article className="rounded-lg border border-border bg-white p-4" key={report.id}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  {report.reason} · {formatStatus(report.status)}
                </p>
                <h3 className="mt-2 font-display text-lg font-semibold text-ink">
                  {report.sender_display_name}
                </h3>
                <ReviewSummary
                  escalationStatus={report.escalation_status}
                  severity={report.severity}
                />
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                  {report.message_body}
                </p>
                {report.note ? (
                  <p className="mt-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-6 text-muted">
                    {report.note}
                  </p>
                ) : null}
                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <QueueDetail label="Reporter" value={report.reporter_display_name} />
                  <QueueDetail label="Message" value={formatDate(report.message_sent_at)} />
                  <QueueDetail label="Reported" value={formatDate(report.created_at)} />
                </dl>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button
                  className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-semibold text-danger transition hover:border-danger disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={Boolean(busyAction) || !canRemove}
                  onClick={() => onRemoveMessage(report, draft)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  {busyAction === `remove:${report.message_id}` ? "Removing..." : "Remove"}
                </button>
                <button
                  className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={Boolean(busyAction) || report.status !== "OPEN"}
                  onClick={() => onResolve(report)}
                  type="button"
                >
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  {busyAction === `report:${report.id}` ? "Resolving..." : "Resolve"}
                </button>
              </div>
            </div>
            <ModerationReviewControls
              busy={busyAction === `review:${key}`}
              draft={draft}
              onChange={(nextDraft) => onDraftChange(key, nextDraft)}
              onSave={() => onSaveReview(report, draft)}
            />
          </article>
        );
      })}
    </ModerationQueueFrame>
  );
}

function RemovedMessageQueue({
  busyAction,
  messages,
  onDraftChange,
  onPage,
  onRestore,
  onSaveReview,
  reviewDrafts
}: {
  busyAction: string | null;
  messages: RemovedDirectMessageQueueResponse;
  onDraftChange: (key: string, draft: ModerationReviewDraft) => void;
  onPage: (offset: number) => void;
  onRestore: (item: RemovedDirectMessageQueueItem) => void;
  onSaveReview: (item: RemovedDirectMessageQueueItem, draft: ModerationReviewDraft) => void;
  reviewDrafts: Record<string, ModerationReviewDraft>;
}) {
  return (
    <ModerationQueueFrame
      count={messages.total}
      description="Messages hidden from participant views by a moderator."
      onPage={onPage}
      pageSize={messages.limit}
      title="Removed messages"
      visibleCount={messages.messages.length}
      visibleOffset={messages.offset}
    >
      {messages.messages.length === 0 ? (
        <EmptyQueue label="No removed messages match these filters." />
      ) : null}
      {messages.messages.map((item) => {
        const key = reviewKey("message", item.id);
        const draft = reviewDrafts[key] ?? reviewDraftFromMessage(item);
        return (
          <article className="rounded-lg border border-border bg-white p-4" key={item.id}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Removed message
                </p>
                <h3 className="mt-2 font-display text-lg font-semibold text-ink">
                  {item.sender_display_name}
                </h3>
                <ReviewSummary
                  escalationStatus={item.escalation_status}
                  severity={item.moderation_severity}
                />
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                  {item.body}
                </p>
                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <QueueDetail label="Removed by" value={item.removed_by_display_name} />
                  <QueueDetail
                    label="Removed"
                    value={item.removed_at ? formatDate(item.removed_at) : "Not captured"}
                  />
                  <QueueDetail label="Reports" value={String(item.report_count)} />
                </dl>
              </div>
              <button
                className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={Boolean(busyAction)}
                onClick={() => onRestore(item)}
                type="button"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                {busyAction === `message:${item.id}` ? "Restoring..." : "Restore"}
              </button>
            </div>
            <ModerationReviewControls
              busy={busyAction === `review:${key}`}
              draft={draft}
              onChange={(nextDraft) => onDraftChange(key, nextDraft)}
              onSave={() => onSaveReview(item, draft)}
            />
          </article>
        );
      })}
    </ModerationQueueFrame>
  );
}

function ModerationQueueFrame({
  children,
  count,
  description,
  onPage,
  pageSize,
  title,
  visibleCount,
  visibleOffset
}: {
  children: ReactNode;
  count: number;
  description: string;
  onPage: (offset: number) => void;
  pageSize: number;
  title: string;
  visibleCount: number;
  visibleOffset: number;
}) {
  const canPageBackward = visibleOffset > 0;
  const canPageForward = visibleOffset + pageSize < count;
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        </div>
        <p className="text-sm font-semibold text-primary">
          {count} item{count === 1 ? "" : "s"}
        </p>
      </div>
      <div className="mt-4 grid gap-3">{children}</div>
      <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 text-sm font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          {count === 0
            ? "No items"
            : `Showing ${visibleOffset + 1}-${visibleOffset + visibleCount} of ${count}`}
        </p>
        <div className="flex gap-2">
          <button
            className="focus-ring min-h-10 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canPageBackward}
            onClick={() => onPage(Math.max(0, visibleOffset - pageSize))}
            type="button"
          >
            Previous
          </button>
          <button
            className="focus-ring min-h-10 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canPageForward}
            onClick={() => onPage(visibleOffset + pageSize)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function ModerationInput({
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

function ModerationSelect({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: [string, string][];
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <select
        className="h-12 rounded-lg border border-border bg-white px-4 text-sm font-normal text-ink outline-none transition focus:border-primary"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue || "ANY"} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModerationMetric({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border border-border bg-white p-4">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-primary">{value}</p>
    </article>
  );
}

function EmptyQueue({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-5 text-sm font-semibold text-muted">
      <MessageSquareWarning aria-hidden="true" className="h-4 w-4 text-primary" />
      {label}
    </p>
  );
}

function ReviewSummary({
  escalationStatus,
  severity
}: {
  escalationStatus: string | null;
  severity: string | null;
}) {
  const normalizedSeverity = normalizeSeverity(severity);
  const normalizedEscalation = normalizeEscalationStatus(escalationStatus);
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <span className="rounded-lg border border-border bg-white px-3 py-1 text-xs font-semibold text-muted">
        Severity: {formatStatus(normalizedSeverity)}
      </span>
      <span
        className={
          normalizedEscalation === "ESCALATED"
            ? "rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"
            : "rounded-lg border border-border bg-white px-3 py-1 text-xs font-semibold text-muted"
        }
      >
        {normalizedEscalation === "ESCALATED" ? "Escalated" : "Not escalated"}
      </span>
    </div>
  );
}

function QueueDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-ink">{value}</dd>
    </div>
  );
}

function reviewKey(kind: "message" | "report", id: string) {
  return `${kind}:${id}`;
}

function reviewDraftFromReport(report: DirectMessageReportQueueItem): ModerationReviewDraft {
  return {
    escalationStatus: normalizeEscalationStatus(report.escalation_status),
    moderatorNote: report.moderator_note ?? "",
    severity: normalizeSeverity(report.severity)
  };
}

function reviewDraftFromMessage(item: RemovedDirectMessageQueueItem): ModerationReviewDraft {
  return {
    escalationStatus: normalizeEscalationStatus(item.escalation_status),
    moderatorNote: item.moderation_note ?? "",
    severity: normalizeSeverity(item.moderation_severity)
  };
}

function normalizeSeverity(value: string | null): ModerationSeverity {
  if (value === "CRITICAL" || value === "HIGH" || value === "LOW" || value === "MEDIUM") {
    return value;
  }
  return "MEDIUM";
}

function normalizeEscalationStatus(value: string | null): ModerationEscalationStatus {
  return value === "ESCALATED" ? "ESCALATED" : "NONE";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
