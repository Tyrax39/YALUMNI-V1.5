"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowRight, Handshake, MessageSquare, Search, Send } from "lucide-react";

import {
  AlumniDirectoryProfile,
  ApiError,
  Conversation,
  createDirectConversation,
  listConversations,
  searchAlumniDirectory
} from "@/lib/api";

type IntroductionRequestsPanelProps = {
  accessToken: string;
  currentUserId: string;
};

type OverviewState =
  | { status: "loading" }
  | {
      conversations: Conversation[];
      profiles: AlumniDirectoryProfile[];
      status: "ready";
      totalConversations: number;
    }
  | { message: string; status: "error" };

type SearchState =
  | { status: "idle" }
  | { profiles: AlumniDirectoryProfile[]; status: "ready" }
  | { message: string; status: "error" }
  | { status: "loading" };

const emptyConversations: Conversation[] = [];
const emptyProfiles: AlumniDirectoryProfile[] = [];

export function IntroductionRequestsPanel({
  accessToken,
  currentUserId
}: IntroductionRequestsPanelProps) {
  const router = useRouter();
  const [overviewState, setOverviewState] = useState<OverviewState>({ status: "loading" });
  const [searchState, setSearchState] = useState<SearchState>({ status: "idle" });
  const [searchQuery, setSearchQuery] = useState("");
  const [introNote, setIntroNote] = useState("");
  const [busyProfileId, setBusyProfileId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const conversations =
    overviewState.status === "ready" ? overviewState.conversations : emptyConversations;
  const suggestedProfiles =
    overviewState.status === "ready" ? overviewState.profiles : emptyProfiles;
  const unreadCount = useMemo(
    () => conversations.reduce((total, conversation) => total + conversation.unread_count, 0),
    [conversations]
  );
  const recentConversationIdsByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const conversation of conversations) {
      const participant = conversation.participants.find((item) => item.user_id !== currentUserId);
      if (participant) {
        map.set(participant.user_id, conversation.id);
      }
    }
    return map;
  }, [conversations, currentUserId]);
  const reusedThreadCount = useMemo(
    () =>
      suggestedProfiles.filter((profile) => recentConversationIdsByUserId.has(profile.user_id)).length,
    [recentConversationIdsByUserId, suggestedProfiles]
  );
  const freshReachCount = useMemo(
    () =>
      suggestedProfiles.filter((profile) => !recentConversationIdsByUserId.has(profile.user_id)).length,
    [recentConversationIdsByUserId, suggestedProfiles]
  );
  const introductionPriorities = useMemo(
    () =>
      buildIntroductionPriorities({
        freshReachCount,
        suggestedProfilesCount: suggestedProfiles.length,
        totalConversations:
          overviewState.status === "ready" ? overviewState.totalConversations : 0,
        unreadCount
      }),
    [freshReachCount, overviewState, suggestedProfiles.length, unreadCount]
  );

  async function loadOverview() {
    setOverviewState({ status: "loading" });
    try {
      const [conversationResponse, profileResponse] = await Promise.all([
        listConversations(accessToken, { limit: 6 }),
        searchAlumniDirectory(accessToken, { limit: 6, sort: "recent" })
      ]);
      setOverviewState({
        conversations: conversationResponse.conversations,
        profiles: profileResponse.profiles.filter((profile) => profile.user_id !== currentUserId),
        status: "ready",
        totalConversations: conversationResponse.total
      });
    } catch (caught) {
      setOverviewState({
        message:
          caught instanceof ApiError
            ? caught.message
            : "Introduction workspace data could not be loaded.",
        status: "error"
      });
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setSearchState({ status: "loading" });
    try {
      const response = await searchAlumniDirectory(accessToken, {
        limit: 8,
        q: searchQuery.trim(),
        sort: searchQuery.trim() ? "name" : "recent"
      });
      setSearchState({
        profiles: response.profiles.filter((profile) => profile.user_id !== currentUserId),
        status: "ready"
      });
    } catch (caught) {
      setSearchState({
        message: caught instanceof ApiError ? caught.message : "Member search could not be loaded.",
        status: "error"
      });
    }
  }

  async function handleStartConversation(profile: AlumniDirectoryProfile) {
    const existingConversationId = recentConversationIdsByUserId.get(profile.user_id);
    if (existingConversationId) {
      router.push(`/messages/${existingConversationId}`);
      return;
    }

    setBusyProfileId(profile.user_id);
    setNotice(null);
    try {
      const conversation = await createDirectConversation(accessToken, {
        initial_message: introNote.trim() || null,
        participant_user_id: profile.user_id
      });
      setIntroNote("");
      router.push(`/messages/${conversation.id}`);
      await loadOverview();
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.message : "Introduction could not be started.");
    } finally {
      setBusyProfileId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          detail="Live direct-message threads tied to your account."
          label="Active threads"
          value={
            overviewState.status === "ready"
              ? overviewState.totalConversations.toLocaleString()
              : "..."
          }
        />
        <MetricCard
          detail="Replies waiting across recent introduction conversations."
          label="Unread replies"
          value={overviewState.status === "ready" ? unreadCount.toLocaleString() : "..."}
        />
        <MetricCard
          detail="Verified members surfaced from the live directory."
          label="Suggested alumni"
          value={
            overviewState.status === "ready" ? suggestedProfiles.length.toLocaleString() : "..."
          }
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Handshake aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                Start an introduction
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Use verified member search and open a direct-message thread for the handoff.
              </p>
            </div>
          </div>

          {notice ? (
            <p className="mt-5 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-muted">
              {notice}
            </p>
          ) : null}

          <form className="mt-5 grid gap-4" onSubmit={handleSearch}>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Search alumni
              <div className="flex gap-2">
                <input
                  className="h-12 min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 text-sm font-normal text-ink outline-none transition focus:border-primary"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search name, country, sector, skill, or organization"
                  value={searchQuery}
                />
                <button
                  className="focus-ring inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white transition hover:bg-[#003d7d]"
                  type="submit"
                >
                  <Search aria-label="Search alumni" className="h-5 w-5" />
                </button>
              </div>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Optional introduction note
              <textarea
                className="min-h-24 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-normal leading-6 text-ink outline-none transition focus:border-primary"
                maxLength={2000}
                onChange={(event) => setIntroNote(event.target.value)}
                placeholder="Add context for why you are reaching out."
                value={introNote}
              />
            </label>
          </form>

          <ProfileResults
            busyProfileId={busyProfileId}
            existingConversationIdsByUserId={recentConversationIdsByUserId}
            fallbackProfiles={suggestedProfiles}
            onStartConversation={handleStartConversation}
            searchState={searchState}
          />
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                  <MessageSquare aria-hidden="true" className="h-5 w-5" />
                </span>
                <h2 className="font-display text-2xl font-semibold text-ink">
                  Recent handoffs
                </h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                These are live direct-message conversations that can carry introduction follow-ups.
              </p>
            </div>
            <Link
              className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
              href={conversations[0] ? `/messages/${conversations[0].id}` : "/messages"}
            >
              {conversations[0] ? "Open latest thread" : "Open inbox"}
            </Link>
          </div>

          <div className="mt-5">
            {overviewState.status === "loading" ? (
              <p className="rounded-lg border border-border bg-surface px-4 py-4 text-sm font-semibold text-muted">
                Loading introduction threads...
              </p>
            ) : null}
            {overviewState.status === "error" ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-danger">
                {overviewState.message}
              </p>
            ) : null}
            {overviewState.status === "ready" ? (
              <div className="grid gap-3">
                {conversations.length === 0 ? (
                  <p className="rounded-lg border border-border bg-surface px-4 py-4 text-sm font-semibold text-muted">
                    No introduction threads yet. Search for a verified alumnus to start one.
                  </p>
                ) : null}
                {conversations.map((conversation) => (
                  <ConversationRow
                    conversation={conversation}
                    currentUserId={currentUserId}
                    key={conversation.id}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">Handoff priorities</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Live readiness signals from the current thread list and verified alumni suggestions.
              </p>
            </div>
            <span className="rounded-md border border-border bg-surface px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
              Live
            </span>
          </div>
          <div className="mt-5 grid gap-3">
            {introductionPriorities.map((item) => (
              <PriorityRow item={item} key={item.title} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <h2 className="font-display text-2xl font-semibold text-ink">Introduction signals</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Quick-read counts showing where this route can reuse existing threads versus start fresh handoffs.
          </p>
          <div className="mt-5 grid gap-3">
            <SignalRow label="Reusable live threads" value={String(reusedThreadCount)} />
            <SignalRow label="Fresh outreach targets" value={String(freshReachCount)} />
            <SignalRow label="Unread follow-ups" value={String(unreadCount)} />
            <SignalRow
              label="Suggested verified alumni"
              value={overviewState.status === "ready" ? String(suggestedProfiles.length) : "..."}
            />
            <SignalRow
              label="Introduction coverage"
              value={
                suggestedProfiles.length > 0
                  ? `${Math.round((reusedThreadCount / suggestedProfiles.length) * 100)}%`
                  : "0%"
              }
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-secondary">
              Backend status
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
              Live messaging now powers this route
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              The dedicated introduction approval workflow still needs a future backend module.
              This screen now avoids fixture rows and uses existing live directory and direct-message
              APIs for the current member workflow.
            </p>
          </div>
          <span className="rounded-md border border-border bg-surface px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
            Partial backend
          </span>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-3 font-display text-3xl font-bold text-primary">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
    </article>
  );
}

type PriorityItem = {
  body: string;
  label: string;
  title: string;
  tone: "neutral" | "warning";
};

function PriorityRow({ item }: { item: PriorityItem }) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{item.title}</p>
        <p className="mt-1 text-xs leading-5 text-muted">{item.body}</p>
      </div>
      <span
        className={
          item.tone === "warning"
            ? "inline-flex min-h-9 items-center rounded-lg bg-amber-100 px-3 text-xs font-bold uppercase tracking-[0.1em] text-amber-900"
            : "inline-flex min-h-9 items-center rounded-lg border border-border bg-white px-3 text-xs font-bold uppercase tracking-[0.1em] text-muted"
        }
      >
        {item.label}
      </span>
    </article>
  );
}

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3">
      <span className="text-sm font-semibold text-muted">{label}</span>
      <span className="text-sm font-bold text-ink">{value}</span>
    </div>
  );
}

function ProfileResults({
  busyProfileId,
  existingConversationIdsByUserId,
  fallbackProfiles,
  onStartConversation,
  searchState
}: {
  busyProfileId: string | null;
  existingConversationIdsByUserId: Map<string, string>;
  fallbackProfiles: AlumniDirectoryProfile[];
  onStartConversation: (profile: AlumniDirectoryProfile) => void;
  searchState: SearchState;
}) {
  if (searchState.status === "loading") {
    return <p className="mt-5 text-sm font-semibold text-muted">Searching verified alumni...</p>;
  }

  if (searchState.status === "error") {
    return <p className="mt-5 text-sm font-semibold text-danger">{searchState.message}</p>;
  }

  const profiles = searchState.status === "ready" ? searchState.profiles : fallbackProfiles;
  const title = searchState.status === "ready" ? "Search results" : "Suggested verified alumni";

  return (
    <div className="mt-5 grid gap-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-secondary">{title}</p>
      {profiles.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-4 text-sm font-semibold text-muted">
          No verified alumni are available for this view yet.
        </p>
      ) : null}
      {profiles.map((profile) => (
        <ProfileResultRow
          busyProfileId={busyProfileId}
          existingConversationId={existingConversationIdsByUserId.get(profile.user_id) ?? null}
          key={profile.user_id}
          onStartConversation={onStartConversation}
          profile={profile}
        />
      ))}
    </div>
  );
}

function ConversationRow({
  conversation,
  currentUserId
}: {
  conversation: Conversation;
  currentUserId: string;
}) {
  const participant = conversation.participants.find(
    (item) => item.user_id !== currentUserId
  );
  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">
            {participant?.display_name ?? "Conversation"}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">
            {conversation.last_message?.body ?? "No messages have been sent yet."}
          </p>
        </div>
        {conversation.unread_count > 0 ? (
          <span className="rounded-md bg-secondary px-2 py-1 text-xs font-bold text-white">
            {conversation.unread_count} unread
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
          {formatDateTime(conversation.last_message_at ?? conversation.created_at)}
        </p>
        <Link
          className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
          href={`/messages/${conversation.id}`}
        >
          Open thread
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function formatProfileSummary(profile: AlumniDirectoryProfile) {
  return [profile.country, profile.sector, profile.headline, profile.organization]
    .filter(Boolean)
    .join(" - ");
}

function ProfileResultRow({
  busyProfileId,
  existingConversationId,
  onStartConversation,
  profile
}: {
  busyProfileId: string | null;
  existingConversationId: string | null;
  onStartConversation: (profile: AlumniDirectoryProfile) => void;
  profile: AlumniDirectoryProfile;
}) {
  if (existingConversationId) {
    return (
      <article className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">{profile.display_name}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            {formatProfileSummary(profile) || "Verified YALUMNI member"}
          </p>
        </div>
        <Link
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
          href={`/messages/${existingConversationId}`}
        >
          <MessageSquare aria-hidden="true" className="h-4 w-4" />
          Open thread
        </Link>
      </article>
    );
  }

  return (
    <article className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <h3 className="font-display text-lg font-semibold text-ink">{profile.display_name}</h3>
        <p className="mt-1 text-sm leading-6 text-muted">
          {formatProfileSummary(profile) || "Verified YALUMNI member"}
        </p>
      </div>
      <button
        className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={busyProfileId === profile.user_id}
        onClick={() => onStartConversation(profile)}
        type="button"
      >
        <Send aria-hidden="true" className="h-4 w-4" />
        {busyProfileId === profile.user_id ? "Starting..." : "Start thread"}
      </button>
    </article>
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Date pending";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date pending";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function buildIntroductionPriorities({
  freshReachCount,
  suggestedProfilesCount,
  totalConversations,
  unreadCount
}: {
  freshReachCount: number;
  suggestedProfilesCount: number;
  totalConversations: number;
  unreadCount: number;
}): PriorityItem[] {
  const items: PriorityItem[] = [];

  if (unreadCount > 0) {
    items.push({
      body: `${unreadCount} unread repl${unreadCount === 1 ? "y is" : "ies are"} waiting across current introduction threads.`,
      label: "Follow-up",
      title: "Reply to active handoffs",
      tone: "warning"
    });
  }

  if (freshReachCount > 0) {
    items.push({
      body: `${freshReachCount} suggested verified alumn${freshReachCount === 1 ? "us is" : "i are"} available without an existing live thread.`,
      label: "Outreach",
      title: "Start fresh introductions",
      tone: "neutral"
    });
  }

  if (suggestedProfilesCount > 0 && freshReachCount === 0) {
    items.push({
      body: "Current suggested alumni already have live threads, so reuse and deepen existing conversations first.",
      label: "Reuse",
      title: "Continue current relationships",
      tone: "neutral"
    });
  }

  if (totalConversations === 0 && suggestedProfilesCount === 0) {
    items.push({
      body: "No recent conversations or suggested alumni are loaded yet for this member workspace.",
      label: "Waiting",
      title: "Refresh when directory data is available",
      tone: "warning"
    });
  }

  if (!items.length) {
    items.push({
      body: "Live thread coverage and directory suggestions are currently balanced for this introductions workspace.",
      label: "Stable",
      title: "Maintain introduction flow",
      tone: "neutral"
    });
  }

  return items.slice(0, 4);
}
