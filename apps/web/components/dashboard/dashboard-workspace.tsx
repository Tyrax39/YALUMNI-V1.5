"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/platform/app-shell";
import {
  AlumniProfile,
  AuthSessionsResponse,
  ConversationListResponse,
  CommunityListResponse,
  NotificationListResponse,
  TwoFactorStatus,
  VerificationRequestListResponse,
  getMyAlumniProfile,
  getMyVerificationRequests,
  getSessions,
  getTwoFactorStatus,
  listCommunities,
  listConversations,
  listNotifications
} from "@/lib/api";

type DashboardSnapshot = {
  communities: CommunityListResponse | null;
  conversations: ConversationListResponse | null;
  notifications: NotificationListResponse | null;
  profile: AlumniProfile | null;
  security: TwoFactorStatus | null;
  sessions: AuthSessionsResponse | null;
  verification: VerificationRequestListResponse | null;
};

const initialSnapshot: DashboardSnapshot = {
  communities: null,
  conversations: null,
  notifications: null,
  profile: null,
  security: null,
  sessions: null,
  verification: null
};

const workflowCards = [
  {
    body: "Complete biography, career details, skills, visibility, and profile photo.",
    href: "/profile/setup",
    label: "Profile setup",
    state: "live API"
  },
  {
    body: "Submit evidence and track the latest alumni verification decision.",
    href: "/verification",
    label: "Verification",
    state: "live API"
  },
  {
    body: "Search verified alumni by country, program, cohort, sector, and skills.",
    href: "/directory",
    label: "Directory",
    state: "live API"
  },
  {
    body: "Browse chapters, sector groups, private working teams, and posts.",
    href: "/communities",
    label: "Communities",
    state: "live API"
  },
  {
    body: "Open direct conversations and start a new member introduction.",
    href: "/messages",
    label: "Messages",
    state: "live API"
  },
  {
    body: "Review events, initiatives, opportunities, mentorship, resources, contributions, and elections.",
    href: "/events",
    label: "Future modules",
    state: "prototype routes"
  }
] as const;

export function DashboardWorkspace() {
  return (
    <AppShell
      description="Track identity, verification, messages, communities, notifications, sessions, and the next dedicated alumni workflows from one member dashboard."
      eyebrow="Member dashboard"
      title="Your YALUMNI workspace"
    >
      {({ accessToken, refreshToken, user }) => (
        <DashboardContent accessToken={accessToken} refreshToken={refreshToken} userName={user.display_name} />
      )}
    </AppShell>
  );
}

function DashboardContent({
  accessToken,
  refreshToken,
  userName
}: {
  accessToken: string;
  refreshToken: string | null;
  userName: string;
}) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(initialSnapshot);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      const [
        profileResult,
        verificationResult,
        notificationsResult,
        communitiesResult,
        conversationsResult,
        sessionsResult,
        securityResult
      ] = await Promise.allSettled([
        getMyAlumniProfile(accessToken),
        getMyVerificationRequests(accessToken),
        listNotifications(accessToken, { limit: 5, status: "ALL" }),
        listCommunities(accessToken, { limit: 5 }),
        listConversations(accessToken, { limit: 5 }),
        getSessions(accessToken, refreshToken),
        getTwoFactorStatus(accessToken)
      ]);

      if (!isMounted) {
        return;
      }

      setSnapshot({
        communities: communitiesResult.status === "fulfilled" ? communitiesResult.value : null,
        conversations: conversationsResult.status === "fulfilled" ? conversationsResult.value : null,
        notifications: notificationsResult.status === "fulfilled" ? notificationsResult.value : null,
        profile: profileResult.status === "fulfilled" ? profileResult.value : null,
        security: securityResult.status === "fulfilled" ? securityResult.value : null,
        sessions: sessionsResult.status === "fulfilled" ? sessionsResult.value : null,
        verification: verificationResult.status === "fulfilled" ? verificationResult.value : null
      });
      setIsLoading(false);
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [accessToken, refreshToken]);

  const latestVerification = snapshot.verification?.requests[0] ?? null;
  const activeSessions = snapshot.sessions?.sessions.filter((session) => session.is_active).length;
  const unreadMessages =
    snapshot.conversations?.conversations.reduce((total, conversation) => total + conversation.unread_count, 0) ??
    0;

  return (
    <div className="grid gap-6">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">
                Verified alumni network
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold text-ink">
                Welcome back, {firstName(userName)}.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                Your dashboard is now a real operational hub: live identity and trust widgets up top,
                deeper workflows routed to their dedicated screens.
              </p>
            </div>
            <StatusBadge label={isLoading ? "Syncing" : "Live session"} />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <ProgressCard
              detail="Profile completion"
              href="/profile/setup"
              label="Identity"
              value={formatPercent(snapshot.profile?.completion_percentage)}
            />
            <ProgressCard
              detail="Latest request"
              href="/verification"
              label="Verification"
              value={latestVerification?.status ?? "not started"}
            />
            <ProgressCard
              detail="Unread alerts"
              href="/dashboard"
              label="Notifications"
              value={formatNumber(snapshot.notifications?.unread_count)}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <h2 className="font-display text-2xl font-semibold text-ink">Trust and access</h2>
          <div className="mt-5 grid gap-3">
            <SignalRow label="Two-factor authentication" value={snapshot.security?.enabled ? "enabled" : "not enabled"} />
            <SignalRow label="Admin 2FA requirement" value={snapshot.security?.admin_two_factor_required ? "required" : "not required"} />
            <SignalRow label="Active sessions" value={formatNumber(activeSessions)} />
            <SignalRow label="Program records" value={formatNumber(snapshot.profile?.program_affiliations.length)} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          detail="Communities visible from the live communities API."
          href="/communities"
          label="Communities"
          value={formatNumber(snapshot.communities?.total)}
        />
        <MetricCard
          detail="Live direct-message threads tied to your account."
          href="/messages"
          label="Conversations"
          value={formatNumber(snapshot.conversations?.total)}
        />
        <MetricCard
          detail="Unread messages across your recent conversations."
          href="/messages"
          label="Unread messages"
          value={formatNumber(unreadMessages)}
        />
        <MetricCard
          detail="Prototype feature routes available for visual review."
          href="/events"
          label="Upcoming modules"
          value="8"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <h2 className="font-display text-2xl font-semibold text-ink">Recent notifications</h2>
          <div className="mt-5 grid gap-3">
            {snapshot.notifications?.notifications.length ? (
              snapshot.notifications.notifications.slice(0, 4).map((notification) => (
                <Link
                  className="focus-ring rounded-lg border border-border bg-surface p-4 transition hover:border-primary"
                  href={notification.target_url ?? "/dashboard"}
                  key={notification.id}
                >
                  <p className="text-sm font-bold text-ink">{notification.title}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    {notification.read_at ? "read" : "unread"}
                  </p>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-border bg-surface p-4 text-sm leading-6 text-muted">
                No recent notification data is available for this account yet.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">Workspace actions</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Dedicated routes keep the dashboard fast and close to the member dashboard design.
              </p>
            </div>
            <Link
              className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-bold text-white transition hover:bg-[#003d7d]"
              href="/directory"
            >
              Find alumni
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {workflowCards.map((card) => (
              <Link
                className="focus-ring rounded-lg border border-border bg-surface p-4 transition hover:border-primary hover:bg-white"
                href={card.href}
                key={card.label}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold text-ink">{card.label}</h3>
                  <StatusBadge label={card.state} />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{card.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProgressCard({
  detail,
  href,
  label,
  value
}: {
  detail: string;
  href: string;
  label: string;
  value: string;
}) {
  return (
    <Link className="focus-ring rounded-lg border border-border bg-surface p-4 transition hover:border-primary" href={href}>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-3 font-display text-2xl font-bold text-primary">{value}</p>
      <p className="mt-2 text-sm font-semibold text-muted">{detail}</p>
    </Link>
  );
}

function MetricCard({
  detail,
  href,
  label,
  value
}: {
  detail: string;
  href: string;
  label: string;
  value: string;
}) {
  return (
    <Link className="focus-ring rounded-lg border border-border bg-white p-5 shadow-soft transition hover:border-primary" href={href}>
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-3 font-display text-3xl font-bold text-primary">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
    </Link>
  );
}

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3">
      <p className="text-sm font-bold text-ink">{label}</p>
      <span className="rounded-md border border-border bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded-md border border-border bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
      {label}
    </span>
  );
}

function firstName(displayName: string) {
  return displayName.trim().split(/\s+/)[0] || "there";
}

function formatNumber(value: number | undefined) {
  return typeof value === "number" ? value.toLocaleString() : "n/a";
}

function formatPercent(value: number | undefined) {
  return typeof value === "number" ? `${Math.round(value)}%` : "n/a";
}
