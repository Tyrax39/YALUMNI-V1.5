"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import {
  ArrowUpRight,
  CheckCircle2,
  Filter,
  Flag,
  Handshake,
  ListChecks,
  Loader2,
  MapPin,
  Plus,
  RefreshCcw,
  Send,
  Sparkles,
  Target,
  Users
} from "lucide-react";
import {
  MEMBER_ACCESS_ROLES,
  type InitiativeFilters,
  type InitiativeItem,
  type InitiativeMilestone,
  createInitiative,
  fetchInitiative,
  fetchInitiatives
} from "@yalumni/frontend-shared";

import { AppShell } from "@/components/platform/app-shell";

type InitiativeListState =
  | { status: "loading" }
  | { initiatives: InitiativeItem[]; mine: InitiativeItem[]; status: "ready"; total: number }
  | { message: string; status: "error" };

type InitiativeDetailState =
  | { status: "loading" }
  | { initiative: InitiativeItem; status: "ready" }
  | { message: string; status: "error" };

type InitiativeFormState = {
  city: string;
  country: string;
  description: string;
  ends_at: string;
  focus_area: string;
  impact_goal: string;
  milestone_description: string;
  milestone_due_at: string;
  milestone_status: string;
  milestone_title: string;
  partner_organization: string;
  stage: string;
  starts_at: string;
  summary: string;
  support_needed: string;
  target_beneficiaries: string;
  title: string;
};

const INITIAL_FORM: InitiativeFormState = {
  city: "",
  country: "",
  description: "",
  ends_at: "",
  focus_area: "COMMUNITY_IMPACT",
  impact_goal: "",
  milestone_description: "",
  milestone_due_at: "",
  milestone_status: "PLANNED",
  milestone_title: "",
  partner_organization: "",
  stage: "IDEA",
  starts_at: "",
  summary: "",
  support_needed: "",
  target_beneficiaries: "",
  title: ""
};

const FOCUS_AREA_OPTIONS: [string, string][] = [
  ["", "All focus areas"],
  ["COMMUNITY_IMPACT", "Community impact"],
  ["CIVIC_LEADERSHIP", "Civic leadership"],
  ["CLIMATE", "Climate"],
  ["EDUCATION", "Education"],
  ["ENTREPRENEURSHIP", "Entrepreneurship"],
  ["HEALTH", "Health"],
  ["TECHNOLOGY", "Technology"],
  ["YOUTH", "Youth"],
  ["OTHER", "Other"]
];

const STAGE_OPTIONS: [string, string][] = [
  ["", "All stages"],
  ["IDEA", "Idea"],
  ["PILOT", "Pilot"],
  ["ACTIVE", "Active"],
  ["SCALING", "Scaling"],
  ["SUSTAINED", "Sustained"]
];

const MILESTONE_STATUS_OPTIONS: [string, string][] = [
  ["PLANNED", "Planned"],
  ["IN_PROGRESS", "In progress"],
  ["COMPLETED", "Completed"],
  ["BLOCKED", "Blocked"]
];

export function InitiativesHub() {
  const [state, setState] = useState<InitiativeListState>({ status: "loading" });
  const [filters, setFilters] = useState({
    country: "",
    focusArea: "",
    q: "",
    stage: ""
  });
  const [reloadKey, setReloadKey] = useState(0);

  const apiFilters = useMemo<InitiativeFilters>(
    () => ({
      country: filters.country.trim() || undefined,
      focusArea: filters.focusArea || undefined,
      q: filters.q.trim() || undefined,
      stage: filters.stage || undefined
    }),
    [filters]
  );

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetchInitiatives({ ...apiFilters, limit: 12 }),
      fetchInitiatives({ limit: 6, mine: true })
    ])
      .then(([published, mine]) => {
        if (!isMounted) {
          return;
        }
        setState({
          initiatives: published.initiatives,
          mine: mine.initiatives,
          status: "ready",
          total: published.total
        });
      })
      .catch((caught) => {
        if (!isMounted) {
          return;
        }
        setState({
          message: caught instanceof Error ? caught.message : "Initiatives could not be loaded.",
          status: "error"
        });
      });

    return () => {
      isMounted = false;
    };
  }, [apiFilters, reloadKey]);

  function updateFilter(patch: Partial<typeof filters>) {
    setState({ status: "loading" });
    setFilters((current) => ({ ...current, ...patch }));
  }

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
            href="/initiatives/new"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Propose initiative
          </Link>
        </>
      }
      description="Launch, discover, and coordinate member-led alumni initiatives."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Initiatives"
    >
      {() => (
        <div className="grid gap-6">
          <section className="rounded-lg border border-border bg-white p-4 shadow-soft sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                <Filter aria-hidden="true" className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink">Search alumni initiatives</h2>
                <p className="text-sm leading-6 text-muted">
                  Results come from the live FastAPI initiative workspace.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <TextInput
                label="Search"
                onChange={(value) => updateFilter({ q: value })}
                placeholder="Climate, STEM, youth"
                value={filters.q}
              />
              <TextInput
                label="Country"
                onChange={(value) => updateFilter({ country: value })}
                placeholder="Rwanda"
                value={filters.country}
              />
              <SelectInput
                label="Focus"
                onChange={(value) => updateFilter({ focusArea: value })}
                options={FOCUS_AREA_OPTIONS}
                value={filters.focusArea}
              />
              <SelectInput
                label="Stage"
                onChange={(value) => updateFilter({ stage: value })}
                options={STAGE_OPTIONS}
                value={filters.stage}
              />
            </div>
          </section>

          {state.status === "loading" ? <LoadingPanel label="Loading initiatives." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}

          {state.status === "ready" ? (
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <section className="grid gap-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-ink">
                    Active initiatives
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-muted">
                    {state.total} initiative{state.total === 1 ? "" : "s"} available
                  </p>
                </div>
                {state.initiatives.length ? (
                  state.initiatives.map((initiative) => (
                    <InitiativeCard initiative={initiative} key={initiative.id} />
                  ))
                ) : (
                  <EmptyPanel label="No initiatives match the current filters." />
                )}
              </section>

              <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
                <h2 className="font-display text-xl font-semibold text-ink">My initiatives</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Your proposals publish into the member initiative workspace in this slice.
                </p>
                <div className="mt-4 grid gap-3">
                  {state.mine.length ? (
                    state.mine.map((initiative) => (
                      <Link
                        className="focus-ring rounded-lg border border-border bg-surface p-3 transition hover:border-primary"
                        href={`/initiatives/${initiative.id}`}
                        key={initiative.id}
                      >
                        <p className="text-sm font-bold text-ink">{initiative.title}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                          {formatStatus(initiative.stage)}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <EmptyPanel label="No initiative proposals yet." />
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

export function InitiativeCreate() {
  const [form, setForm] = useState<InitiativeFormState>(INITIAL_FORM);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<InitiativeItem | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const milestones = form.milestone_title.trim()
      ? [
          {
            description: form.milestone_description.trim() || null,
            due_at: optionalIso(form.milestone_due_at),
            status: form.milestone_status,
            title: form.milestone_title
          }
        ]
      : [];

    try {
      const initiative = await createInitiative({
        city: form.city.trim() || null,
        country: form.country.trim() || null,
        description: form.description,
        ends_at: optionalIso(form.ends_at),
        focus_area: form.focus_area,
        impact_goal: form.impact_goal.trim() || null,
        milestones,
        partner_organization: form.partner_organization.trim() || null,
        stage: form.stage,
        starts_at: optionalIso(form.starts_at),
        summary: form.summary,
        support_needed: form.support_needed.trim() || null,
        target_beneficiaries: optionalInteger(form.target_beneficiaries),
        title: form.title
      });
      setCreated(initiative);
      setMessage("Initiative published to the member workspace.");
      setForm(INITIAL_FORM);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Initiative proposal failed.");
    } finally {
      setBusy(false);
    }
  }

  function updateField(field: keyof InitiativeFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <AppShell
      description="Propose a member-led initiative with impact goals, support needs, timeline, and milestone metadata."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Propose initiative"
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
                placeholder="Youth climate action lab"
                required
                value={form.title}
              />
              <TextInput
                label="Country"
                onChange={(value) => updateField("country", value)}
                placeholder="Rwanda"
                value={form.country}
              />
              <SelectInput
                label="Focus"
                onChange={(value) => updateField("focus_area", value)}
                options={FOCUS_AREA_OPTIONS.slice(1)}
                value={form.focus_area}
              />
              <SelectInput
                label="Stage"
                onChange={(value) => updateField("stage", value)}
                options={STAGE_OPTIONS.slice(1)}
                value={form.stage}
              />
              <TextInput
                label="City"
                onChange={(value) => updateField("city", value)}
                placeholder="Kigali"
                value={form.city}
              />
              <TextInput
                label="Partner organization"
                onChange={(value) => updateField("partner_organization", value)}
                placeholder="YALUMNI Rwanda Chapter"
                value={form.partner_organization}
              />
              <TextInput
                label="Starts"
                onChange={(value) => updateField("starts_at", value)}
                type="datetime-local"
                value={form.starts_at}
              />
              <TextInput
                label="Ends"
                onChange={(value) => updateField("ends_at", value)}
                type="datetime-local"
                value={form.ends_at}
              />
              <div className="md:col-span-2">
                <TextInput
                  label="Target beneficiaries"
                  onChange={(value) => updateField("target_beneficiaries", value)}
                  placeholder="500"
                  type="number"
                  value={form.target_beneficiaries}
                />
              </div>
            </div>

            <label className="mt-4 block text-sm font-bold text-ink">
              Summary
              <textarea
                className="mt-2 min-h-28 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => updateField("summary", event.target.value)}
                placeholder="A concise member-facing summary of the initiative."
                required
                value={form.summary}
              />
            </label>
            <label className="mt-4 block text-sm font-bold text-ink">
              Description
              <textarea
                className="mt-2 min-h-44 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="What the initiative will do, who leads it, and how members can participate."
                required
                value={form.description}
              />
            </label>
            <label className="mt-4 block text-sm font-bold text-ink">
              Impact goal
              <textarea
                className="mt-2 min-h-24 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => updateField("impact_goal", event.target.value)}
                placeholder="What measurable change should this create?"
                value={form.impact_goal}
              />
            </label>
            <label className="mt-4 block text-sm font-bold text-ink">
              Support needed
              <textarea
                className="mt-2 min-h-28 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => updateField("support_needed", event.target.value)}
                placeholder="Mentors, partners, venues, funding, tools, volunteers, or advisory support."
                value={form.support_needed}
              />
            </label>

            <section className="mt-5 rounded-lg border border-border bg-surface p-4">
              <h2 className="text-base font-bold text-ink">Optional first milestone</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <TextInput
                  label="Milestone title"
                  onChange={(value) => updateField("milestone_title", value)}
                  placeholder="Partner alignment"
                  value={form.milestone_title}
                />
                <SelectInput
                  label="Milestone status"
                  onChange={(value) => updateField("milestone_status", value)}
                  options={MILESTONE_STATUS_OPTIONS}
                  value={form.milestone_status}
                />
                <div className="md:col-span-2">
                  <TextInput
                    label="Milestone due"
                    onChange={(value) => updateField("milestone_due_at", value)}
                    type="datetime-local"
                    value={form.milestone_due_at}
                  />
                </div>
              </div>
              <label className="mt-4 block text-sm font-bold text-ink">
                Milestone description
                <textarea
                  className="mt-2 min-h-24 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) => updateField("milestone_description", event.target.value)}
                  placeholder="The first concrete step this initiative will complete."
                  value={form.milestone_description}
                />
              </label>
            </section>

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
                {busy ? "Publishing" : "Publish initiative"}
              </button>
              <Link
                className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
                href="/initiatives"
              >
                Back to initiatives
              </Link>
            </div>
          </form>

          <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-white">
              <Sparkles aria-hidden="true" className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold text-ink">
              Initiative workflow
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Initiatives publish into the member workspace in this MVP slice. Governance,
              team roles, documents, and admin review come next.
            </p>
            {created ? (
              <Link
                className="focus-ring mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
                href={`/initiatives/${created.id}`}
              >
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                View initiative
              </Link>
            ) : null}
          </aside>
        </div>
      )}
    </AppShell>
  );
}

export function InitiativeDetail({ initiativeId }: { initiativeId: string }) {
  const [state, setState] = useState<InitiativeDetailState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    fetchInitiative(initiativeId)
      .then((initiative) => {
        if (isMounted) {
          setState({ initiative, status: "ready" });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Initiative could not be loaded.",
            status: "error"
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initiativeId]);

  return (
    <AppShell
      description="Review initiative goals, support needs, timeline, and milestones."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Initiative detail"
    >
      {() => (
        <>
          {state.status === "loading" ? <LoadingPanel label="Loading initiative." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
          {state.status === "ready" ? (
            <InitiativeDetailBody initiative={state.initiative} />
          ) : null}
        </>
      )}
    </AppShell>
  );
}

function InitiativeCard({ initiative }: { initiative: InitiativeItem }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-ink">{initiative.title}</h3>
            <Pill label={formatStatus(initiative.focus_area)} />
            <Pill label={formatStatus(initiative.stage)} />
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{initiative.summary}</p>
          <InitiativeMeta initiative={initiative} />
        </div>
        <div className="flex items-start">
          <Link
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
            href={`/initiatives/${initiative.id}`}
          >
            View
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function InitiativeDetailBody({ initiative }: { initiative: InitiativeItem }) {
  return (
    <article className="grid gap-6">
      <section className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill label={formatStatus(initiative.status)} />
              <Pill label={formatStatus(initiative.focus_area)} />
              <Pill label={formatStatus(initiative.stage)} />
            </div>
            <h2 className="mt-4 font-display text-3xl font-bold text-ink">
              {initiative.title}
            </h2>
            <p className="mt-4 text-lg leading-8 text-ink">{initiative.summary}</p>
            <InitiativeMeta initiative={initiative} />
            <p className="mt-6 whitespace-pre-line text-base leading-8 text-muted">
              {initiative.description}
            </p>
          </div>
          <aside className="rounded-lg border border-border bg-surface p-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted">
              Initiative
            </h3>
            <div className="mt-4 grid gap-3">
              <Fact label="Lead" value={initiative.created_by_display_name ?? "Member"} />
              <Fact label="Partner" value={initiative.partner_organization ?? "Not set"} />
              <Fact label="Beneficiaries" value={formatBeneficiaries(initiative)} />
              <Fact label="Timeline" value={formatWindow(initiative)} />
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <InfoPanel
          icon={<Target aria-hidden="true" className="h-5 w-5" />}
          label="Impact goal"
          value={initiative.impact_goal || "Impact goal not set yet."}
        />
        <InfoPanel
          icon={<Handshake aria-hidden="true" className="h-5 w-5" />}
          label="Support needed"
          value={initiative.support_needed || "Support needs have not been added yet."}
        />
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Milestones</h2>
          <p className="mt-1 text-sm font-semibold text-muted">
            {initiative.milestone_count} milestone{initiative.milestone_count === 1 ? "" : "s"}
          </p>
        </div>
        {initiative.milestones.length ? (
          initiative.milestones.map((milestone) => (
            <MilestoneCard key={milestone.id} milestone={milestone} />
          ))
        ) : (
          <EmptyPanel label="No milestones have been added for this initiative yet." />
        )}
      </section>
    </article>
  );
}

function InitiativeMeta({ initiative }: { initiative: InitiativeItem }) {
  return (
    <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-muted">
      <span className="inline-flex items-center gap-2">
        <MapPin aria-hidden="true" className="h-4 w-4 text-primary" />
        {[initiative.city, initiative.country].filter(Boolean).join(", ") || "Pan-African"}
      </span>
      <span className="inline-flex items-center gap-2">
        <Flag aria-hidden="true" className="h-4 w-4 text-primary" />
        {formatStatus(initiative.stage)}
      </span>
      <span className="inline-flex items-center gap-2">
        <Users aria-hidden="true" className="h-4 w-4 text-primary" />
        {formatBeneficiaries(initiative)}
      </span>
      <span className="inline-flex items-center gap-2">
        <ListChecks aria-hidden="true" className="h-4 w-4 text-primary" />
        {initiative.milestone_count} milestone{initiative.milestone_count === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function MilestoneCard({ milestone }: { milestone: InitiativeMilestone }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">Due</p>
          <p className="mt-2 text-sm font-bold text-ink">{formatDate(milestone.due_at)}</p>
          <Pill label={formatStatus(milestone.status)} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-ink">{milestone.title}</h3>
          {milestone.description ? (
            <p className="mt-3 text-sm leading-6 text-muted">{milestone.description}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function InfoPanel({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <div className="flex items-center gap-3 text-primary">
        {icon}
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted">{label}</h3>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink">{value}</p>
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
        onInput={(event) => onChange(event.currentTarget.value)}
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
    <span className="mt-2 inline-flex rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
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

function optionalInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function optionalIso(value: string): string | null {
  return value.trim() ? datetimeLocalToIso(value) : null;
}

function datetimeLocalToIso(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        dateStyle: "medium"
      });
}

function formatWindow(initiative: InitiativeItem) {
  if (!initiative.starts_at && !initiative.ends_at) {
    return "Not set";
  }
  return `${formatDate(initiative.starts_at)} - ${formatDate(initiative.ends_at)}`;
}

function formatBeneficiaries(initiative: InitiativeItem) {
  return typeof initiative.target_beneficiaries === "number"
    ? `${initiative.target_beneficiaries.toLocaleString()} beneficiaries`
    : "Reach not set";
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}
