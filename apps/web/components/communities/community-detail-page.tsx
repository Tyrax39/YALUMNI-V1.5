"use client";

import { useEffect, useState } from "react";

import { ArrowLeft, LogIn, LogOut, MapPin, ShieldCheck, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  ApiError,
  approveCommunityMember,
  adminRoles,
  Community,
  CommunityMember,
  CommunityMemberListResponse,
  getCommunity,
  joinCommunity,
  leaveCommunity,
  listCommunityMembers,
  rejectCommunityMember
} from "@/lib/api";
import { ProtectedRoute } from "@/components/auth/protected-route";

type CommunityDetailPageProps = {
  communityId: string;
};

type DetailState =
  | { status: "loading" }
  | {
      community: Community;
      members: CommunityMemberListResponse;
      status: "ready";
      pendingMembers: CommunityMemberListResponse | null;
    }
  | { status: "error"; message: string };

const rosterPageSize = 12;
const pendingPageSize = 6;

export function CommunityDetailPage({ communityId }: CommunityDetailPageProps) {
  return (
    <main className="min-h-screen bg-surface">
      <ProtectedRoute
        description="Community spaces are available to signed-in YALUMNI members."
        title="Community"
      >
        {({ accessToken, user }) => (
          <CommunityDetailContent
            accessToken={accessToken}
            communityId={communityId}
            userRoles={user.roles}
          />
        )}
      </ProtectedRoute>
    </main>
  );
}

function CommunityDetailContent({
  accessToken,
  communityId,
  userRoles
}: {
  accessToken: string;
  communityId: string;
  userRoles: string[];
}) {
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    loadDetail(0, 0)
      .then((nextState) => {
        if (isMounted) {
          setState(nextState);
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message:
              caught instanceof ApiError ? caught.message : "Community could not be loaded.",
            status: "error"
          });
        }
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, communityId]);

  async function loadDetail(activeOffset: number, pendingOffset: number): Promise<DetailState> {
    const [community, members] = await Promise.all([
      getCommunity(accessToken, communityId),
      listCommunityMembers(accessToken, communityId, {
        limit: rosterPageSize,
        offset: activeOffset,
        status: "ACTIVE"
      })
    ]);
    const canManage = canManageCommunity(userRoles, community);
    const pendingMembers = canManage
      ? await listCommunityMembers(accessToken, communityId, {
          limit: pendingPageSize,
          offset: pendingOffset,
          status: "PENDING"
        })
      : null;
    return { community, members, pendingMembers, status: "ready" };
  }

  async function refresh(
    activeOffset = state.status === "ready" ? state.members.offset : 0,
    pendingOffset = state.status === "ready" ? state.pendingMembers?.offset ?? 0 : 0
  ) {
    setState(await loadDetail(activeOffset, pendingOffset));
  }

  async function handleJoin() {
    setMessage(null);
    setActionError(null);
    setIsSubmitting(true);
    try {
      const community = await joinCommunity(accessToken, communityId);
      setMessage(
        community.membership_status === "PENDING"
          ? `Join request sent for ${community.name}.`
          : `Joined ${community.name}.`
      );
      await refresh();
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "Join request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReview(member: CommunityMember, action: "approve" | "reject") {
    setMessage(null);
    setActionError(null);
    setBusyMemberId(member.id);
    try {
      const reviewedMember =
        action === "approve"
          ? await approveCommunityMember(accessToken, communityId, member.id)
          : await rejectCommunityMember(accessToken, communityId, member.id);
      setMessage(
        action === "approve"
          ? `${reviewedMember.display_name} approved.`
          : `${reviewedMember.display_name} rejected.`
      );
      await refresh();
    } catch (caught) {
      setActionError(
        caught instanceof ApiError ? caught.message : "Membership review failed."
      );
    } finally {
      setBusyMemberId(null);
    }
  }

  async function handleLeave() {
    setMessage(null);
    setActionError(null);
    setIsSubmitting(true);
    try {
      const community = await leaveCommunity(accessToken, communityId);
      setMessage(`Left ${community.name}.`);
      await refresh();
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "Leave request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (state.status === "loading") {
    return (
      <CommunityShell>
        <p className="border-y border-border bg-white px-5 py-4 text-sm font-semibold text-muted">
          Loading community...
        </p>
      </CommunityShell>
    );
  }

  if (state.status === "error") {
    return (
      <CommunityShell>
        <div className="border-y border-red-200 bg-red-50 px-5 py-5">
          <p className="text-sm font-semibold text-red-700">{state.message}</p>
          <Link
            className="focus-ring mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#003d7d]"
            href="/dashboard"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
      </CommunityShell>
    );
  }

  const { community, members, pendingMembers } = state;
  const activeMember = community.membership_status === "ACTIVE";
  const pendingMember = community.membership_status === "PENDING";
  const owner = community.membership_role === "OWNER";
  const location = [community.city, community.country].filter(Boolean).join(", ");
  const canManage = canManageCommunity(userRoles, community);

  return (
    <CommunityShell>
      <section className="border-b border-border bg-white pb-8">
        <Link
          className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
          href="/dashboard"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Dashboard
        </Link>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
              {formatLabel(community.community_type)}
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold text-ink sm:text-5xl">
              {community.name}
            </h1>
            {community.description ? (
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
                {community.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {activeMember ? (
              <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-ink">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 text-secondary" />
                {formatLabel(community.membership_role ?? "MEMBER")}
              </span>
            ) : null}
            {activeMember ? (
              <button
                className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting || owner}
                onClick={handleLeave}
                type="button"
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
                {owner ? "Owner" : isSubmitting ? "Leaving..." : "Leave"}
              </button>
            ) : (
              <button
                className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting || pendingMember}
                onClick={handleJoin}
                type="button"
              >
                <LogIn aria-hidden="true" className="h-4 w-4" />
                {pendingMember ? "Pending" : isSubmitting ? "Joining..." : "Join"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <CommunityMetric
            icon={<Users aria-hidden="true" className="h-5 w-5" />}
            label="Members"
            value={String(community.member_count)}
          />
          <CommunityMetric
            icon={<MapPin aria-hidden="true" className="h-5 w-5" />}
            label="Location"
            value={location || "Network-wide"}
          />
          <CommunityMetric label="Focus" value={community.sector ?? community.program_name ?? "General"} />
          <CommunityMetric label="Join policy" value={formatLabel(community.join_policy)} />
        </div>
      </section>

      {message ? (
        <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {message}
        </p>
      ) : null}
      {actionError ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {actionError}
        </p>
      ) : null}

      <section className="mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
              Member roster
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
              Active community members
            </h2>
          </div>
          <p className="text-sm font-semibold text-muted">{members.total} active members</p>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {members.members.length === 0 ? (
            <p className="border-y border-border bg-white px-4 py-6 text-sm font-semibold text-muted lg:col-span-2">
              No active members are listed yet.
            </p>
          ) : null}
          {members.members.map((member) => (
            <article className="rounded-lg border border-border bg-white p-4 shadow-soft" key={member.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-semibold text-ink">
                    {member.display_name}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-muted">{member.email}</p>
                </div>
                <span className="rounded-md bg-surface px-2.5 py-1 text-xs font-bold text-secondary">
                  {formatLabel(member.role)}
                </span>
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                {member.joined_at ? `Joined ${formatDate(member.joined_at)}` : "Pending join date"}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-3 border-y border-border bg-white px-4 py-3 text-sm font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            {members.total === 0
              ? "No members"
              : `Showing ${members.offset + 1}-${members.offset + members.members.length} of ${members.total}`}
          </p>
          <div className="flex gap-2">
            <button
              className="focus-ring min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={members.offset === 0}
              onClick={() => void refresh(Math.max(0, members.offset - members.limit))}
              type="button"
            >
              Previous
            </button>
            <button
              className="focus-ring min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!members.has_more}
              onClick={() => void refresh(members.offset + members.limit)}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {canManage && pendingMembers ? (
        <section className="mt-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
                Join requests
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
                Pending community members
              </h2>
            </div>
            <p className="text-sm font-semibold text-muted">
              {pendingMembers.total} pending requests
            </p>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {pendingMembers.members.length === 0 ? (
              <p className="border-y border-border bg-white px-4 py-6 text-sm font-semibold text-muted lg:col-span-2">
                No pending join requests.
              </p>
            ) : null}
            {pendingMembers.members.map((member) => (
              <article
                className="rounded-lg border border-border bg-white p-4 shadow-soft"
                key={member.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-ink">
                      {member.display_name}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-muted">{member.email}</p>
                  </div>
                  <span className="rounded-md bg-surface px-2.5 py-1 text-xs font-bold text-secondary">
                    Pending
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="focus-ring inline-flex min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={busyMemberId === member.id}
                    onClick={() => void handleReview(member, "approve")}
                    type="button"
                  >
                    {busyMemberId === member.id ? "Reviewing..." : "Approve"}
                  </button>
                  <button
                    className="focus-ring inline-flex min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={busyMemberId === member.id}
                    onClick={() => void handleReview(member, "reject")}
                    type="button"
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3 border-y border-border bg-white px-4 py-3 text-sm font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              {pendingMembers.total === 0
                ? "No requests"
                : `Showing ${pendingMembers.offset + 1}-${pendingMembers.offset + pendingMembers.members.length} of ${pendingMembers.total}`}
            </p>
            <div className="flex gap-2">
              <button
                className="focus-ring min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={pendingMembers.offset === 0}
                onClick={() =>
                  void refresh(members.offset, Math.max(0, pendingMembers.offset - pendingMembers.limit))
                }
                type="button"
              >
                Previous
              </button>
              <button
                className="focus-ring min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!pendingMembers.has_more}
                onClick={() => void refresh(members.offset, pendingMembers.offset + pendingMembers.limit)}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </CommunityShell>
  );
}

function CommunityShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link className="focus-ring rounded-lg" href="/">
            <Image
              alt="YALUMNI"
              className="block h-auto w-[132px] object-contain sm:w-[156px]"
              height={34}
              priority
              src="/brand/yalumni-logo-horizontal.svg"
              width={156}
            />
          </Link>
          <Link
            className="focus-ring rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            href="/dashboard"
          >
            Dashboard
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">{children}</div>
    </>
  );
}

function CommunityMetric({
  icon,
  label,
  value
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border-y border-border bg-white p-4">
      {icon ? <div className="flex items-center gap-2 text-secondary">{icon}</div> : null}
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-ink">{value}</p>
    </div>
  );
}

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function canManageCommunity(userRoles: string[], community: Community): boolean {
  return (
    community.membership_role === "OWNER" ||
    userRoles.some((role) => adminRoles.includes(role))
  );
}
