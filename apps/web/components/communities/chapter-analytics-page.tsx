"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { Activity, Download, Flag, MailPlus, MessageSquare, ShieldCheck, Users } from "lucide-react";
import { ADMIN_ROLES } from "@yalumni/frontend-shared";

import {
  ApiError,
  type Community,
  type CommunityInvitationListResponse,
  type CommunityMemberListResponse,
  type CommunityPostListResponse,
  type CommunityPostReportQueueResponse,
  type CommunityRemovedCommentQueueResponse,
  type CommunityRemovedPostQueueResponse,
  getCommunity,
  listCommunityInvitations,
  listCommunityMembers,
  listCommunityPostReportQueue,
  listCommunityPosts,
  listCommunityRemovedComments,
  listCommunityRemovedPosts
} from "@/lib/api";
import { AppShell } from "@/components/platform/app-shell";

type ChapterAnalyticsPageProps = {
  chapterId: string;
};

type AnalyticsSnapshot =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      community: Community;
      activeMembers: CommunityMemberListResponse;
      pendingMembers: CommunityMemberListResponse;
      invitations: CommunityInvitationListResponse;
      posts: CommunityPostListResponse;
      reports: CommunityPostReportQueueResponse;
      removedComments: CommunityRemovedCommentQueueResponse;
      removedPosts: CommunityRemovedPostQueueResponse;
    };

const activeMemberPageSize = 50;
const pendingMemberPageSize = 25;
const invitationPageSize = 25;
const recentPostPageSize = 20;
const reportPageSize = 20;
const removedPostPageSize = 10;
const removedCommentPageSize = 10;

export function ChapterAnalyticsPage({ chapterId }: ChapterAnalyticsPageProps) {
  return (
    <AppShell
      allowLocalAdminBootstrap
      description="Review chapter health using live community, roster, invitation, post, and moderation data from the current platform APIs."
      eyebrow="Chapter analytics"
      requiredRoles={ADMIN_ROLES}
      title="Chapter analytics dashboard"
    >
      {({ accessToken }) => (
        <ChapterAnalyticsContent accessToken={accessToken} chapterId={chapterId} />
      )}
    </AppShell>
  );
}

function ChapterAnalyticsContent({
  accessToken,
  chapterId
}: {
  accessToken: string;
  chapterId: string;
}) {
  const [state, setState] = useState<AnalyticsSnapshot>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function loadAnalytics() {
      setState({ status: "loading" });

      try {
        const [community, activeMembers, pendingMembers, invitations, posts, reports, removedPosts, removedComments] =
          await Promise.all([
            getCommunity(accessToken, chapterId),
            listCommunityMembers(accessToken, chapterId, {
              limit: activeMemberPageSize,
              offset: 0,
              status: "ACTIVE"
            }),
            listCommunityMembers(accessToken, chapterId, {
              limit: pendingMemberPageSize,
              offset: 0,
              status: "PENDING"
            }),
            listCommunityInvitations(accessToken, chapterId, {
              limit: invitationPageSize,
              offset: 0,
              status: "PENDING"
            }),
            listCommunityPosts(accessToken, chapterId, {
              limit: recentPostPageSize,
              offset: 0,
              status: "ACTIVE"
            }),
            listCommunityPostReportQueue(accessToken, chapterId, {
              limit: reportPageSize,
              offset: 0,
              status: "OPEN"
            }),
            listCommunityRemovedPosts(accessToken, chapterId, {
              limit: removedPostPageSize,
              offset: 0
            }),
            listCommunityRemovedComments(accessToken, chapterId, {
              limit: removedCommentPageSize,
              offset: 0
            })
          ]);

        if (!isMounted) {
          return;
        }

        setState({
          community,
          activeMembers,
          pendingMembers,
          invitations,
          posts,
          reports,
          removedComments,
          removedPosts,
          status: "ready"
        });
      } catch (caught) {
        if (!isMounted) {
          return;
        }

        setState({
          message:
            caught instanceof ApiError ? caught.message : "Chapter analytics could not be loaded.",
          status: "error"
        });
      }
    }

    void loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, [accessToken, chapterId]);

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

  const { activeMembers, community, invitations, pendingMembers, posts, removedComments, removedPosts, reports } = state;
  const location = [community.city, community.country].filter(Boolean).join(", ");

  const uniqueAuthors = new Set(
    posts.posts.map((post) => post.author_user_id ?? post.author_display_name)
  ).size;
  const totalComments = posts.posts.reduce((sum, post) => sum + post.comment_count, 0);
  const totalReactions = posts.posts.reduce((sum, post) => sum + post.reaction_count, 0);
  const totalOpenReportsOnPosts = posts.posts.reduce((sum, post) => sum + post.open_report_count, 0);
  const engagementRate =
    activeMembers.total > 0 ? `${Math.round((uniqueAuthors / activeMembers.total) * 100)}%` : "0%";
  const pendingBacklog = invitations.total + pendingMembers.total;
  const averageEngagementPerPost =
    posts.total > 0 ? `${((totalComments + totalReactions) / posts.total).toFixed(1)}` : "0.0";
  const invitePressure =
    activeMembers.total > 0 ? `${Math.round((pendingBacklog / activeMembers.total) * 100)}%` : "0%";
  const moderationRiskLabel =
    reports.total > 5 ? "High" : reports.total > 0 ? "Active" : "Low";
  const removedPostCount = removedPosts.total;
  const removedCommentCount = removedComments.total;
  const moderationBacklog = reports.total + removedPostCount + removedCommentCount;
  const latestPostAge = formatNewestAge(posts.posts.map((post) => post.created_at));
  const latestPostAgeDays = getNewestAgeDays(posts.posts.map((post) => post.created_at));
  const newestActiveJoinAge = formatNewestAge(
    activeMembers.members.map((member) => member.joined_at ?? member.created_at)
  );
  const governanceSignals = buildGovernanceSignals(activeMembers.members);
  const activityTrendRows = buildTrendRows({
    activeMembers,
    invitations,
    posts,
    reports
  });

  const healthLabel =
    reports.total > 5 ? "watch" : pendingMembers.total > 0 || invitations.total > 0 ? "active" : "stable";
  const analyticsPriorities = buildAnalyticsPriorities({
    communityHref: `/communities/${community.id}`,
    engagementRate,
    healthLabel,
    invitePressure,
    latestPostAgeDays,
    moderationRiskLabel,
    pendingBacklog,
    reportsTotal: reports.total
  });
  const chapterSignals = buildChapterSignals({
    activeMembers: activeMembers.total,
    averageEngagementPerPost,
    healthLabel,
    invitePressure,
    latestPostAge,
    moderationRiskLabel,
    newestActiveJoinAge,
    postsTotal: posts.total,
    removedCommentCount,
    removedPostCount,
    uniqueAuthors
  });

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6 xl:grid-cols-[1fr_auto] xl:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">
            {formatLabel(community.community_type)}
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">
            {community.name}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            This analytics surface derives chapter health from the current live community APIs while
            deeper aggregation and export pipelines remain follow-up work.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <button
            className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-bold uppercase tracking-[0.1em] text-muted transition hover:border-primary hover:text-primary"
            onClick={() =>
              downloadAnalyticsSnapshot(`${community.name}-chapter-analytics.json`, {
                activeMembers: activeMembers.members,
                community,
                invitations: invitations.invitations,
                pendingMembers: pendingMembers.members,
                posts: posts.posts,
                removedComments: removedComments.comments,
                removedPosts: removedPosts.posts,
                reports: reports.reports
              })
            }
            type="button"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            Export
          </button>
          <StatusBadge label={healthLabel} tone={healthLabel === "watch" ? "warning" : "primary"} />
          <StatusBadge label={formatLabel(community.visibility)} tone="neutral" />
          {location ? <StatusBadge label={location} tone="neutral" /> : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          detail="Current active member roster"
          icon={<Users aria-hidden="true" className="h-5 w-5" />}
          label="Active members"
          value={String(activeMembers.total)}
        />
        <MetricCard
          detail="Recent unique post authors"
          icon={<Activity aria-hidden="true" className="h-5 w-5" />}
          label="Engagement rate"
          value={engagementRate}
        />
        <MetricCard
          detail="Pending invites plus approval queue"
          icon={<MailPlus aria-hidden="true" className="h-5 w-5" />}
          label="Growth backlog"
          value={String(pendingBacklog)}
        />
        <MetricCard
          detail="Open reports plus removed content backlog"
          icon={<Flag aria-hidden="true" className="h-5 w-5" />}
          label="Risk signals"
          value={String(moderationBacklog)}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl font-semibold text-ink">Priority reads</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Interpreted next-step signals from the live chapter roster, feed, invitations, and moderation queues.
              </p>
            </div>
            <StatusBadge label={healthLabel} tone={healthLabel === "watch" ? "warning" : "primary"} />
          </div>
          <div className="mt-5 grid gap-3">
            {analyticsPriorities.map((item) => (
              <PriorityRow item={item} key={item.title} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <h3 className="font-display text-2xl font-semibold text-ink">Analytics signals</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Quick-read indicators derived from the same live chapter data already loaded on this route.
          </p>
          <div className="mt-5 grid gap-3">
            {chapterSignals.map((signal) => (
              <SnapshotRow key={signal.label} label={signal.label} value={signal.value} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <h3 className="font-display text-2xl font-semibold text-ink">Chapter snapshot</h3>
          <div className="mt-5 grid gap-3">
            <SnapshotRow label="Community type" value={formatLabel(community.community_type)} />
            <SnapshotRow label="Join policy" value={formatLabel(community.join_policy)} />
            <SnapshotRow label="Sector focus" value={community.sector ?? community.program_name ?? "General"} />
            <SnapshotRow label="Location" value={location || "Network-wide"} />
            <SnapshotRow label="Created" value={formatDate(community.created_at)} />
            <SnapshotRow label="Recorded members" value={String(community.member_count)} />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <h3 className="font-display text-2xl font-semibold text-ink">Operational metrics</h3>
          <div className="mt-5 grid gap-3">
            <SnapshotRow label="Recent posts" value={String(posts.total)} />
            <SnapshotRow label="Latest post age" value={latestPostAge} />
            <SnapshotRow label="Newest active join" value={newestActiveJoinAge} />
            <SnapshotRow label="Unique authors in sample" value={String(uniqueAuthors)} />
            <SnapshotRow label="Comment activity" value={String(totalComments)} />
            <SnapshotRow label="Reaction activity" value={String(totalReactions)} />
            <SnapshotRow label="Average engagement per post" value={averageEngagementPerPost} />
            <SnapshotRow label="Open reports on sampled posts" value={String(totalOpenReportsOnPosts)} />
            <SnapshotRow label="Removed posts" value={String(removedPostCount)} />
            <SnapshotRow label="Removed comments" value={String(removedCommentCount)} />
            <SnapshotRow label="Pending approvals" value={String(pendingMembers.total)} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl font-semibold text-ink">Trend windows</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Read-only 7, 30, and 90-day activity views derived from the live chapter sample already loaded on this route.
              </p>
            </div>
            <StatusBadge label="Read only" tone="neutral" />
          </div>
          <div className="mt-5 grid gap-3">
            {activityTrendRows.map((row) => (
              <SnapshotRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <h3 className="font-display text-2xl font-semibold text-ink">Governance coverage</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Leadership and roster coverage derived from the current active member set for chapter-level readouts.
          </p>
          <div className="mt-5 grid gap-3">
            {governanceSignals.map((row) => (
              <SnapshotRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <h3 className="font-display text-2xl font-semibold text-ink">Moderation footprint</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Live moderation pressure across open reports and removed chapter content.
          </p>
          <div className="mt-5 grid gap-3">
            <SnapshotRow label="Open reports" value={String(reports.total)} />
            <SnapshotRow label="Removed posts" value={String(removedPostCount)} />
            <SnapshotRow label="Removed comments" value={String(removedCommentCount)} />
            <SnapshotRow label="Moderation backlog" value={String(moderationBacklog)} />
            <SnapshotRow
              label="Recovery state"
              value={moderationBacklog > 0 ? "Needs review" : "Clear"}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl font-semibold text-ink">Removed content review</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Recently removed posts and comments that still affect chapter health and moderation load.
              </p>
            </div>
            <Link className="focus-ring text-sm font-bold text-primary" href={`/communities/${community.id}`}>
              Open moderation
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {removedPosts.posts.length || removedComments.comments.length ? (
              <>
                {removedPosts.posts.slice(0, 2).map((post) => (
                  <article className="rounded-lg border border-border bg-surface p-4" key={post.id}>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">
                      Removed post
                    </p>
                    <p className="mt-2 text-sm font-bold text-ink">{post.author_display_name}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">{truncateText(post.body, 120)}</p>
                  </article>
                ))}
                {removedComments.comments.slice(0, 2).map((comment) => (
                  <article className="rounded-lg border border-border bg-surface p-4" key={comment.id}>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">
                      Removed comment
                    </p>
                    <p className="mt-2 text-sm font-bold text-ink">{comment.author_display_name}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">{truncateText(comment.body, 120)}</p>
                  </article>
                ))}
              </>
            ) : (
              <EmptyState message="No removed posts or comments are currently affecting this chapter." />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <LiveListPanel
          emptyMessage="No recent live posts are available for this chapter right now."
          href={`/communities/${community.id}`}
          items={posts.posts.slice(0, 5).map((post) => ({
            meta: `${post.comment_count} comments · ${post.reaction_count} reactions`,
            primary: post.author_display_name,
            secondary: truncateText(post.body, 96)
          }))}
          title="Recent content"
        />
        <LiveListPanel
          emptyMessage="No pending invitations are open."
          href={`/communities/${community.id}`}
          items={invitations.invitations.slice(0, 5).map((invitation) => ({
            meta: formatLabel(invitation.invited_role),
            primary: invitation.invited_email,
            secondary: `Expires ${formatDate(invitation.expires_at)}`
          }))}
          title="Invitation queue"
        />
        <LiveListPanel
          emptyMessage="No open moderation reports are currently queued."
          href={`/communities/${community.id}`}
          items={reports.reports.slice(0, 5).map((report) => ({
            meta: formatLabel(report.reason),
            primary: report.post_author_display_name,
            secondary: truncateText(report.note ?? report.post_body, 96)
          }))}
          title="Moderation queue"
        />
      </section>

      <section className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
        <h3 className="font-display text-2xl font-semibold text-ink">Next actions</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          Use the current live community routes for detailed roster, post, invitation, and moderation
          management while dedicated analytics aggregation remains partial.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <ActionCard
            body="Open the chapter feed, roster, invitations, and moderation controls."
            href={`/communities/${community.id}`}
            icon={<MessageSquare aria-hidden="true" className="h-5 w-5" />}
            title="Open community detail"
          />
          <ActionCard
            body="Review the chapter-focused leadership dashboard using the same live community data."
            href={`/communities/${community.id}/dashboard`}
            icon={<ShieldCheck aria-hidden="true" className="h-5 w-5" />}
            title="Open leader dashboard"
          />
          <ActionCard
            body="Return to the admin chapters surface to review another chapter."
            href="/admin/chapters"
            icon={<Users aria-hidden="true" className="h-5 w-5" />}
            title="Back to chapter management"
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
        ? "inline-flex min-h-9 items-center rounded-lg bg-amber-100 px-3 text-xs font-bold uppercase tracking-[0.1em] text-amber-800"
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

function getNewestAgeDays(values: string[]): number | null {
  const validDates = values
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));

  if (!validDates.length) {
    return null;
  }

  const newestTimestamp = Math.max(...validDates);
  return Math.floor((Date.now() - newestTimestamp) / (1000 * 60 * 60 * 24));
}

function formatNewestAge(values: string[]) {
  const ageDays = getNewestAgeDays(values);

  if (ageDays === null) {
    return "No recent activity";
  }

  if (ageDays < 1) {
    return "<1 day";
  }

  return `${ageDays} day${ageDays === 1 ? "" : "s"}`;
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function buildAnalyticsPriorities({
  communityHref,
  engagementRate,
  healthLabel,
  invitePressure,
  latestPostAgeDays,
  moderationRiskLabel,
  pendingBacklog,
  reportsTotal
}: {
  communityHref: string;
  engagementRate: string;
  healthLabel: string;
  invitePressure: string;
  latestPostAgeDays: number | null;
  moderationRiskLabel: string;
  pendingBacklog: number;
  reportsTotal: number;
}): PriorityItem[] {
  const items: PriorityItem[] = [];

  if (reportsTotal > 0) {
    items.push({
      body: `${reportsTotal} open moderation item${reportsTotal === 1 ? "" : "s"} keep the chapter in ${moderationRiskLabel.toLowerCase()} review mode.`,
      href: communityHref,
      label: "Trust",
      title: "Triage moderation queue",
      tone: reportsTotal > 5 ? "warning" : "neutral"
    });
  }

  if (pendingBacklog > 0) {
    items.push({
      body: `${pendingBacklog} invitation or approval item${pendingBacklog === 1 ? "" : "s"} remain open, representing ${invitePressure} of the active roster.`,
      href: communityHref,
      label: "Growth",
      title: "Work the membership backlog",
      tone: pendingBacklog >= 5 ? "warning" : "neutral"
    });
  }

  if (engagementRate === "0%") {
    items.push({
      body: "No recent member authors were detected in the sampled post feed.",
      href: communityHref,
      label: "Engagement",
      title: "Reactivate chapter publishing",
      tone: "warning"
    });
  } else if (engagementRate !== "0%" && Number.parseInt(engagementRate, 10) < 25) {
    items.push({
      body: `Only ${engagementRate} of the active roster appears in the recent author sample.`,
      href: communityHref,
      label: "Engagement",
      title: "Broaden participation",
      tone: "neutral"
    });
  }

  if (latestPostAgeDays !== null && latestPostAgeDays >= 14) {
    items.push({
      body: `The latest sampled chapter post is ${latestPostAgeDays} day${latestPostAgeDays === 1 ? "" : "s"} old, which suggests the publishing rhythm may be slowing.`,
      href: communityHref,
      label: "Rhythm",
      title: "Refresh chapter activity",
      tone: latestPostAgeDays >= 30 ? "warning" : "neutral"
    });
  }

  if (!items.length) {
    items.push({
      body: `Current chapter health reads as ${healthLabel} with no immediate live queue pressure.`,
      href: communityHref,
      label: "Stable",
      title: "Maintain current operating rhythm",
      tone: "neutral"
    });
  }

  return items.slice(0, 4);
}

function buildChapterSignals({
  activeMembers,
  averageEngagementPerPost,
  healthLabel,
  invitePressure,
  latestPostAge,
  moderationRiskLabel,
  newestActiveJoinAge,
  postsTotal,
  removedCommentCount,
  removedPostCount,
  uniqueAuthors
}: {
  activeMembers: number;
  averageEngagementPerPost: string;
  healthLabel: string;
  invitePressure: string;
  latestPostAge: string;
  moderationRiskLabel: string;
  newestActiveJoinAge: string;
  postsTotal: number;
  removedCommentCount: number;
  removedPostCount: number;
  uniqueAuthors: number;
}) {
  return [
    { label: "Health state", value: healthLabel },
    { label: "Moderation risk", value: moderationRiskLabel },
    { label: "Invite pressure", value: invitePressure },
    { label: "Latest post age", value: latestPostAge },
    { label: "Newest active join", value: newestActiveJoinAge },
    { label: "Recent authors", value: `${uniqueAuthors} of ${activeMembers}` },
    { label: "Recent posts sampled", value: String(postsTotal) },
    { label: "Removed posts", value: String(removedPostCount) },
    { label: "Removed comments", value: String(removedCommentCount) },
    { label: "Average engagement per post", value: averageEngagementPerPost }
  ];
}

function buildGovernanceSignals(members: CommunityMemberListResponse["members"]) {
  const owners = members.filter((member) => member.role === "OWNER").length;
  const managers = members.filter((member) => member.role === "MANAGER").length;
  const membersOnly = members.filter((member) => member.role === "MEMBER").length;
  const recentJoins = members.filter((member) => {
    const age = getNewestAgeDays([member.joined_at ?? member.created_at]);
    return age !== null && age <= 30;
  }).length;

  return [
    { label: "Owners", value: String(owners) },
    { label: "Managers", value: String(managers) },
    { label: "Members", value: String(membersOnly) },
    { label: "Recent joins (30d)", value: String(recentJoins) },
    {
      label: "Coverage signal",
      value: owners > 0 && managers > 0 ? "Distributed" : owners > 0 ? "Owner-led" : "Needs cover"
    }
  ];
}

function buildTrendRows({
  activeMembers,
  invitations,
  posts,
  reports
}: {
  activeMembers: CommunityMemberListResponse;
  invitations: CommunityInvitationListResponse;
  posts: CommunityPostListResponse;
  reports: CommunityPostReportQueueResponse;
}) {
  const windows = [7, 30, 90];

  return windows.map((days) => ({
    label: `${days}-day window`,
    value: [
      `${countWithinDays(activeMembers.members.map((member) => member.joined_at ?? member.created_at), days)} joins`,
      `${countWithinDays(invitations.invitations.map((invitation) => invitation.created_at), days)} invites`,
      `${countWithinDays(posts.posts.map((post) => post.created_at), days)} posts`,
      `${countWithinDays(reports.reports.map((report) => report.created_at), days)} reports`
    ].join(" · ")
  }));
}

function countWithinDays(values: string[], days: number) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return values.filter((value) => {
    const timestamp = new Date(value).getTime();
    return !Number.isNaN(timestamp) && timestamp >= cutoff;
  }).length;
}

function downloadAnalyticsSnapshot(fileName: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
