"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import {
  Award,
  Camera,
  CheckCircle2,
  ExternalLink,
  Filter,
  Globe2,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCcw,
  Send,
  Sparkles,
  Users
} from "lucide-react";
import {
  MEMBER_ACCESS_ROLES,
  type SuccessStory,
  type SuccessStoryFilters,
  createSuccessStory,
  fetchSuccessStories,
  fetchSuccessStory
} from "@yalumni/frontend-shared";

import { AppShell } from "@/components/platform/app-shell";

type ListState =
  | { status: "loading" }
  | { mine: SuccessStory[]; stories: SuccessStory[]; status: "ready"; total: number }
  | { message: string; status: "error" };

type DetailState =
  | { status: "loading" }
  | { status: "ready"; story: SuccessStory }
  | { message: string; status: "error" };

type FormState = {
  beneficiary_count: string;
  body: string;
  cohort_year: string;
  country: string;
  external_url: string;
  impact_metric: string;
  media_url: string;
  program: string;
  sector: string;
  summary: string;
  title: string;
};

const INITIAL_FORM: FormState = {
  beneficiary_count: "",
  body: "",
  cohort_year: "",
  country: "",
  external_url: "",
  impact_metric: "",
  media_url: "",
  program: "Mandela Washington Fellowship",
  sector: "",
  summary: "",
  title: ""
};

export function SuccessStoriesHub() {
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [filters, setFilters] = useState({
    country: "",
    program: "",
    q: "",
    sector: ""
  });
  const [reloadKey, setReloadKey] = useState(0);

  const apiFilters = useMemo<SuccessStoryFilters>(
    () => ({
      country: filters.country.trim() || undefined,
      program: filters.program.trim() || undefined,
      q: filters.q.trim() || undefined,
      sector: filters.sector.trim() || undefined
    }),
    [filters]
  );

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetchSuccessStories({ ...apiFilters, limit: 12 }),
      fetchSuccessStories({ limit: 6, mine: true })
    ])
      .then(([published, mine]) => {
        if (!isMounted) {
          return;
        }
        setState({
          mine: mine.stories,
          status: "ready",
          stories: published.stories,
          total: published.total
        });
      })
      .catch((caught) => {
        if (!isMounted) {
          return;
        }
        setState({
          message: caught instanceof Error ? caught.message : "Success stories could not be loaded.",
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
            href="/success-stories/new"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Submit story
          </Link>
        </>
      }
      description="Read reviewed alumni impact stories and submit chapter wins for editorial review."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Success stories"
    >
      {() => (
        <div className="grid gap-6">
          <section className="rounded-lg border border-border bg-white p-4 shadow-soft sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                <Filter aria-hidden="true" className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink">Search published stories</h2>
                <p className="text-sm leading-6 text-muted">
                  Results come from the live FastAPI success-story publishing workflow.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <TextInput
                label="Search"
                onChange={(value) => updateFilter({ q: value })}
                placeholder="Agritech, budget, STEM"
                value={filters.q}
              />
              <TextInput
                label="Country"
                onChange={(value) => updateFilter({ country: value })}
                placeholder="Zambia"
                value={filters.country}
              />
              <TextInput
                label="Sector"
                onChange={(value) => updateFilter({ sector: value })}
                placeholder="Agriculture"
                value={filters.sector}
              />
              <TextInput
                label="Program"
                onChange={(value) => updateFilter({ program: value })}
                placeholder="Mandela Washington"
                value={filters.program}
              />
            </div>
          </section>

          {state.status === "loading" ? <LoadingPanel label="Loading success stories." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}

          {state.status === "ready" ? (
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <section className="grid gap-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-ink">
                    Published impact stories
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-muted">
                    {state.total} stor{state.total === 1 ? "y" : "ies"} available
                  </p>
                </div>
                {state.stories.length ? (
                  state.stories.map((story) => <StoryCard key={story.id} story={story} />)
                ) : (
                  <EmptyPanel label="No published stories match the current filters." />
                )}
              </section>

              <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
                <h2 className="font-display text-xl font-semibold text-ink">My submissions</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Submitted stories stay private until a moderator publishes them.
                </p>
                <div className="mt-4 grid gap-3">
                  {state.mine.length ? (
                    state.mine.map((story) => (
                      <Link
                        className="focus-ring rounded-lg border border-border bg-surface p-3 transition hover:border-primary"
                        href={`/success-stories/${story.id}`}
                        key={story.id}
                      >
                        <p className="text-sm font-bold text-ink">{story.title}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                          {formatStatus(story.status)}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <EmptyPanel label="No story submissions yet." />
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

export function SuccessStoryCreate() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<SuccessStory | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const story = await createSuccessStory({
        beneficiary_count: optionalInteger(form.beneficiary_count),
        body: form.body,
        cohort_year: optionalInteger(form.cohort_year),
        country: form.country.trim() || null,
        external_url: form.external_url.trim() || null,
        impact_metric: form.impact_metric.trim() || null,
        media_url: form.media_url.trim() || null,
        program: form.program.trim() || null,
        sector: form.sector.trim() || null,
        summary: form.summary,
        title: form.title
      });
      setCreated(story);
      setMessage("Success story submitted for moderator review.");
      setForm(INITIAL_FORM);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Success story submission failed.");
    } finally {
      setBusy(false);
    }
  }

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <AppShell
      description="Submit alumni impact stories for review before they appear in the member story library."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Submit success story"
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
                placeholder="Community agritech fellows scale irrigation"
                required
                value={form.title}
              />
              <TextInput
                label="Country"
                onChange={(value) => updateField("country", value)}
                placeholder="Zambia"
                value={form.country}
              />
              <TextInput
                label="Sector"
                onChange={(value) => updateField("sector", value)}
                placeholder="Agriculture"
                value={form.sector}
              />
              <TextInput
                label="Program"
                onChange={(value) => updateField("program", value)}
                placeholder="Mandela Washington Fellowship"
                value={form.program}
              />
              <TextInput
                label="Cohort year"
                onChange={(value) => updateField("cohort_year", value)}
                placeholder="2024"
                type="number"
                value={form.cohort_year}
              />
              <TextInput
                label="Beneficiaries"
                onChange={(value) => updateField("beneficiary_count", value)}
                placeholder="2400"
                type="number"
                value={form.beneficiary_count}
              />
              <div className="md:col-span-2">
                <TextInput
                  label="Impact metric"
                  onChange={(value) => updateField("impact_metric", value)}
                  placeholder="2,400 farmers reached"
                  value={form.impact_metric}
                />
              </div>
              <div className="md:col-span-2">
                <TextInput
                  label="Media URL"
                  onChange={(value) => updateField("media_url", value)}
                  placeholder="https://example.org/story-photo.jpg"
                  type="url"
                  value={form.media_url}
                />
              </div>
              <div className="md:col-span-2">
                <TextInput
                  label="Source URL"
                  onChange={(value) => updateField("external_url", value)}
                  placeholder="https://example.org/story"
                  type="url"
                  value={form.external_url}
                />
              </div>
            </div>
            <label className="mt-4 block text-sm font-bold text-ink">
              Summary
              <textarea
                className="mt-2 min-h-28 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => updateField("summary", event.target.value)}
                placeholder="One short editorial summary for the story list."
                required
                value={form.summary}
              />
            </label>
            <label className="mt-4 block text-sm font-bold text-ink">
              Full story
              <textarea
                className="mt-2 min-h-56 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => updateField("body", event.target.value)}
                placeholder="Tell the story, include who led it, what changed, and what evidence supports it."
                required
                value={form.body}
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
                href="/success-stories"
              >
                Back to stories
              </Link>
            </div>
          </form>

          <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-white">
              <Sparkles aria-hidden="true" className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold text-ink">Editorial workflow</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              New stories enter the admin review queue on port 3011. Approved stories become
              visible to members in the story library.
            </p>
            {created ? (
              <Link
                className="focus-ring mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
                href={`/success-stories/${created.id}`}
              >
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                View submitted story
              </Link>
            ) : null}
          </aside>
        </div>
      )}
    </AppShell>
  );
}

export function SuccessStoryDetail({ storyId }: { storyId: string }) {
  const [state, setState] = useState<DetailState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    fetchSuccessStory(storyId)
      .then((story) => {
        if (isMounted) {
          setState({ status: "ready", story });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Success story could not be loaded.",
            status: "error"
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [storyId]);

  return (
    <AppShell
      description="Review story details, impact metadata, and publication status."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Success story detail"
    >
      {() => (
        <>
          {state.status === "loading" ? <LoadingPanel label="Loading success story." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
          {state.status === "ready" ? <StoryDetailBody story={state.story} /> : null}
        </>
      )}
    </AppShell>
  );
}

function StoryCard({ story }: { story: SuccessStory }) {
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-white shadow-soft">
      <StoryMedia story={story} />
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold text-ink">{story.title}</h3>
          {story.sector ? <Pill label={story.sector} /> : null}
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{story.summary}</p>
        <StoryMeta story={story} />
        <div className="mt-5">
          <Link
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
            href={`/success-stories/${story.id}`}
          >
            Read story
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function StoryDetailBody({ story }: { story: SuccessStory }) {
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-white shadow-soft">
      <StoryMedia story={story} isLarge />
      <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill label={formatStatus(story.status)} />
            {story.sector ? <Pill label={story.sector} /> : null}
            {story.program ? <Pill label={story.program} /> : null}
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold text-ink">{story.title}</h2>
          <p className="mt-4 text-lg leading-8 text-ink">{story.summary}</p>
          <StoryMeta story={story} />
          <p className="mt-6 whitespace-pre-line text-base leading-8 text-muted">{story.body}</p>
        </div>
        <aside className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted">Story</h3>
          <div className="mt-4 grid gap-3">
            <Fact label="Published" value={formatDate(story.published_at)} />
            <Fact label="Submitted by" value={story.created_by_display_name ?? "Member"} />
            <Fact label="Reviewed by" value={story.reviewed_by_display_name ?? "Pending review"} />
          </div>
          {story.external_url ? (
            <a
              className="focus-ring mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-[#003d7d]"
              href={story.external_url}
              rel="noreferrer"
              target="_blank"
            >
              Open source
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </a>
          ) : null}
        </aside>
      </div>
    </article>
  );
}

function StoryMedia({ isLarge = false, story }: { isLarge?: boolean; story: SuccessStory }) {
  if (story.media_url) {
    return (
      <div
        aria-hidden="true"
        className={`bg-[#dbe9f5] bg-cover bg-center ${isLarge ? "h-72" : "h-52"}`}
        style={{ backgroundImage: `url("${story.media_url}")` }}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-[#e9f3ea] text-primary ${
        isLarge ? "h-72" : "h-52"
      }`}
    >
      <Camera aria-hidden="true" className="h-10 w-10" />
    </div>
  );
}

function StoryMeta({ story }: { story: SuccessStory }) {
  return (
    <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-muted">
      <span className="inline-flex items-center gap-2">
        <Globe2 aria-hidden="true" className="h-4 w-4 text-primary" />
        {story.country || "Pan-African"}
      </span>
      <span className="inline-flex items-center gap-2">
        <GraduationCap aria-hidden="true" className="h-4 w-4 text-primary" />
        {[story.program, story.cohort_year].filter(Boolean).join(" / ") || "Program not set"}
      </span>
      <span className="inline-flex items-center gap-2">
        <Users aria-hidden="true" className="h-4 w-4 text-primary" />
        {formatBeneficiaries(story.beneficiary_count)}
      </span>
      <span className="inline-flex items-center gap-2">
        <Award aria-hidden="true" className="h-4 w-4 text-primary" />
        {story.impact_metric || "Impact metric pending"}
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

function optionalInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatBeneficiaries(value: number | null | undefined) {
  return typeof value === "number" ? `${value.toLocaleString()} beneficiaries` : "Reach not set";
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
