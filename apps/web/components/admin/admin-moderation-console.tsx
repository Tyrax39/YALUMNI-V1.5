"use client";

import {
  CheckCircle2,
  MessageSquareWarning,
  RefreshCcw,
  RotateCcw,
  Search
} from "lucide-react";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

import {
  ApiError,
  CommunityAdminPostReportQueueItem,
  CommunityAdminPostReportQueueResponse,
  CommunityAdminRemovedCommentQueueItem,
  CommunityAdminRemovedCommentQueueResponse,
  CommunityAdminRemovedPostQueueItem,
  CommunityAdminRemovedPostQueueResponse,
  listAdminCommunityPostReportQueue,
  listAdminCommunityRemovedComments,
  listAdminCommunityRemovedPosts,
  resolveCommunityPostReport,
  restoreCommunityPost,
  restoreCommunityPostComment
} from "@/lib/api";

type ModerationFilters = {
  communityId: string;
  q: string;
  reason: string;
  removedCommentOffset: number;
  removedPostOffset: number;
  reportOffset: number;
  reportStatus: string;
};

type ModerationState =
  | { status: "loading" }
  | {
      status: "ready";
      removedComments: CommunityAdminRemovedCommentQueueResponse;
      removedPosts: CommunityAdminRemovedPostQueueResponse;
      reports: CommunityAdminPostReportQueueResponse;
    }
  | { status: "error"; message: string };

const moderationReportPageSize = 6;
const removedContentPageSize = 4;
const defaultFilters: ModerationFilters = {
  communityId: "",
  q: "",
  reason: "",
  removedCommentOffset: 0,
  removedPostOffset: 0,
  reportOffset: 0,
  reportStatus: "OPEN"
};

export function AdminModerationConsole({ accessToken }: { accessToken: string }) {
  const [filters, setFilters] = useState<ModerationFilters>(defaultFilters);
  const [qInput, setQInput] = useState("");
  const [communityIdInput, setCommunityIdInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");
  const [reportStatusInput, setReportStatusInput] = useState("OPEN");
  const [state, setState] = useState<ModerationState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      listAdminCommunityPostReportQueue(accessToken, {
        communityId: filters.communityId,
        limit: moderationReportPageSize,
        offset: filters.reportOffset,
        q: filters.q,
        reason: filters.reason,
        status: filters.reportStatus
      }),
      listAdminCommunityRemovedPosts(accessToken, {
        communityId: filters.communityId,
        limit: removedContentPageSize,
        offset: filters.removedPostOffset,
        q: filters.q
      }),
      listAdminCommunityRemovedComments(accessToken, {
        communityId: filters.communityId,
        limit: removedContentPageSize,
        offset: filters.removedCommentOffset,
        q: filters.q
      })
    ])
      .then(([reports, removedPosts, removedComments]) => {
        if (!isMounted) {
          return;
        }
        setState({ status: "ready", removedComments, removedPosts, reports });
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
              : "Platform moderation queues could not be loaded."
        });
      });

    return () => {
      isMounted = false;
    };
  }, [
    accessToken,
    filters.communityId,
    filters.q,
    filters.reason,
    filters.removedCommentOffset,
    filters.removedPostOffset,
    filters.reportOffset,
    filters.reportStatus,
    reloadKey
  ]);

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setState({ status: "loading" });
    setFilters({
      communityId: communityIdInput.trim(),
      q: qInput.trim(),
      reason: reasonInput,
      removedCommentOffset: 0,
      removedPostOffset: 0,
      reportOffset: 0,
      reportStatus: reportStatusInput
    });
  }

  function clearFilters() {
    setQInput("");
    setCommunityIdInput("");
    setReasonInput("");
    setReportStatusInput("OPEN");
    setMessage(null);
    setState({ status: "loading" });
    setFilters(defaultFilters);
  }

  function refreshQueues() {
    setMessage(null);
    setState({ status: "loading" });
    setReloadKey((current) => current + 1);
  }

  async function handleResolveReport(report: CommunityAdminPostReportQueueItem) {
    setBusyAction(`report:${report.id}`);
    setMessage(null);
    try {
      await resolveCommunityPostReport(accessToken, report.community_id, report.post_id, report.id);
      setMessage("Report resolved.");
      setFilters((current) => ({
        ...current,
        reportOffset:
          state.status === "ready" && state.reports.reports.length === 1
            ? Math.max(0, current.reportOffset - moderationReportPageSize)
            : current.reportOffset
      }));
      setReloadKey((current) => current + 1);
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Report could not be resolved.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRestorePost(post: CommunityAdminRemovedPostQueueItem) {
    setBusyAction(`post:${post.id}`);
    setMessage(null);
    try {
      await restoreCommunityPost(accessToken, post.community_id, post.id);
      setMessage("Post restored to the active feed.");
      setFilters((current) => ({
        ...current,
        removedPostOffset:
          state.status === "ready" && state.removedPosts.posts.length === 1
            ? Math.max(0, current.removedPostOffset - removedContentPageSize)
            : current.removedPostOffset
      }));
      setReloadKey((current) => current + 1);
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Post could not be restored.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRestoreComment(comment: CommunityAdminRemovedCommentQueueItem) {
    setBusyAction(`comment:${comment.id}`);
    setMessage(null);
    try {
      await restoreCommunityPostComment(
        accessToken,
        comment.community_id,
        comment.post_id,
        comment.id
      );
      setMessage("Comment restored.");
      setFilters((current) => ({
        ...current,
        removedCommentOffset:
          state.status === "ready" && state.removedComments.comments.length === 1
            ? Math.max(0, current.removedCommentOffset - removedContentPageSize)
            : current.removedCommentOffset
      }));
      setReloadKey((current) => current + 1);
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Comment could not be restored.");
    } finally {
      setBusyAction(null);
    }
  }

  const totals =
    state.status === "ready"
      ? state.reports.total + state.removedPosts.total + state.removedComments.total
      : null;

  return (
    <section className="mt-10 rounded-lg border border-border bg-white p-6 shadow-soft">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Platform moderation</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Review reports and removed feed content across every community from one admin queue.
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
        className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_1.3fr_0.8fr_0.8fr_auto_auto]"
        onSubmit={handleFilterSubmit}
      >
        <ModerationInput
          label="Search"
          onChange={setQInput}
          placeholder="Community, slug, or content"
          value={qInput}
        />
        <ModerationInput
          label="Community ID"
          onChange={setCommunityIdInput}
          placeholder="Optional UUID"
          value={communityIdInput}
        />
        <ModerationSelect
          label="Reason"
          onChange={setReasonInput}
          options={[
            ["", "Any"],
            ["SPAM", "Spam"],
            ["HARASSMENT", "Harassment"],
            ["MISINFORMATION", "Misinformation"],
            ["UNRELATED", "Unrelated"],
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
        <p className="mt-6 text-sm font-semibold text-muted">Loading moderation queues...</p>
      ) : null}

      {state.status === "error" ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.message}
        </p>
      ) : null}

      {state.status === "ready" ? (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <ModerationMetric label="Open or filtered reports" value={state.reports.total} />
            <ModerationMetric label="Removed posts" value={state.removedPosts.total} />
            <ModerationMetric label="Removed comments" value={state.removedComments.total} />
          </div>
          <p className="mt-4 text-sm font-semibold text-muted">
            {totals === 0
              ? "No moderation items match these filters."
              : `${totals} total item${totals === 1 ? "" : "s"} need review in this view.`}
          </p>

          <div className="mt-6 grid gap-6">
            <ReportQueue
              busyAction={busyAction}
              onPage={(offset) =>
                setFilters((current) => ({ ...current, reportOffset: offset }))
              }
              onResolve={handleResolveReport}
              reports={state.reports}
            />
            <RemovedPostQueue
              busyAction={busyAction}
              onPage={(offset) =>
                setFilters((current) => ({ ...current, removedPostOffset: offset }))
              }
              onRestore={handleRestorePost}
              posts={state.removedPosts}
            />
            <RemovedCommentQueue
              busyAction={busyAction}
              comments={state.removedComments}
              onPage={(offset) =>
                setFilters((current) => ({ ...current, removedCommentOffset: offset }))
              }
              onRestore={handleRestoreComment}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}

function ReportQueue({
  busyAction,
  onPage,
  onResolve,
  reports
}: {
  busyAction: string | null;
  onPage: (offset: number) => void;
  onResolve: (report: CommunityAdminPostReportQueueItem) => void;
  reports: CommunityAdminPostReportQueueResponse;
}) {
  return (
    <ModerationQueueFrame
      count={reports.total}
      description="Reported posts waiting for platform or community moderator review."
      onPage={onPage}
      pageSize={reports.limit}
      title="Reported posts"
      visibleCount={reports.reports.length}
      visibleOffset={reports.offset}
    >
      {reports.reports.length === 0 ? (
        <EmptyQueue label="No reported posts match these filters." />
      ) : null}
      {reports.reports.map((report) => (
        <article className="rounded-lg border border-border bg-white p-4" key={report.id}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                {report.reason} · {formatStatus(report.status)}
              </p>
              <h3 className="mt-2 font-display text-lg font-semibold text-ink">
                {report.community_name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">{report.post_body}</p>
              {report.note ? (
                <p className="mt-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-6 text-muted">
                  {report.note}
                </p>
              ) : null}
              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <QueueDetail label="Reporter" value={report.reporter_display_name} />
                <QueueDetail label="Author" value={report.post_author_display_name} />
                <QueueDetail label="Created" value={formatDate(report.created_at)} />
              </dl>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Link
                className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
                href={`/communities/${report.community_id}`}
              >
                Open community
              </Link>
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
        </article>
      ))}
    </ModerationQueueFrame>
  );
}

function RemovedPostQueue({
  busyAction,
  onPage,
  onRestore,
  posts
}: {
  busyAction: string | null;
  onPage: (offset: number) => void;
  onRestore: (post: CommunityAdminRemovedPostQueueItem) => void;
  posts: CommunityAdminRemovedPostQueueResponse;
}) {
  return (
    <ModerationQueueFrame
      count={posts.total}
      description="Posts removed by authors, community managers, or administrators."
      onPage={onPage}
      pageSize={posts.limit}
      title="Removed posts"
      visibleCount={posts.posts.length}
      visibleOffset={posts.offset}
    >
      {posts.posts.length === 0 ? <EmptyQueue label="No removed posts match these filters." /> : null}
      {posts.posts.map((post) => (
        <article className="rounded-lg border border-border bg-white p-4" key={post.id}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Removed post
              </p>
              <h3 className="mt-2 font-display text-lg font-semibold text-ink">
                {post.community_name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">{post.body}</p>
              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <QueueDetail label="Author" value={post.author_display_name} />
                <QueueDetail label="Removed by" value={post.removed_by_display_name} />
                <QueueDetail
                  label="Removed"
                  value={post.removed_at ? formatDate(post.removed_at) : "Not captured"}
                />
              </dl>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Link
                className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
                href={`/communities/${post.community_id}`}
              >
                Open community
              </Link>
              <button
                className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={Boolean(busyAction)}
                onClick={() => onRestore(post)}
                type="button"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                {busyAction === `post:${post.id}` ? "Restoring..." : "Restore"}
              </button>
            </div>
          </div>
        </article>
      ))}
    </ModerationQueueFrame>
  );
}

function RemovedCommentQueue({
  busyAction,
  comments,
  onPage,
  onRestore
}: {
  busyAction: string | null;
  comments: CommunityAdminRemovedCommentQueueResponse;
  onPage: (offset: number) => void;
  onRestore: (comment: CommunityAdminRemovedCommentQueueItem) => void;
}) {
  return (
    <ModerationQueueFrame
      count={comments.total}
      description="Comments removed from active community posts."
      onPage={onPage}
      pageSize={comments.limit}
      title="Removed comments"
      visibleCount={comments.comments.length}
      visibleOffset={comments.offset}
    >
      {comments.comments.length === 0 ? (
        <EmptyQueue label="No removed comments match these filters." />
      ) : null}
      {comments.comments.map((comment) => (
        <article className="rounded-lg border border-border bg-white p-4" key={comment.id}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Removed comment
              </p>
              <h3 className="mt-2 font-display text-lg font-semibold text-ink">
                {comment.community_name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">{comment.body}</p>
              <p className="mt-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-6 text-muted">
                Parent post: {comment.post_body}
              </p>
              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <QueueDetail label="Comment author" value={comment.author_display_name} />
                <QueueDetail label="Removed by" value={comment.removed_by_display_name} />
                <QueueDetail
                  label="Removed"
                  value={comment.removed_at ? formatDate(comment.removed_at) : "Not captured"}
                />
              </dl>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Link
                className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
                href={`/communities/${comment.community_id}`}
              >
                Open community
              </Link>
              <button
                className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={Boolean(busyAction)}
                onClick={() => onRestore(comment)}
                type="button"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                {busyAction === `comment:${comment.id}` ? "Restoring..." : "Restore"}
              </button>
            </div>
          </div>
        </article>
      ))}
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

function QueueDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-ink">{value}</dd>
    </div>
  );
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
