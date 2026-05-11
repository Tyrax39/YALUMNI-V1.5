"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  Filter,
  Globe2,
  Languages,
  Loader2,
  Plus,
  RefreshCcw,
  Send,
  Sparkles
} from "lucide-react";
import {
  MEMBER_ACCESS_ROLES,
  type ResourceFilters,
  type ResourceItem,
  createResource,
  fetchResource,
  fetchResources
} from "@yalumni/frontend-shared";

import { AppShell } from "@/components/platform/app-shell";

type ListState =
  | { status: "loading" }
  | { mine: ResourceItem[]; resources: ResourceItem[]; status: "ready"; total: number }
  | { message: string; status: "error" };

type DetailState =
  | { status: "loading" }
  | { resource: ResourceItem; status: "ready" }
  | { message: string; status: "error" };

type FormState = {
  country: string;
  description: string;
  external_url: string;
  language: string;
  resource_format: string;
  resource_type: string;
  title: string;
  topic: string;
};

const INITIAL_FORM: FormState = {
  country: "",
  description: "",
  external_url: "",
  language: "English",
  resource_format: "LINK",
  resource_type: "GUIDE",
  title: "",
  topic: ""
};

export function ResourceHub() {
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [filters, setFilters] = useState({
    country: "",
    q: "",
    resourceFormat: "",
    resourceType: "",
    topic: ""
  });
  const [reloadKey, setReloadKey] = useState(0);

  const apiFilters = useMemo<ResourceFilters>(
    () => ({
      country: filters.country.trim() || undefined,
      q: filters.q.trim() || undefined,
      resourceFormat: filters.resourceFormat || undefined,
      resourceType: filters.resourceType || undefined,
      topic: filters.topic.trim() || undefined
    }),
    [filters]
  );

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetchResources({ ...apiFilters, limit: 12 }),
      fetchResources({ limit: 6, mine: true })
    ])
      .then(([published, mine]) => {
        if (!isMounted) {
          return;
        }
        setState({
          mine: mine.resources,
          resources: published.resources,
          status: "ready",
          total: published.total
        });
      })
      .catch((caught) => {
        if (!isMounted) {
          return;
        }
        setState({
          message: caught instanceof Error ? caught.message : "Resources could not be loaded.",
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
            href="/resources/new"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Submit resource
          </Link>
        </>
      }
      description="Browse reviewed playbooks, templates, policy briefs, datasets, and practical tools shared by verified alumni."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Resources"
    >
      {() => (
        <div className="grid gap-6">
          <section className="rounded-lg border border-border bg-white p-4 shadow-soft sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                <Filter aria-hidden="true" className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink">Search reviewed resources</h2>
                <p className="text-sm leading-6 text-muted">
                  Results come from the live FastAPI resource library.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-5">
              <TextInput
                label="Search"
                onChange={(value) => updateFilter({ q: value })}
                placeholder="Toolkit, grant, playbook"
                value={filters.q}
              />
              <TextInput
                label="Topic"
                onChange={(value) => updateFilter({ topic: value })}
                placeholder="Fundraising"
                value={filters.topic}
              />
              <TextInput
                label="Country"
                onChange={(value) => updateFilter({ country: value })}
                placeholder="Ghana"
                value={filters.country}
              />
              <SelectInput
                label="Type"
                onChange={(value) => updateFilter({ resourceType: value })}
                options={RESOURCE_TYPE_OPTIONS}
                value={filters.resourceType}
              />
              <SelectInput
                label="Format"
                onChange={(value) => updateFilter({ resourceFormat: value })}
                options={RESOURCE_FORMAT_OPTIONS}
                value={filters.resourceFormat}
              />
            </div>
          </section>

          {state.status === "loading" ? <LoadingPanel label="Loading resources." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}

          {state.status === "ready" ? (
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <section className="grid gap-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-ink">Published resources</h2>
                  <p className="mt-1 text-sm font-semibold text-muted">
                    {state.total} resource{state.total === 1 ? "" : "s"} available
                  </p>
                </div>
                {state.resources.length ? (
                  state.resources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))
                ) : (
                  <EmptyPanel label="No published resources match the current filters." />
                )}
              </section>

              <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
                <h2 className="font-display text-xl font-semibold text-ink">My submissions</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Draft submissions stay private until a moderator publishes them.
                </p>
                <div className="mt-4 grid gap-3">
                  {state.mine.length ? (
                    state.mine.map((resource) => (
                      <Link
                        className="focus-ring rounded-lg border border-border bg-surface p-3 transition hover:border-primary"
                        href={`/resources/${resource.id}`}
                        key={resource.id}
                      >
                        <p className="text-sm font-bold text-ink">{resource.title}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                          {formatStatus(resource.status)}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <EmptyPanel label="No resource submissions yet." />
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

export function ResourceCreate() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<ResourceItem | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const resource = await createResource({
        country: form.country.trim() || null,
        description: form.description,
        external_url: form.external_url.trim() || null,
        language: form.language.trim() || null,
        resource_format: form.resource_format,
        resource_type: form.resource_type,
        title: form.title,
        topic: form.topic.trim() || null
      });
      setCreated(resource);
      setMessage("Resource submitted for moderator review.");
      setForm(INITIAL_FORM);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Resource submission failed.");
    } finally {
      setBusy(false);
    }
  }

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <AppShell
      description="Submit alumni-useful guides, templates, datasets, videos, and toolkits for review before they appear in the shared resource library."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Submit resource"
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
                placeholder="Grant proposal toolkit"
                required
                value={form.title}
              />
              <TextInput
                label="Topic"
                onChange={(value) => updateField("topic", value)}
                placeholder="Fundraising"
                value={form.topic}
              />
              <SelectInput
                label="Type"
                onChange={(value) => updateField("resource_type", value)}
                options={RESOURCE_TYPE_OPTIONS.slice(1)}
                value={form.resource_type}
              />
              <SelectInput
                label="Format"
                onChange={(value) => updateField("resource_format", value)}
                options={RESOURCE_FORMAT_OPTIONS.slice(1)}
                value={form.resource_format}
              />
              <TextInput
                label="Country"
                onChange={(value) => updateField("country", value)}
                placeholder="Ghana"
                value={form.country}
              />
              <TextInput
                label="Language"
                onChange={(value) => updateField("language", value)}
                placeholder="English"
                value={form.language}
              />
              <div className="md:col-span-2">
                <TextInput
                  label="Resource URL"
                  onChange={(value) => updateField("external_url", value)}
                  placeholder="https://example.org/resource"
                  type="url"
                  value={form.external_url}
                />
              </div>
            </div>
            <label className="mt-4 block text-sm font-bold text-ink">
              Description
              <textarea
                className="mt-2 min-h-44 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="What this resource is, who should use it, and any reuse permissions."
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
                href="/resources"
              >
                Back to resources
              </Link>
            </div>
          </form>

          <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-white">
              <Sparkles aria-hidden="true" className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold text-ink">Publishing workflow</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              New resources enter the admin review queue on port 3011. Approved resources become
              visible to members in the library.
            </p>
            {created ? (
              <Link
                className="focus-ring mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
                href={`/resources/${created.id}`}
              >
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                View submitted resource
              </Link>
            ) : null}
          </aside>
        </div>
      )}
    </AppShell>
  );
}

export function ResourceDetail({ resourceId }: { resourceId: string }) {
  const [state, setState] = useState<DetailState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    fetchResource(resourceId)
      .then((resource) => {
        if (isMounted) {
          setState({ resource, status: "ready" });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Resource could not be loaded.",
            status: "error"
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [resourceId]);

  return (
    <AppShell
      description="Review resource metadata, publication status, and source link."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Resource detail"
    >
      {() => (
        <>
          {state.status === "loading" ? <LoadingPanel label="Loading resource." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
          {state.status === "ready" ? <ResourceDetailBody resource={state.resource} /> : null}
        </>
      )}
    </AppShell>
  );
}

const RESOURCE_TYPE_OPTIONS: [string, string][] = [
  ["", "All types"],
  ["GUIDE", "Guide"],
  ["TOOLKIT", "Toolkit"],
  ["TEMPLATE", "Template"],
  ["POLICY_BRIEF", "Policy brief"],
  ["DATASET", "Dataset"],
  ["VIDEO", "Video"],
  ["OTHER", "Other"]
];

const RESOURCE_FORMAT_OPTIONS: [string, string][] = [
  ["", "All formats"],
  ["LINK", "Link"],
  ["DOCUMENT", "Document"],
  ["TEMPLATE", "Template"],
  ["ARTICLE", "Article"],
  ["DATASET", "Dataset"],
  ["VIDEO", "Video"],
  ["OTHER", "Other"]
];

function ResourceCard({ resource }: { resource: ResourceItem }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-ink">{resource.title}</h3>
            <Pill label={formatStatus(resource.resource_type)} />
            <Pill label={formatStatus(resource.resource_format)} />
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            {truncate(resource.description, 260)}
          </p>
          <ResourceMeta resource={resource} />
        </div>
        <div className="flex items-start">
          <Link
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
            href={`/resources/${resource.id}`}
          >
            View
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function ResourceDetailBody({ resource }: { resource: ResourceItem }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill label={formatStatus(resource.status)} />
            <Pill label={formatStatus(resource.resource_type)} />
            <Pill label={formatStatus(resource.resource_format)} />
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold text-ink">{resource.title}</h2>
          <ResourceMeta resource={resource} />
          <p className="mt-6 whitespace-pre-line text-base leading-8 text-muted">
            {resource.description}
          </p>
        </div>
        <aside className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted">Resource</h3>
          <div className="mt-4 grid gap-3">
            <Fact label="Published" value={formatDate(resource.published_at)} />
            <Fact label="Submitted by" value={resource.created_by_display_name ?? "Member"} />
            <Fact label="Reviewed by" value={resource.reviewed_by_display_name ?? "Pending review"} />
          </div>
          {resource.external_url ? (
            <a
              className="focus-ring mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-[#003d7d]"
              href={resource.external_url}
              rel="noreferrer"
              target="_blank"
            >
              Open resource
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </a>
          ) : null}
        </aside>
      </div>
    </article>
  );
}

function ResourceMeta({ resource }: { resource: ResourceItem }) {
  return (
    <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-muted">
      <span className="inline-flex items-center gap-2">
        <BookOpen aria-hidden="true" className="h-4 w-4 text-primary" />
        {resource.topic || "General"}
      </span>
      <span className="inline-flex items-center gap-2">
        <Globe2 aria-hidden="true" className="h-4 w-4 text-primary" />
        {resource.country || "Pan-African"}
      </span>
      <span className="inline-flex items-center gap-2">
        <Languages aria-hidden="true" className="h-4 w-4 text-primary" />
        {resource.language || "Language not set"}
      </span>
      <span className="inline-flex items-center gap-2">
        <FileText aria-hidden="true" className="h-4 w-4 text-primary" />
        {formatStatus(resource.resource_format)}
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
