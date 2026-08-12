"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { BarChart3, Compass, MapPinned, Users } from "lucide-react";
import { ADMIN_ROLES } from "@yalumni/frontend-shared";

import { ApiError, type Community, listCommunities } from "@/lib/api";
import { AppShell } from "@/components/platform/app-shell";

const chapterPageSize = 100;
const chapterTypes = ["COUNTRY_CHAPTER", "CITY_CHAPTER"] as const;

type ChaptersState =
  | { status: "loading" }
  | { message: string; status: "error" }
  | {
      chapters: Community[];
      hasMore: boolean;
      status: "ready";
      total: number;
    };

export function AdminChaptersPage() {
  return (
    <AppShell
      allowLocalAdminBootstrap
      description="Review live chapter inventory, membership footprint, and chapter entry points before moving into detailed leader and analytics routes."
      eyebrow="Admin chapters"
      requiredRoles={ADMIN_ROLES}
      title="Chapter management"
    >
      {({ accessToken }) => <AdminChaptersContent accessToken={accessToken} />}
    </AppShell>
  );
}

function AdminChaptersContent({ accessToken }: { accessToken: string }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | (typeof chapterTypes)[number]>("ALL");
  const [state, setState] = useState<ChaptersState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function loadChapters() {
      setState({ status: "loading" });

      try {
        const responses = await Promise.all(
          chapterTypes.map((communityType) =>
            listCommunities(accessToken, {
              communityType,
              limit: chapterPageSize,
              membership: "all",
              offset: 0
            })
          )
        );

        if (!isMounted) {
          return;
        }

        const chapterMap = new Map<string, Community>();
        for (const response of responses) {
          for (const chapter of response.communities) {
            chapterMap.set(chapter.id, chapter);
          }
        }

        const chapters = Array.from(chapterMap.values()).sort((left, right) => {
          if (right.member_count !== left.member_count) {
            return right.member_count - left.member_count;
          }

          return left.name.localeCompare(right.name);
        });

        setState({
          chapters,
          hasMore: responses.some((response) => response.has_more),
          status: "ready",
          total: responses.reduce((sum, response) => sum + response.total, 0)
        });
      } catch (caught) {
        if (!isMounted) {
          return;
        }

        setState({
          message:
            caught instanceof ApiError ? caught.message : "Chapter management data could not be loaded.",
          status: "error"
        });
      }
    }

    void loadChapters();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  if (state.status === "loading") {
    return <LoadingState />;
  }

  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
        {state.message}
      </div>
    );
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filteredChapters = state.chapters.filter((chapter) => {
    if (typeFilter !== "ALL" && chapter.community_type !== typeFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const searchableValues = [
      chapter.name,
      chapter.country,
      chapter.city,
      chapter.sector,
      chapter.program_name
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableValues.includes(normalizedQuery);
  });

  const totalMembers = state.chapters.reduce((sum, chapter) => sum + chapter.member_count, 0);
  const countryChapterCount = state.chapters.filter(
    (chapter) => chapter.community_type === "COUNTRY_CHAPTER"
  ).length;
  const cityChapterCount = state.chapters.filter(
    (chapter) => chapter.community_type === "CITY_CHAPTER"
  ).length;

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6 xl:grid-cols-[1fr_auto] xl:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">
            Live chapter foundation
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">
            Review chapters before drilling into operations
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            This hub now reads the current communities APIs for country and city chapters, then
            links directly into the live community detail, leader dashboard, and chapter analytics
            routes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <StatusBadge label="live API" tone="primary" />
          <StatusBadge label="admin only" tone="neutral" />
          {state.hasMore ? <StatusBadge label="partial list" tone="warning" /> : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          detail="Country and city chapter records loaded from the live communities APIs."
          icon={<Compass aria-hidden="true" className="h-5 w-5" />}
          label="Chapters loaded"
          value={String(state.chapters.length)}
        />
        <MetricCard
          detail="Combined active roster counts exposed by current chapter records."
          icon={<Users aria-hidden="true" className="h-5 w-5" />}
          label="Visible members"
          value={String(totalMembers)}
        />
        <MetricCard
          detail="Country-level chapter entries available in the current platform data."
          icon={<MapPinned aria-hidden="true" className="h-5 w-5" />}
          label="Country chapters"
          value={String(countryChapterCount)}
        />
        <MetricCard
          detail="Deeper aggregation and governance workflows still remain a follow-up slice."
          icon={<BarChart3 aria-hidden="true" className="h-5 w-5" />}
          label="Analytics depth"
          value="partial"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <h3 className="font-display text-2xl font-semibold text-ink">Coverage</h3>
          <div className="mt-5 grid gap-3">
            <SnapshotRow
              label="Source routes"
              value="Community detail, leader dashboard, chapter analytics"
            />
            <SnapshotRow label="Total chapter records" value={String(state.total)} />
            <SnapshotRow label="Loaded records" value={String(state.chapters.length)} />
            <SnapshotRow label="City chapters" value={String(cityChapterCount)} />
            <SnapshotRow label="Join policies" value="live community settings" />
            <SnapshotRow label="Visibility" value="live community settings" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <h3 className="font-display text-2xl font-semibold text-ink">What stays next</h3>
          <div className="mt-5 grid gap-3">
            <SnapshotRow label="Roster review" value="Use live community detail pages" />
            <SnapshotRow label="Pending approvals" value="Leader dashboard route" />
            <SnapshotRow label="Reports and activity" value="Chapter analytics route" />
            <SnapshotRow label="Leader reassignment" value="Community ownership transfer" />
            <SnapshotRow label="Exports and aggregation" value="Follow-up backend slice" />
            <SnapshotRow label="Scope preserved" value="Existing community flows unchanged" />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="font-display text-2xl font-semibold text-ink">Chapter list</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Filter the live chapter inventory and jump into the already-implemented operational
              routes for each chapter.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Search
              <input
                className="h-12 rounded-lg border border-border bg-white px-4 text-sm font-normal text-ink outline-none transition focus:border-primary"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Chapter, country, sector"
                type="search"
                value={query}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Type
              <select
                className="h-12 rounded-lg border border-border bg-white px-4 text-sm font-normal text-ink outline-none transition focus:border-primary"
                onChange={(event) =>
                  setTypeFilter(event.target.value as "ALL" | (typeof chapterTypes)[number])
                }
                value={typeFilter}
              >
                <option value="ALL">All chapters</option>
                <option value="COUNTRY_CHAPTER">Country chapter</option>
                <option value="CITY_CHAPTER">City chapter</option>
              </select>
            </label>
          </div>
        </div>

        {state.hasMore ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            Showing the first {state.chapters.length} chapter records from the live APIs. Broader
            pagination and cross-chapter aggregation remain follow-up work.
          </p>
        ) : null}

        <div className="mt-5 grid gap-4">
          {filteredChapters.length ? (
            filteredChapters.map((chapter) => (
              <article
                className="grid gap-4 rounded-lg border border-border bg-surface p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto]"
                key={chapter.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-display text-xl font-semibold text-ink">{chapter.name}</h4>
                    <StatusBadge label={formatLabel(chapter.community_type)} tone="neutral" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {[chapter.city, chapter.country].filter(Boolean).join(", ") || "Network-wide"}
                    {" · "}
                    {chapter.sector ?? chapter.program_name ?? "General focus"}
                  </p>
                  {chapter.description ? (
                    <p className="mt-3 text-sm leading-6 text-muted">
                      {truncateText(chapter.description, 180)}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <SnapshotRow label="Members" value={String(chapter.member_count)} />
                  <SnapshotRow label="Join policy" value={formatLabel(chapter.join_policy)} />
                  <SnapshotRow label="Visibility" value={formatLabel(chapter.visibility)} />
                </div>

                <div className="flex flex-col gap-2 lg:min-w-[220px]">
                  <ActionLink href={`/communities/${chapter.id}`} title="Open community detail" />
                  <ActionLink
                    href={`/communities/${chapter.id}/dashboard`}
                    title="Open leader dashboard"
                  />
                  <ActionLink
                    href={`/admin/chapters/${chapter.id}/analytics`}
                    title="Open analytics"
                  />
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-lg border border-border bg-surface p-4 text-sm leading-6 text-muted">
              No chapters matched the current filters.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="h-28 animate-pulse rounded-lg border border-border bg-white shadow-soft" key={index} />
      ))}
    </div>
  );
}

function MetricCard({
  detail,
  icon,
  label,
  value
}: {
  detail: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-muted">{label}</p>
        <div className="text-secondary">{icon}</div>
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-primary">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-white px-4 py-3">
      <span className="text-sm font-semibold text-muted">{label}</span>
      <span className="text-right text-sm font-bold text-ink">{value}</span>
    </div>
  );
}

function ActionLink({ href, title }: { href: string; title: string }) {
  return (
    <Link
      className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
      href={href}
    >
      {title}
    </Link>
  );
}

function StatusBadge({
  label,
  tone
}: {
  label: string;
  tone: "neutral" | "primary" | "warning";
}) {
  const className =
    tone === "primary"
      ? "inline-flex min-h-9 items-center rounded-lg bg-primary px-3 text-xs font-bold uppercase tracking-[0.1em] text-white"
      : tone === "warning"
        ? "inline-flex min-h-9 items-center rounded-lg bg-amber-100 px-3 text-xs font-bold uppercase tracking-[0.1em] text-amber-800"
        : "inline-flex min-h-9 items-center rounded-lg border border-border bg-surface px-3 text-xs font-bold uppercase tracking-[0.1em] text-muted";

  return <span className={className}>{label}</span>;
}

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}
