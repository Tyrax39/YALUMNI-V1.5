"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import {
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Filter,
  Loader2,
  MapPin,
  Plus,
  RefreshCcw,
  Send,
  Sparkles
} from "lucide-react";
import {
  MEMBER_ACCESS_ROLES,
  type Opportunity,
  type OpportunityFilters,
  createOpportunity,
  fetchOpportunities,
  fetchOpportunity
} from "@yalumni/frontend-shared";

import { AppShell } from "@/components/platform/app-shell";

type ListState =
  | { status: "loading" }
  | {
      mine: Opportunity[];
      opportunities: Opportunity[];
      status: "ready";
      total: number;
    }
  | { message: string; status: "error" };

type DetailState =
  | { status: "loading" }
  | { opportunity: Opportunity; status: "ready" }
  | { message: string; status: "error" };

type FormState = {
  application_url: string;
  country: string;
  deadline_at: string;
  description: string;
  location: string;
  opportunity_type: string;
  organization: string;
  remote_policy: string;
  title: string;
};

const INITIAL_FORM: FormState = {
  application_url: "",
  country: "",
  deadline_at: "",
  description: "",
  location: "",
  opportunity_type: "FELLOWSHIP",
  organization: "",
  remote_policy: "HYBRID",
  title: ""
};

export function OpportunityHub() {
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [filters, setFilters] = useState({
    country: "",
    opportunityType: "",
    q: "",
    remotePolicy: ""
  });
  const [reloadKey, setReloadKey] = useState(0);

  const apiFilters = useMemo<OpportunityFilters>(
    () => ({
      country: filters.country.trim() || undefined,
      opportunityType: filters.opportunityType || undefined,
      q: filters.q.trim() || undefined,
      remotePolicy: filters.remotePolicy || undefined
    }),
    [filters]
  );

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetchOpportunities({ ...apiFilters, limit: 12 }),
      fetchOpportunities({ limit: 6, mine: true })
    ])
      .then(([published, mine]) => {
        if (!isMounted) {
          return;
        }
        setState({
          mine: mine.opportunities,
          opportunities: published.opportunities,
          status: "ready",
          total: published.total
        });
      })
      .catch((caught) => {
        if (!isMounted) {
          return;
        }
        setState({
          message: caught instanceof Error ? caught.message : "Opportunities could not be loaded.",
          status: "error"
        });
      });

    return () => {
      isMounted = false;
    };
  }, [apiFilters, reloadKey]);

  return (
    <AppShell
      actions={
        <>
          <button
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
            onClick={() => {
              setState({ status: "loading" });
              setReloadKey((current) => current + 1);
            }}
            type="button"
          >
            <RefreshCcw aria-hidden="true" className="h-4 w-4" />
            Refresh
          </button>
          <Link
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-[#003d7d]"
            href="/opportunities/new"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Submit opportunity
          </Link>
        </>
      }
      description="Find fellowships, grants, roles, and partner opportunities that have passed alumni moderation review."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Opportunities"
    >
      {() => (
        <div className="grid gap-6">
          <section className="rounded-lg border border-border bg-white p-4 shadow-soft sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                <Filter aria-hidden="true" className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink">Browse reviewed listings</h2>
                <p className="text-sm leading-6 text-muted">
                  Filters are live against the FastAPI opportunity service.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <TextInput
                label="Search"
                onChange={(value) => setFilters((current) => ({ ...current, q: value }))}
                placeholder="Title, org, country"
                value={filters.q}
              />
              <TextInput
                label="Country"
                onChange={(value) => setFilters((current) => ({ ...current, country: value }))}
                placeholder="Rwanda"
                value={filters.country}
              />
              <SelectInput
                label="Type"
                onChange={(value) =>
                  setFilters((current) => ({ ...current, opportunityType: value }))
                }
                options={[
                  ["", "All types"],
                  ["FELLOWSHIP", "Fellowship"],
                  ["GRANT", "Grant"],
                  ["JOB", "Job"],
                  ["INTERNSHIP", "Internship"],
                  ["EVENT", "Event"]
                ]}
                value={filters.opportunityType}
              />
              <SelectInput
                label="Mode"
                onChange={(value) =>
                  setFilters((current) => ({ ...current, remotePolicy: value }))
                }
                options={[
                  ["", "Any mode"],
                  ["REMOTE", "Remote"],
                  ["HYBRID", "Hybrid"],
                  ["IN_PERSON", "In person"]
                ]}
                value={filters.remotePolicy}
              />
            </div>
          </section>

          {state.status === "loading" ? <LoadingPanel label="Loading opportunities." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}

          {state.status === "ready" ? (
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <section className="grid gap-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-ink">
                    Published opportunities
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-muted">
                    {state.total} listing{state.total === 1 ? "" : "s"} available
                  </p>
                </div>
                {state.opportunities.length ? (
                  state.opportunities.map((opportunity) => (
                    <OpportunityCard key={opportunity.id} opportunity={opportunity} />
                  ))
                ) : (
                  <EmptyPanel label="No published opportunities match the current filters." />
                )}
              </section>

              <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
                <h2 className="font-display text-xl font-semibold text-ink">My submissions</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Submitted listings stay private until a moderator publishes them.
                </p>
                <div className="mt-4 grid gap-3">
                  {state.mine.length ? (
                    state.mine.map((opportunity) => (
                      <Link
                        className="focus-ring rounded-lg border border-border bg-surface p-3 transition hover:border-primary"
                        href={`/opportunities/${opportunity.id}`}
                        key={opportunity.id}
                      >
                        <p className="text-sm font-bold text-ink">{opportunity.title}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                          {formatStatus(opportunity.status)}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <EmptyPanel label="No submitted listings yet." />
                  )}
                </div>
              </aside>
            </div>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

export function OpportunityCreate() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<Opportunity | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const opportunity = await createOpportunity({
        application_url: form.application_url.trim() || null,
        country: form.country.trim() || null,
        deadline_at: form.deadline_at ? new Date(form.deadline_at).toISOString() : null,
        description: form.description,
        location: form.location.trim() || null,
        opportunity_type: form.opportunity_type,
        organization: form.organization,
        remote_policy: form.remote_policy,
        title: form.title
      });
      setCreated(opportunity);
      setMessage("Opportunity submitted for moderator review.");
      setForm(INITIAL_FORM);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Opportunity submission failed.");
    } finally {
      setBusy(false);
    }
  }

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <AppShell
      description="Submit alumni-relevant fellowships, grants, roles, events, and internships for moderator review before publication."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Submit opportunity"
    >
      {() => (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <form
            className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput
                label="Title"
                onChange={(value) => updateField("title", value)}
                placeholder="Civic innovation fellowship"
                required
                value={form.title}
              />
              <TextInput
                label="Organization"
                onChange={(value) => updateField("organization", value)}
                placeholder="Partner organization"
                required
                value={form.organization}
              />
              <SelectInput
                label="Type"
                onChange={(value) => updateField("opportunity_type", value)}
                options={[
                  ["FELLOWSHIP", "Fellowship"],
                  ["GRANT", "Grant"],
                  ["JOB", "Job"],
                  ["INTERNSHIP", "Internship"],
                  ["EVENT", "Event"],
                  ["OTHER", "Other"]
                ]}
                value={form.opportunity_type}
              />
              <SelectInput
                label="Mode"
                onChange={(value) => updateField("remote_policy", value)}
                options={[
                  ["HYBRID", "Hybrid"],
                  ["REMOTE", "Remote"],
                  ["IN_PERSON", "In person"]
                ]}
                value={form.remote_policy}
              />
              <TextInput
                label="Country"
                onChange={(value) => updateField("country", value)}
                placeholder="Rwanda"
                value={form.country}
              />
              <TextInput
                label="Location"
                onChange={(value) => updateField("location", value)}
                placeholder="Kigali or online"
                value={form.location}
              />
              <TextInput
                label="Application URL"
                onChange={(value) => updateField("application_url", value)}
                placeholder="https://example.org/apply"
                type="url"
                value={form.application_url}
              />
              <TextInput
                label="Deadline"
                onChange={(value) => updateField("deadline_at", value)}
                type="datetime-local"
                value={form.deadline_at}
              />
            </div>
            <label className="mt-4 block text-sm font-bold text-ink">
              Description
              <textarea
                className="mt-2 min-h-44 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Eligibility, timeline, benefits, and why this matters to YALI alumni."
                required
                value={form.description}
              />
            </label>

            {message ? (
              <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-ink">
                {message}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busy}
                type="submit"
              >
                {busy ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <Send aria-hidden="true" className="h-4 w-4" />
                )}
                {busy ? "Submitting" : "Submit for review"}
              </button>
              <Link
                className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
                href="/opportunities"
              >
                Back to opportunities
              </Link>
            </div>
          </form>

          <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-white">
              <Sparkles aria-hidden="true" className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold text-ink">Review workflow</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              New opportunities enter the admin review queue on port 3011. Approved listings become
              visible in the member workspace.
            </p>
            {created ? (
              <Link
                className="focus-ring mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
                href={`/opportunities/${created.id}`}
              >
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                View submitted listing
              </Link>
            ) : null}
          </aside>
        </div>
      )}
    </AppShell>
  );
}

export function OpportunityDetail({ opportunityId }: { opportunityId: string }) {
  const [state, setState] = useState<DetailState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    fetchOpportunity(opportunityId)
      .then((opportunity) => {
        if (isMounted) {
          setState({ opportunity, status: "ready" });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Opportunity could not be loaded.",
            status: "error"
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [opportunityId]);

  return (
    <AppShell
      description="Review the opportunity details, publication status, and application link."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Opportunity detail"
    >
      {() => (
        <>
          {state.status === "loading" ? <LoadingPanel label="Loading opportunity." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
          {state.status === "ready" ? <OpportunityDetailBody opportunity={state.opportunity} /> : null}
        </>
      )}
    </AppShell>
  );
}

function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-ink">{opportunity.title}</h3>
            <Pill label={formatStatus(opportunity.opportunity_type)} />
            <Pill label={formatStatus(opportunity.remote_policy)} />
          </div>
          <p className="mt-1 text-sm font-semibold text-muted">{opportunity.organization}</p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            {truncate(opportunity.description, 260)}
          </p>
          <OpportunityMeta opportunity={opportunity} />
        </div>
        <div className="flex items-start">
          <Link
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
            href={`/opportunities/${opportunity.id}`}
          >
            View
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function OpportunityDetailBody({ opportunity }: { opportunity: Opportunity }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill label={formatStatus(opportunity.status)} />
            <Pill label={formatStatus(opportunity.opportunity_type)} />
            <Pill label={formatStatus(opportunity.remote_policy)} />
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold text-ink">{opportunity.title}</h2>
          <p className="mt-2 text-base font-semibold text-muted">{opportunity.organization}</p>
          <OpportunityMeta opportunity={opportunity} />
          <p className="mt-6 whitespace-pre-line text-base leading-8 text-muted">
            {opportunity.description}
          </p>
        </div>
        <aside className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted">Application</h3>
          <div className="mt-4 grid gap-3">
            <Fact label="Published" value={formatDate(opportunity.published_at)} />
            <Fact label="Submitted by" value={opportunity.created_by_display_name ?? "Member"} />
            <Fact label="Reviewed by" value={opportunity.reviewed_by_display_name ?? "Pending review"} />
          </div>
          {opportunity.application_url ? (
            <a
              className="focus-ring mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-[#003d7d]"
              href={opportunity.application_url}
              rel="noreferrer"
              target="_blank"
            >
              Apply
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </a>
          ) : null}
        </aside>
      </div>
    </article>
  );
}

function OpportunityMeta({ opportunity }: { opportunity: Opportunity }) {
  const location = [opportunity.location, opportunity.country].filter(Boolean).join(", ");

  return (
    <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-muted">
      <span className="inline-flex items-center gap-2">
        <MapPin aria-hidden="true" className="h-4 w-4 text-primary" />
        {location || "Location flexible"}
      </span>
      <span className="inline-flex items-center gap-2">
        <CalendarClock aria-hidden="true" className="h-4 w-4 text-primary" />
        {opportunity.deadline_at ? `Deadline ${formatDate(opportunity.deadline_at)}` : "No deadline set"}
      </span>
      <span className="inline-flex items-center gap-2">
        <BriefcaseBusiness aria-hidden="true" className="h-4 w-4 text-primary" />
        {opportunity.organization}
      </span>
    </div>
  );
}

function TextInput({
  label,
  onChange,
  placeholder,
  required = false,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="block text-sm font-bold text-ink">
      {label}
      <input
        className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectInput({
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
    <label className="block text-sm font-bold text-ink">
      {label}
      <select
        className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
      {label}
    </span>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-5 text-sm font-semibold text-muted shadow-soft">
      {label}
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-[#ffb7a8] bg-[#fff2ed] p-5 text-sm font-semibold text-[#b82716]">
      {message}
    </div>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-white p-5 text-sm font-semibold text-muted">
      {label}
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}
