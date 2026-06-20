"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";

import { AlertCircle, ArrowLeft, Flag, MailPlus, MessageSquare, ShieldCheck, Users } from "lucide-react";

import {
  ApiError,
  Community,
  CommunityInvitationListResponse,
  CommunityMemberListResponse,
  CommunityPostListResponse,
  CommunityPostReportQueueResponse,
  adminRoles,
  getCommunity,
  listCommunityInvitations,
  listCommunityMembers,
  listCommunityPostReportQueue,
  listCommunityPosts
} from "@/lib/api";
import { AppShell } from "@/components/platform/app-shell";

type CommunityLeaderDashboardPageProps = {
  communityId: string;
};

type LeaderSnapshot =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      activeMembers: CommunityMemberListResponse;
      community: Community;
      invitations: CommunityInvitationListResponse | null;
      pendingMembers: CommunityMemberListResponse | null;
      recentPosts: CommunityPostListResponse | null;
      reports: CommunityPostReportQueueResponse | null;
    };

const activeMemberPageSize = 8;
const pendingMemberPageSize = 6;
const invitationPageSize = 6;
const recentPostPageSize = 4;
const reportPageSize = 6;

export function CommunityLeaderDashboardPage({
  communityId
}: CommunityLeaderDashboardPageProps) {
  return (
    <AppShell
      description="Review chapter operations, pending approvals, invitations, and recent activity from a dedicated live leadership route."
      eyebrow="Chapter leadership"
      title="Community leader dashboard"
    >
      {({ accessToken, user }) => (
        <CommunityLeaderDashboardContent
          accessToken={accessToken}
          communityId={communityId}
          userRoles={user.roles}
        />
      )}
    </AppShell>
  );
}

function CommunityLeaderDashboardContent({
  accessToken,
  communityId,
  userRoles
}: {
  accessToken: string;
  communityId: string;
  userRoles: string[];
}) {
  const [state, setState] = useState<LeaderSnapshot>({ status: "loading" });
  const roleKey = userRoles.join("|");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setState({ status: "loading" });

      try {
        const currentRoles = roleKey ? roleKey.split("|") : [];
        const community = await getCommunity(accessToken, communityId);
        const canManage = canManageCommunity(currentRoles, community);
        const canReadPosts = canAccessCommunityPosts(currentRoles, community);

        const [activeMembers, pendingMembers, invitations, recentPosts, reports] =
          await Promise.all([
            listCommunityMembers(accessToken, communityId, {
              limit: activeMemberPageSize,
              offset: 0,
              status: "ACTIVE"
            }),
            canManage
              ? listCommunityMembers(accessToken, communityId, {
                  limit: pendingMemberPageSize,
                  offset: 0,
                  status: "PENDING"
                })
              : Promise.resolve(null),
            canManage
              ? listCommunityInvitations(accessToken, communityId, {
                  limit: invitationPageSize,
                  offset: 0,
                  status: "PENDING"
                })
              : Promise.resolve(null),
            canReadPosts
              ? listCommunityPosts(accessToken, communityId, {
                  limit: recentPostPageSize,
                  offset: 0,
                  status: "ACTIVE"
                })
              : Promise.resolve(null),
            canManage
              ? listCommunityPostReportQueue(accessToken, communityId, {
                  limit: reportPageSize,
                  offset: 0,
                  status: "OPEN"
                })
              : Promise.resolve(null)
          ]);

        if (!isMounted) {
          return;
        }

        setState({
          activeMembers,
          community,
          invitations,
          pendingMembers,
          recentPosts,
          reports,
          status: "ready"
        });
      } catch (caught) {
        if (!isMounted) {
          return;
        }

        setState({
          message:
            caught instanceof ApiError ? caught.message : "Community leadership data could not be loaded.",
          status: "error"
        });
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [accessToken, communityId, roleKey]);

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

  const { activeMembers, community, invitations, pendingMembers, recentPosts, reports } = state;
  const canManage = canManageCommunity(userRoles, community);
  const location = [community.city, community.country].filter(Boolean).join(", ");
  const pendingCount = pendingMembers?.total ?? 0;
  const invitationCount = invitations?.total ?? 0;
  const openReportCount = reports?.total ?? 0;
  const activePostCount = recentPosts?.posts.length ?? 0;
  const engagementCount =
    recentPosts?.posts.reduce((total, post) => total + post.comment_count + post.reaction_count, 0) ?? 0;
  const communityDetailHref = `/communities/${community.id}`;
  const leadershipCoverage = summarizeLeadershipCoverage(activeMembers.members);
  const operationalPriorities = buildOperationalPriorities({
    activeMembers: activeMembers.total,
    activePosts: activePostCount,
    communityHref: communityDetailHref,
    engagementCount,
    invitationCount,
    openReportCount,
    pendingCount
  });

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6 xl:grid-cols-[1fr_auto] xl:items-start">
        <div>
          <Link
            className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
            href={`/communities/${community.id}`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Open live community
          </Link>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-secondary">
            {formatLabel(community.community_type)}
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">
            {community.name}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            This route now uses the live community APIs for leadership visibility over membership,
            invitations, reports, and recent activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <StatusBadge label={community.membership_role ?? "member"} tone="primary" />
          <StatusBadge label={community.membership_status ?? "not joined"} tone="neutral" />
          {location ? <StatusBadge label={location} tone="neutral" /> : null}
        </div>
      </section>

      {!canManage ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-soft sm:p-6">
          <div className="flex items-start gap-3">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <h3 className="text-lg font-semibold text-amber-900">Leader access is required</h3>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                This dashboard is reserved for community owners, managers, and platform admins.
                You can still use the live community detail page for posts and member context.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  className="focus-ring inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-bold text-white transition hover:bg-[#003d7d]"
                  href={`/communities/${community.id}`}
                >
                  Open community detail
                </Link>
                <Link
                  className="focus-ring inline-flex min-h-11 items-center rounded-lg border border-border bg-white px-5 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
                  href="/communities"
                >
                  Browse communities
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          detail="Current active roster"
          icon={<Users aria-hidden="true" className="h-5 w-5" />}
          label="Active members"
          value={String(activeMembers.total)}
        />
        <MetricCard
          detail="Members waiting for approval"
          icon={<ShieldCheck aria-hidden="true" className="h-5 w-5" />}
          label="Pending approvals"
          value={String(pendingCount)}
        />
        <MetricCard
          detail="Open invitation records"
          icon={<MailPlus aria-hidden="true" className="h-5 w-5" />}
          label="Pending invites"
          value={String(invitationCount)}
        />
        <MetricCard
          detail="Open post reports in queue"
          icon={<Flag aria-hidden="true" className="h-5 w-5" />}
          label="Open reports"
          value={String(openReportCount)}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl font-semibold text-ink">Operational priorities</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Actionable signals derived from the live roster, invitation, post, and moderation queues.
              </p>
            </div>
            <StatusBadge
              label={operationalPriorities[0]?.tone === "warning" ? "Needs attention" : "Stable"}
              tone={operationalPriorities[0]?.tone === "warning" ? "warning" : "neutral"}
            />
          </div>
          <div className="mt-5 grid gap-3">
            {operationalPriorities.map((item) => (
              <PriorityRow item={item} key={item.title} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <h3 className="font-display text-2xl font-semibold text-ink">Leadership coverage</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Live leadership capacity, roster health, and feed activity across this chapter space.
          </p>
          <div className="mt-5 grid gap-3">
            <SnapshotRow label="Owners" value={String(leadershipCoverage.owners)} />
            <SnapshotRow label="Managers" value={String(leadershipCoverage.managers)} />
            <SnapshotRow label="New members" value={String(leadershipCoverage.recentJoins)} />
            <SnapshotRow label="Recent posts loaded" value={String(activePostCount)} />
            <SnapshotRow label="Engagement touchpoints" value={String(engagementCount)} />
            <SnapshotRow label="Coverage signal" value={leadershipCoverage.coverageLabel} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <h3 className="font-display text-2xl font-semibold text-ink">Leadership snapshot</h3>
          <div className="mt-5 grid gap-3">
            <SnapshotRow label="Community type" value={formatLabel(community.community_type)} />
            <SnapshotRow label="Visibility" value={formatLabel(community.visibility)} />
            <SnapshotRow label="Join policy" value={formatLabel(community.join_policy)} />
            <SnapshotRow label="Sector focus" value={community.sector ?? community.program_name ?? "General"} />
            <SnapshotRow label="Location" value={location || "Network-wide"} />
            <SnapshotRow label="Engagement pulse" value={engagementCount ? `${engagementCount} interactions` : "Quiet"} />
            <SnapshotRow label="Created" value={formatDate(community.created_at)} />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl font-semibold text-ink">Recent activity</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Latest live posts and report counts from the active community feed.
              </p>
            </div>
            <Link className="focus-ring text-sm font-bold text-primary" href={`/communities/${community.id}`}>
              Open feed
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {recentPosts?.posts.length ? (
              recentPosts.posts.map((post) => (
                <article className="rounded-lg border border-border bg-surface p-4" key={post.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-ink">{post.author_display_name}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                        {formatDate(post.created_at)}
                      </p>
                    </div>
                    <StatusBadge label={`${post.open_report_count} reports`} tone="neutral" />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">{truncateText(post.body, 180)}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-muted">
                    <span>{post.comment_count} comments</span>
                    <span>{post.reaction_count} reactions</span>
                    <span>{post.media.length} attachments</span>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState message="No live community posts are available yet for this leadership view." />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <LiveListPanel
          emptyMessage="No pending member approvals are waiting right now."
          href={`/communities/${community.id}`}
          items={
            pendingMembers?.members.map((member) => ({
              meta: member.role,
              primary: member.display_name,
              secondary: member.email
            })) ?? []
          }
          title="Pending approvals"
        />
        <LiveListPanel
          emptyMessage="No pending invitations are currently open."
          href={`/communities/${community.id}`}
          items={
            invitations?.invitations.map((invitation) => ({
              meta: invitation.invited_role,
              primary: invitation.invited_email,
              secondary: `Expires ${formatDate(invitation.expires_at)}`
            })) ?? []
          }
          title="Pending invitations"
        />
        <LiveListPanel
          emptyMessage="No open reports are currently queued."
          href={`/communities/${community.id}`}
          items={
            reports?.reports.map((report) => ({
              meta: report.reason,
              primary: report.reporter_display_name,
              secondary: truncateText(report.note ?? "No additional note supplied.", 90)
            })) ?? []
          }
          title="Open reports"
        />
      </section>

      <section className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-display text-2xl font-semibold text-ink">Leadership actions</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Continue into the live community detail surface for invitations, roster management,
              settings, post publishing, and moderation actions.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <ActionCard
            body="Review active posts, publish updates, and handle moderation from the live detail route."
            href={`/communities/${community.id}`}
            icon={<MessageSquare aria-hidden="true" className="h-5 w-5" />}
            title="Open community feed"
          />
          <ActionCard
            body="Manage members, pending approvals, invitations, and ownership controls."
            href={`/communities/${community.id}`}
            icon={<Users aria-hidden="true" className="h-5 w-5" />}
            title="Manage roster"
          />
          <ActionCard
            body="Return to the communities hub to monitor other chapters, groups, and working teams."
            href="/communities"
            icon={<ArrowLeft aria-hidden="true" className="h-5 w-5" />}
            title="Back to communities"
          />
        </div>
      </section>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          className="h-28 animate-pulse rounded-lg border border-border bg-white shadow-soft"
          key={index}
        />
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
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3">
      <span className="text-sm font-semibold text-muted">{label}</span>
      <span className="text-sm font-bold text-ink">{value}</span>
    </div>
  );
}

function LiveListPanel({
  emptyMessage,
  href,
  items,
  title
}: {
  emptyMessage: string;
  href: string;
  items: Array<{ meta: string; primary: string; secondary: string }>;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
        <Link className="focus-ring text-sm font-bold text-primary" href={href}>
          Open
        </Link>
      </div>
      <div className="mt-5 grid gap-3">
        {items.length ? (
          items.map((item) => (
            <article className="rounded-lg border border-border bg-surface p-4" key={`${item.primary}:${item.meta}`}>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">{item.meta}</p>
              <p className="mt-2 text-sm font-bold text-ink">{item.primary}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{item.secondary}</p>
            </article>
          ))
        ) : (
          <EmptyState message={emptyMessage} />
        )}
      </div>
    </div>
  );
}

function ActionCard({
  body,
  href,
  icon,
  title
}: {
  body: string;
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Link
      className="focus-ring rounded-lg border border-border bg-surface p-4 transition hover:border-primary hover:bg-white"
      href={href}
    >
      <div className="flex items-center gap-3 text-secondary">
        {icon}
        <h4 className="font-display text-lg font-semibold text-ink">{title}</h4>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-border bg-surface p-4 text-sm leading-6 text-muted">
      {message}
    </p>
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
        ? "inline-flex min-h-9 items-center rounded-lg bg-amber-100 px-3 text-xs font-bold uppercase tracking-[0.1em] text-amber-900"
      : "inline-flex min-h-9 items-center rounded-lg border border-border bg-surface px-3 text-xs font-bold uppercase tracking-[0.1em] text-muted";

  return <span className={className}>{label}</span>;
}

type PriorityItem = {
  body: string;
  href: string;
  label: string;
  title: string;
  tone: "neutral" | "warning";
};

function PriorityRow({ item }: { item: PriorityItem }) {
  return (
    <Link
      className="focus-ring flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-primary hover:bg-white"
      href={item.href}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{item.title}</p>
        <p className="mt-1 text-xs leading-5 text-muted">{item.body}</p>
      </div>
      <StatusBadge label={item.label} tone={item.tone} />
    </Link>
  );
}

function canManageCommunity(userRoles: string[], community: Community): boolean {
  return (
    community.membership_role === "OWNER" ||
    community.membership_role === "MANAGER" ||
    userRoles.some((role) => adminRoles.includes(role))
  );
}

function canAccessCommunityPosts(userRoles: string[], community: Community): boolean {
  return (
    community.membership_status === "ACTIVE" ||
    userRoles.some((role) => adminRoles.includes(role))
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

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function summarizeLeadershipCoverage(members: CommunityMemberListResponse["members"]) {
  const now = Date.now();
  let owners = 0;
  let managers = 0;
  let recentJoins = 0;

  for (const member of members) {
    if (member.role === "OWNER") {
      owners += 1;
    }
    if (member.role === "MANAGER") {
      managers += 1;
    }

    const joinedAt = member.joined_at ?? member.created_at;
    const joinedDate = new Date(joinedAt).getTime();
    if (!Number.isNaN(joinedDate) && now - joinedDate <= 1000 * 60 * 60 * 24 * 30) {
      recentJoins += 1;
    }
  }

  return {
    coverageLabel: owners > 0 && managers > 0 ? "Distributed" : owners > 0 ? "Owner-led" : "Needs review",
    managers,
    owners,
    recentJoins
  };
}

function buildOperationalPriorities({
  activeMembers,
  activePosts,
  communityHref,
  engagementCount,
  invitationCount,
  openReportCount,
  pendingCount
}: {
  activeMembers: number;
  activePosts: number;
  communityHref: string;
  engagementCount: number;
  invitationCount: number;
  openReportCount: number;
  pendingCount: number;
}): PriorityItem[] {
  const items: PriorityItem[] = [];

  if (openReportCount > 0) {
    items.push({
      body: `${openReportCount} live report${openReportCount === 1 ? "" : "s"} need moderator attention in the community feed.`,
      href: communityHref,
      label: "Trust",
      title: "Resolve open reports",
      tone: "warning"
    });
  }

  if (pendingCount > 0) {
    items.push({
      body: `${pendingCount} membership request${pendingCount === 1 ? "" : "s"} are waiting for a leader decision.`,
      href: communityHref,
      label: "Approvals",
      title: "Review pending members",
      tone: pendingCount >= 3 ? "warning" : "neutral"
    });
  }

  if (invitationCount > 0) {
    items.push({
      body: `${invitationCount} invitation${invitationCount === 1 ? "" : "s"} are still open and may need follow-up.`,
      href: communityHref,
      label: "Invites",
      title: "Track invitation uptake",
      tone: "neutral"
    });
  }

  if (activePosts === 0) {
    items.push({
      body: "No recent live posts were loaded for this chapter feed. A fresh update may help reactivate the space.",
      href: communityHref,
      label: "Engagement",
      title: "Publish a chapter update",
      tone: "warning"
    });
  } else if (engagementCount < 5) {
    items.push({
      body: `Recent feed activity is live but still light at ${engagementCount} interaction${engagementCount === 1 ? "" : "s"}.`,
      href: communityHref,
      label: "Engagement",
      title: "Strengthen member participation",
      tone: "neutral"
    });
  }

  if (!items.length) {
    items.push({
      body: `${activeMembers} active member${activeMembers === 1 ? "" : "s"} are visible and the current queues are clear.`,
      href: communityHref,
      label: "Stable",
      title: "Leadership queues are under control",
      tone: "neutral"
    });
  }

  return items.slice(0, 4);
}
