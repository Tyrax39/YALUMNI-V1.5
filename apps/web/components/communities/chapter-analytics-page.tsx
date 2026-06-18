"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { Activity, Flag, MailPlus, MessageSquare, ShieldCheck, Users } from "lucide-react";
import { ADMIN_ROLES } from "@yalumni/frontend-shared";

import {
  ApiError,
  type Community,
  type CommunityInvitationListResponse,
  type CommunityMemberListResponse,
  type CommunityPostListResponse,
  type CommunityPostReportQueueResponse,
  getCommunity,
  listCommunityInvitations,
  listCommunityMembers,
  listCommunityPostReportQueue,
  listCommunityPosts
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
    };

const activeMemberPageSize = 50;
const pendingMemberPageSize = 25;
const invitationPageSize = 25;
const recentPostPageSize = 20;
const reportPageSize = 20;

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
        const [community, activeMembers, pendingMembers, invitations, posts, reports] =
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

  const { activeMembers, community, invitations, pendingMembers, posts, reports } = state;
  const location = [community.city, community.country].filter(Boolean).join(", ");

  const uniqueAuthors = new Set(
    posts.posts.map((post) => post.author_user_id ?? post.author_display_name)
  ).size;
  const totalComments = posts.posts.reduce((sum, post) => sum + post.comment_count, 0);
  const totalReactions = posts.posts.reduce((sum, post) => sum + post.reaction_count, 0);
  const totalOpenReportsOnPosts = posts.posts.reduce((sum, post) => sum + post.open_report_count, 0);
  const engagementRate =
    activeMembers.total > 0 ? `${Math.round((uniqueAuthors / activeMembers.total) * 100)}%` : "0%";

  const healthLabel =
    reports.total > 5 ? "watch" : pendingMembers.total > 0 || invitations.total > 0 ? "active" : "stable";

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
          value={String(invitations.total + pendingMembers.total)}
        />
        <MetricCard
          detail="Open moderation items"
          icon={<Flag aria-hidden="true" className="h-5 w-5" />}
          label="Risk signals"
          value={String(reports.total)}
        />
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
            <SnapshotRow label="Unique authors in sample" value={String(uniqueAuthors)} />
            <SnapshotRow label="Comment activity" value={String(totalComments)} />
            <SnapshotRow label="Reaction activity" value={String(totalReactions)} />
            <SnapshotRow label="Open reports on sampled posts" value={String(totalOpenReportsOnPosts)} />
            <SnapshotRow label="Pending approvals" value={String(pendingMembers.total)} />
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
