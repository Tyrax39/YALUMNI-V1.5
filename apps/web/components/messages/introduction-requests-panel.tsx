"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowRight,
  Check,
  Handshake,
  MessageSquare,
  Search,
  Send,
  X
} from "lucide-react";

import {
  AlumniDirectoryProfile,
  ApiError,
  Conversation,
  IntroductionRequest,
  acceptIntroductionRequest,
  cancelIntroductionRequest,
  createIntroductionRequest,
  declineIntroductionRequest,
  listConversations,
  listIntroductionRequests,
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
      introductionRequests: { incoming: IntroductionRequest[]; outgoing: IntroductionRequest[] };
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
const emptyRequests = { incoming: [] as IntroductionRequest[], outgoing: [] as IntroductionRequest[] };

export function IntroductionRequestsPanel({
  accessToken,
  currentUserId
}: IntroductionRequestsPanelProps) {
  const router = useRouter();
  const [overviewState, setOverviewState] = useState<OverviewState>({ status: "loading" });
  const [searchState, setSearchState] = useState<SearchState>({ status: "idle" });
  const [searchQuery, setSearchQuery] = useState("");
  const [introNote, setIntroNote] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const conversations =
    overviewState.status === "ready" ? overviewState.conversations : emptyConversations;
  const suggestedProfiles =
    overviewState.status === "ready" ? overviewState.profiles : emptyProfiles;
  const requests =
    overviewState.status === "ready" ? overviewState.introductionRequests : emptyRequests;
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
  const pendingOutgoingByRecipientId = useMemo(() => {
    const map = new Map<string, IntroductionRequest>();
    for (const request of requests.outgoing) {
      if (request.status === "PENDING") {
        map.set(request.recipient_user_id, request);
      }
    }
    return map;
  }, [requests.outgoing]);
  const incomingPendingCount = useMemo(
    () => requests.incoming.filter((request) => request.status === "PENDING").length,
    [requests.incoming]
  );
  const outgoingPendingCount = useMemo(
    () => requests.outgoing.filter((request) => request.status === "PENDING").length,
    [requests.outgoing]
  );
  const acceptedRequestCount = useMemo(
    () =>
      [...requests.incoming, ...requests.outgoing].filter(
        (request) => request.status === "ACCEPTED"
      ).length,
    [requests.incoming, requests.outgoing]
  );
  const staleConversationCount = useMemo(
    () =>
      conversations.filter((conversation) => {
        const timestamp = conversation.last_message_at ?? conversation.created_at;
        const ageDays = getConversationAgeDays(timestamp);
        return ageDays !== null && ageDays >= 14;
      }).length,
    [conversations]
  );
  const newestConversationAge = useMemo(() => {
    if (!conversations.length) {
      return "No live threads";
    }

    const newestTimestamp = conversations.reduce<string | null>((latest, conversation) => {
      const candidate = conversation.last_message_at ?? conversation.created_at;
      if (!latest) {
        return candidate;
      }

      return new Date(candidate).getTime() > new Date(latest).getTime() ? candidate : latest;
    }, null);

    return formatConversationAge(newestTimestamp);
  }, [conversations]);
  const freshReachCount = useMemo(
    () =>
      suggestedProfiles.filter(
        (profile) =>
          !recentConversationIdsByUserId.has(profile.user_id) &&
          !pendingOutgoingByRecipientId.has(profile.user_id)
      ).length,
    [pendingOutgoingByRecipientId, recentConversationIdsByUserId, suggestedProfiles]
  );
  const introductionPriorities = useMemo(
    () =>
      buildIntroductionPriorities({
        acceptedRequestCount,
        freshReachCount,
        incomingPendingCount,
        outgoingPendingCount,
        staleConversationCount,
        totalConversations: overviewState.status === "ready" ? overviewState.totalConversations : 0,
        unreadCount
      }),
    [
      acceptedRequestCount,
      freshReachCount,
      incomingPendingCount,
      outgoingPendingCount,
      overviewState,
      staleConversationCount,
      unreadCount
    ]
  );

  async function loadOverview() {
    setOverviewState({ status: "loading" });
    try {
      const [conversationResponse, profileResponse, introductionResponse] = await Promise.all([
        listConversations(accessToken, { limit: 6 }),
        searchAlumniDirectory(accessToken, { limit: 6, sort: "recent" }),
        listIntroductionRequests(accessToken)
      ]);
      setOverviewState({
        conversations: conversationResponse.conversations,
        introductionRequests: {
          incoming: introductionResponse.incoming,
          outgoing: introductionResponse.outgoing
        },
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

  async function handleCreateRequest(profile: AlumniDirectoryProfile) {
    const existingConversationId = recentConversationIdsByUserId.get(profile.user_id);
    if (existingConversationId) {
      router.push(`/messages/${existingConversationId}`);
      return;
    }

    setBusyKey(`request:${profile.user_id}`);
    setNotice(null);
    try {
      await createIntroductionRequest(accessToken, {
        note: introNote.trim() || null,
        recipient_user_id: profile.user_id
      });
      setIntroNote("");
      setNotice(`Introduction request sent to ${profile.display_name}.`);
      await loadOverview();
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.message : "Introduction could not be requested.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleAcceptRequest(request: IntroductionRequest) {
    setBusyKey(`accept:${request.id}`);
    setNotice(null);
    try {
      const updated = await acceptIntroductionRequest(accessToken, request.id);
      setNotice(`Introduction request accepted for ${updated.requester_display_name}.`);
      await loadOverview();
      if (updated.conversation_id) {
        router.push(`/messages/${updated.conversation_id}`);
      }
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.message : "Introduction could not be accepted.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDeclineRequest(request: IntroductionRequest) {
    setBusyKey(`decline:${request.id}`);
    setNotice(null);
    try {
      await declineIntroductionRequest(accessToken, request.id);
      setNotice(`Introduction request declined for ${request.requester_display_name}.`);
      await loadOverview();
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.message : "Introduction could not be declined.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCancelRequest(request: IntroductionRequest) {
    setBusyKey(`cancel:${request.id}`);
    setNotice(null);
    try {
      await cancelIntroductionRequest(accessToken, request.id);
      setNotice(`Introduction request withdrawn for ${request.recipient_display_name}.`);
      await loadOverview();
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.message : "Introduction could not be withdrawn.");
    } finally {
      setBusyKey(null);
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
          detail="Requests waiting for your response in this workflow."
          label="Incoming requests"
          value={overviewState.status === "ready" ? incomingPendingCount.toLocaleString() : "..."}
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
                Request an introduction
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Search verified alumni, request a handoff, and let the recipient accept before a new thread opens.
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
                maxLength={1200}
                onChange={(event) => setIntroNote(event.target.value)}
                placeholder="Add context for why you want to connect."
                value={introNote}
              />
            </label>
          </form>

          <ProfileResults
            busyKey={busyKey}
            existingConversationIdsByUserId={recentConversationIdsByUserId}
            fallbackProfiles={suggestedProfiles}
            onRequestIntroduction={handleCreateRequest}
            pendingOutgoingByRecipientId={pendingOutgoingByRecipientId}
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
                  Pending approvals
                </h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                Incoming requests need your decision, while accepted requests move into live direct-message threads.
              </p>
            </div>
            <Link
              className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
              href="/messages"
            >
              Open inbox
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            {overviewState.status === "loading" ? (
              <p className="rounded-lg border border-border bg-surface px-4 py-4 text-sm font-semibold text-muted">
                Loading introduction requests...
              </p>
            ) : null}
            {overviewState.status === "error" ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-danger">
                {overviewState.message}
              </p>
            ) : null}
            {overviewState.status === "ready" ? (
              <>
                {requests.incoming.length === 0 ? (
                  <EmptyState message="No incoming introduction requests are waiting for review." />
                ) : null}
                {requests.incoming.map((request) => (
                  <IntroductionRequestRow
                    busyKey={busyKey}
                    currentUserId={currentUserId}
                    key={request.id}
                    onAccept={handleAcceptRequest}
                    onDecline={handleDeclineRequest}
                    request={request}
                  />
                ))}
              </>
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
                Readiness signals from live request queues, active message threads, and verified alumni suggestions.
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
            Quick-read counts showing where this route can reuse threads, process pending approvals, and open fresh outreach.
          </p>
          <div className="mt-5 grid gap-3">
            <SignalRow label="Incoming pending" value={String(incomingPendingCount)} />
            <SignalRow label="Outgoing pending" value={String(outgoingPendingCount)} />
            <SignalRow label="Accepted handoffs" value={String(acceptedRequestCount)} />
            <SignalRow label="Fresh outreach targets" value={String(freshReachCount)} />
            <SignalRow label="Stale handoffs" value={String(staleConversationCount)} />
            <SignalRow label="Newest thread age" value={newestConversationAge} />
            <SignalRow label="Unread follow-ups" value={String(unreadCount)} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
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
                Accepted introductions and reused relationships continue inside the live inbox.
              </p>
            </div>
            <Link
              className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
              href={conversations[0] ? `/messages/${conversations[0].id}` : "/messages"}
            >
              {conversations[0] ? "Open latest thread" : "Open inbox"}
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {overviewState.status === "ready" && conversations.length === 0 ? (
              <EmptyState message="No introduction threads yet. Request a new introduction or accept an incoming one." />
            ) : null}
            {conversations.map((conversation) => (
              <ConversationRow
                conversation={conversation}
                currentUserId={currentUserId}
                key={conversation.id}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-secondary">
                Workflow status
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
                Introduction approval flow is now live
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                This route now uses a dedicated introduction-request workflow with accept and decline actions, while preserving existing direct-message threads for accepted or already-established relationships.
              </p>
            </div>
            <span className="rounded-md border border-border bg-surface px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
              Live backend
            </span>
          </div>
              <div className="mt-5 grid gap-3">
                {requests.outgoing.length === 0 ? (
                  <EmptyState message="No outgoing requests have been sent from this workspace yet." />
                ) : (
                  requests.outgoing.slice(0, 4).map((request) => (
                    <IntroductionRequestSummaryRow
                      busyKey={busyKey}
                      key={request.id}
                      onCancel={handleCancelRequest}
                      request={request}
                    />
                  ))
                )}
              </div>
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

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-border bg-surface px-4 py-4 text-sm font-semibold text-muted">
      {message}
    </p>
  );
}

function ProfileResults({
  busyKey,
  existingConversationIdsByUserId,
  fallbackProfiles,
  onRequestIntroduction,
  pendingOutgoingByRecipientId,
  searchState
}: {
  busyKey: string | null;
  existingConversationIdsByUserId: Map<string, string>;
  fallbackProfiles: AlumniDirectoryProfile[];
  onRequestIntroduction: (profile: AlumniDirectoryProfile) => void;
  pendingOutgoingByRecipientId: Map<string, IntroductionRequest>;
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
        <EmptyState message="No verified alumni are available for this view yet." />
      ) : null}
      {profiles.map((profile) => (
        <ProfileResultRow
          busyKey={busyKey}
          existingConversationId={existingConversationIdsByUserId.get(profile.user_id) ?? null}
          key={profile.user_id}
          onRequestIntroduction={onRequestIntroduction}
          pendingRequest={pendingOutgoingByRecipientId.get(profile.user_id) ?? null}
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
  const participant = conversation.participants.find((item) => item.user_id !== currentUserId);
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

function IntroductionRequestRow({
  busyKey,
  currentUserId,
  onAccept,
  onDecline,
  request
}: {
  busyKey: string | null;
  currentUserId: string;
  onAccept: (request: IntroductionRequest) => void;
  onDecline: (request: IntroductionRequest) => void;
  request: IntroductionRequest;
}) {
  const isIncoming = request.recipient_user_id === currentUserId;
  const counterpart = isIncoming ? request.requester_display_name : request.recipient_display_name;
  const busyAccept = busyKey === `accept:${request.id}`;
  const busyDecline = busyKey === `decline:${request.id}`;

  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-ink">{counterpart}</h3>
            <span className="rounded-md border border-border bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
              {formatRequestStatus(request.status)}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">
            {request.note || "No introduction note was attached to this request."}
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-muted">
            {formatDateTime(request.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {request.status === "PENDING" && isIncoming ? (
            <>
              <button
                className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busyAccept || busyDecline}
                onClick={() => onAccept(request)}
                type="button"
              >
                <Check aria-hidden="true" className="h-4 w-4" />
                {busyAccept ? "Accepting..." : "Accept"}
              </button>
              <button
                className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busyAccept || busyDecline}
                onClick={() => onDecline(request)}
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
                {busyDecline ? "Declining..." : "Decline"}
              </button>
            </>
          ) : null}
          {request.status === "ACCEPTED" && request.conversation_id ? (
            <Link
              className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
              href={`/messages/${request.conversation_id}`}
            >
              <MessageSquare aria-hidden="true" className="h-4 w-4" />
              Open thread
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function IntroductionRequestSummaryRow({
  busyKey,
  onCancel,
  request
}: {
  busyKey: string | null;
  onCancel: (request: IntroductionRequest) => void;
  request: IntroductionRequest;
}) {
  const busyCancel = busyKey === `cancel:${request.id}`;

  return (
    <article className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{request.recipient_display_name}</p>
        <p className="mt-1 text-xs leading-5 text-muted">
          {request.note || "No note attached."}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="rounded-md border border-border bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
          {formatRequestStatus(request.status)}
        </span>
        {request.status === "PENDING" ? (
          <button
            className="focus-ring inline-flex min-h-9 items-center justify-center rounded-lg border border-border bg-white px-3 text-xs font-bold uppercase tracking-[0.1em] text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busyCancel}
            onClick={() => onCancel(request)}
            type="button"
          >
            {busyCancel ? "Withdrawing..." : "Withdraw"}
          </button>
        ) : null}
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
  busyKey,
  existingConversationId,
  onRequestIntroduction,
  pendingRequest,
  profile
}: {
  busyKey: string | null;
  existingConversationId: string | null;
  onRequestIntroduction: (profile: AlumniDirectoryProfile) => void;
  pendingRequest: IntroductionRequest | null;
  profile: AlumniDirectoryProfile;
}) {
  return (
    <article className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <h3 className="font-display text-lg font-semibold text-ink">{profile.display_name}</h3>
        <p className="mt-1 text-sm leading-6 text-muted">
          {formatProfileSummary(profile) || "Verified YALUMNI member"}
        </p>
      </div>
      {existingConversationId ? (
        <Link
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
          href={`/messages/${existingConversationId}`}
        >
          <MessageSquare aria-hidden="true" className="h-4 w-4" />
          Open thread
        </Link>
      ) : pendingRequest ? (
        <span className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-bold text-muted">
          Pending request
        </span>
      ) : (
        <button
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busyKey === `request:${profile.user_id}`}
          onClick={() => onRequestIntroduction(profile)}
          type="button"
        >
          <Send aria-hidden="true" className="h-4 w-4" />
          {busyKey === `request:${profile.user_id}` ? "Sending..." : "Request intro"}
        </button>
      )}
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

function formatRequestStatus(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function getConversationAgeDays(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function formatConversationAge(value: string | null) {
  const ageDays = getConversationAgeDays(value);

  if (ageDays === null) {
    return "Date pending";
  }

  if (ageDays < 1) {
    return "<1 day";
  }

  return `${ageDays} day${ageDays === 1 ? "" : "s"}`;
}

function buildIntroductionPriorities({
  acceptedRequestCount,
  freshReachCount,
  incomingPendingCount,
  outgoingPendingCount,
  staleConversationCount,
  totalConversations,
  unreadCount
}: {
  acceptedRequestCount: number;
  freshReachCount: number;
  incomingPendingCount: number;
  outgoingPendingCount: number;
  staleConversationCount: number;
  totalConversations: number;
  unreadCount: number;
}): PriorityItem[] {
  const items: PriorityItem[] = [];

  if (incomingPendingCount > 0) {
    items.push({
      body: `${incomingPendingCount} introduction request${incomingPendingCount === 1 ? " is" : "s are"} waiting for your review.`,
      label: "Review",
      title: "Respond to incoming requests",
      tone: "warning"
    });
  }

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
      body: `${freshReachCount} suggested verified alumn${freshReachCount === 1 ? "us is" : "i are"} available without a live thread or pending request.`,
      label: "Outreach",
      title: "Start fresh introductions",
      tone: "neutral"
    });
  }

  if (outgoingPendingCount > 0) {
    items.push({
      body: `${outgoingPendingCount} request${outgoingPendingCount === 1 ? " is" : "s are"} waiting on recipient approval.`,
      label: "Pending",
      title: "Track outbound handoffs",
      tone: "neutral"
    });
  }

  if (staleConversationCount > 0) {
    items.push({
      body: `${staleConversationCount} accepted thread${staleConversationCount === 1 ? " has" : "s have"} been quiet for at least 14 days and may need a follow-up or closeout.`,
      label: "Aging",
      title: "Re-engage stale handoffs",
      tone: staleConversationCount >= 3 ? "warning" : "neutral"
    });
  }

  if (!items.length && totalConversations === 0 && acceptedRequestCount === 0) {
    items.push({
      body: "No introduction requests or live handoff threads are active yet for this member workspace.",
      label: "Waiting",
      title: "Start the first handoff",
      tone: "warning"
    });
  }

  if (!items.length) {
    items.push({
      body: "The live request queue and accepted handoff threads are currently balanced for this introductions workspace.",
      label: "Stable",
      title: "Maintain introduction flow",
      tone: "neutral"
    });
  }

  return items.slice(0, 4);
}
