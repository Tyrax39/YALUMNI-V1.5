"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  type ResourceItem,
  type ResourceListResponse,
  approveResource,
  fetchAdminResourceQueue,
  rejectResource,
  requestResourceChanges
} from "@yalumni/frontend-shared";
import {
  CheckCircle2,
  ClipboardCheck,
  FilterX,
  Library,
  Loader2,
  RefreshCcw,
  Search,
  XCircle
} from "lucide-react";

type QueueState =
  | { status: "loading" }
  | { response: ResourceListResponse; status: "ready" }
  | { message: string; status: "error" };

type Filters = {
  q: string;
  status: string;
};

export function LiveResourceReviewQueue() {
  const [state, setState] = useState<QueueState>({ status: "loading" });
  const [filters, setFilters] = useState<Filters>({ q: "", status: "PENDING_REVIEW" });
  const [reloadKey, setReloadKey] = useState(0);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      q: filters.q.trim() || undefined,
      status: filters.status
    }),
    [filters.q, filters.status]
  );

  useEffect(() => {
    let isMounted = true;

    fetchAdminResourceQueue(query)
      .then((response) => {
        if (isMounted) {
          setState({ response, status: "ready" });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message:
              caught instanceof Error
                ? caught.message
                : "The resource review queue could not be loaded.",
            status: "error"
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [query, reloadKey]);

  function refresh() {
    setState({ status: "loading" });
    setReloadKey((current) => current + 1);
  }

  function resetFilters() {
    setState({ status: "loading" });
    setFilters({ q: "", status: "PENDING_REVIEW" });
  }

  async function runAction(
    resource: ResourceItem,
    action: "approve" | "reject" | "request-changes"
  ) {
    setBusyAction(`${action}:${resource.id}`);
    setMessage(null);

    const payload = { reviewer_note: notes[resource.id]?.trim() || null };

    try {
      if (action === "approve") {
        await approveResource(resource.id, payload);
        setMessage("Resource published.");
      } else if (action === "reject") {
        await rejectResource(resource.id, payload);
        setMessage("Resource rejected.");
      } else {
        await requestResourceChanges(resource.id, payload);
        setMessage("Changes requested from the submitter.");
      }
      setNotes((current) => {
        const next = { ...current };
        delete next[resource.id];
        return next;
      });
      refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Resource review action failed.");
    } finally {
      setBusyAction(null);
    }
  }

  const metrics = useMemo(() => {
    if (state.status !== "ready") {
      return [
        ["Queue", "n/a"],
        ["Visible status", filters.status],
        ["Backend", "live"]
      ];
    }

    return [
      ["Queue", String(state.response.total)],
      ["Visible status", filters.status],
      ["Backend", "live"]
    ];
  }, [filters.status, state]);

  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
              <Library aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                Live resource review
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Review member-submitted resources before they appear in the member library.
              </p>
            </div>
          </div>
        </div>
        <button
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
          onClick={refresh}
          type="button"
        >
          <RefreshCcw aria-hidden="true" className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div className="rounded-lg border border-border bg-surface p-3" key={label}>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-primary">{value}</p>
          </div>
        ))}
      </div>

      {message ? (
        <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-ink">
          {message}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 rounded-lg border border-border bg-surface p-4 md:grid-cols-[1fr_220px_auto]">
        <label className="block text-sm font-bold text-ink">
          Search
          <span className="mt-2 flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-3">
            <Search aria-hidden="true" className="h-4 w-4 text-muted" />
            <input
              className="w-full bg-transparent text-sm text-ink outline-none"
              onChange={(event) => {
                setState({ status: "loading" });
                setFilters((current) => ({ ...current, q: event.target.value }));
              }}
              placeholder="Title, topic, country"
              value={filters.q}
            />
          </span>
        </label>
        <label className="block text-sm font-bold text-ink">
          Status
          <select
            className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            onChange={(event) => {
              setState({ status: "loading" });
              setFilters((current) => ({ ...current, status: event.target.value }));
            }}
            value={filters.status}
          >
            <option value="PENDING_REVIEW">Pending review</option>
            <option value="NEEDS_CHANGES">Needs changes</option>
            <option value="PUBLISHED">Published</option>
            <option value="REJECTED">Rejected</option>
            <option value="ARCHIVED">Archived</option>
            <option value="ALL">All</option>
          </select>
        </label>
        <button
          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-lg border border-border bg-white px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
          onClick={resetFilters}
          type="button"
        >
          <FilterX aria-hidden="true" className="h-4 w-4" />
          Reset
        </button>
      </div>

      {state.status === "loading" ? <LoadingPanel label="Loading resource queue." /> : null}
      {state.status === "error" ? <ErrorPanel message={state.message} /> : null}

      {state.status === "ready" ? (
        <div className="mt-5 grid gap-4">
          {state.response.resources.length ? (
            state.response.resources.map((resource) => (
              <ResourceReviewRow
                busyAction={busyAction}
                key={resource.id}
                note={notes[resource.id] ?? ""}
                onAction={runAction}
                onNoteChange={(value) =>
                  setNotes((current) => ({ ...current, [resource.id]: value }))
                }
                resource={resource}
              />
            ))
          ) : (
            <EmptyPanel label="No resources match this review queue." />
          )}
        </div>
      ) : null}
    </section>
  );
}

function ResourceReviewRow({
  busyAction,
  note,
  onAction,
  onNoteChange,
  resource
}: {
  busyAction: string | null;
  note: string;
  onAction: (resource: ResourceItem, action: "approve" | "reject" | "request-changes") => void;
  onNoteChange: (value: string) => void;
  resource: ResourceItem;
}) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-ink">{resource.title}</h3>
            <Pill label={resource.status} />
            <Pill label={resource.resource_type} />
            <Pill label={resource.resource_format} />
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            {truncate(resource.description, 240)}
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.1em] text-muted">
            {[resource.topic, resource.country, resource.language].filter(Boolean).join(" / ") ||
              "No library metadata"}
          </p>
          <p className="mt-2 text-xs font-semibold text-muted">
            Submitted by {resource.created_by_display_name ?? "unknown member"} on{" "}
            {formatDate(resource.created_at)}
          </p>
          {resource.external_url ? (
            <p className="mt-2 break-all text-xs font-semibold text-primary">
              {resource.external_url}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3">
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
            Reviewer note
            <textarea
              className="mt-2 min-h-24 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Optional note"
              value={note}
            />
          </label>
          <ActionButton
            busy={busyAction === `approve:${resource.id}`}
            icon={<CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
            label="Approve"
            onClick={() => onAction(resource, "approve")}
            tone="primary"
          />
          <ActionButton
            busy={busyAction === `request-changes:${resource.id}`}
            icon={<ClipboardCheck aria-hidden="true" className="h-4 w-4" />}
            label="Request changes"
            onClick={() => onAction(resource, "request-changes")}
            tone="neutral"
          />
          <ActionButton
            busy={busyAction === `reject:${resource.id}`}
            icon={<XCircle aria-hidden="true" className="h-4 w-4" />}
            label="Reject"
            onClick={() => onAction(resource, "reject")}
            tone="danger"
          />
        </div>
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
      {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : icon}
      {busy ? "Working" : label}
    </button>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded-md border border-border bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
      {label.replaceAll("_", " ").toLowerCase()}
    </span>
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

function truncate(value: string, maxLength = 220) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
