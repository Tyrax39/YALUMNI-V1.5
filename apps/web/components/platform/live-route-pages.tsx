"use client";

import Link from "next/link";
import { AdminMessageModerationConsole } from "@/components/admin/admin-message-moderation-console";
import { AdminModerationConsole } from "@/components/admin/admin-moderation-console";
import { VerificationQueuePanel } from "@/components/admin/admin-console";
import { DirectorySearchPanel } from "@/components/alumni/directory-search-panel";
import { ProfileSetupPanel, ProgramAffiliationPanel } from "@/components/alumni/profile-panel";
import { VerificationRequestPanel } from "@/components/alumni/verification-request-panel";
import { CommunitiesPanel } from "@/components/communities/communities-panel";
import { IntroductionRequestsPanel } from "@/components/messages/introduction-requests-panel";
import { MessagingPanel } from "@/components/messages/messaging-panel";
import { AppShell } from "@/components/platform/app-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ADMIN_ROLES, MEMBER_ACCESS_ROLES, isAdminRole } from "@yalumni/frontend-shared";
import { useEffect } from "react";

export function DirectoryRoutePage() {
  return (
    <AppShell
      description="Search verified alumni by country, city, program, cohort, sector, skill, organization, and role."
      eyebrow="Directory"
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Alumni directory"
    >
      {({ accessToken }) => <DirectorySearchPanel accessToken={accessToken} />}
    </AppShell>
  );
}

export function ProfileSetupRoutePage() {
  return (
    <ProtectedRoute
      description="Complete your public profile, visibility-ready career details, photo, skills, and core alumni identity."
      title="Complete your profile"
    >
      {({ accessToken, user }) => (
        <ProfileSetupPanel accessToken={accessToken} displayName={user.display_name} />
      )}
    </ProtectedRoute>
  );
}

export function ProgramAffiliationRoutePage() {
  return (
    <ProtectedRoute
      description="Add and maintain YALI program affiliation records that support verification and directory trust."
      title="Program affiliation"
    >
      {({ accessToken, user }) => (
        <ProgramAffiliationPanel accessToken={accessToken} displayName={user.display_name} />
      )}
    </ProtectedRoute>
  );
}

export function VerificationRoutePage() {
  return (
    <ProtectedRoute
      description="Submit alumni verification, upload evidence, and track the latest request status from the live verification API."
      title="Alumni verification"
    >
      {({ accessToken, user }) => (
        <VerificationRequestPanel
          accessToken={accessToken}
          displayName={user.display_name}
          email={user.email}
        />
      )}
    </ProtectedRoute>
  );
}

export function CommunitiesRoutePage() {
  return (
    <AppShell
      description="Browse, join, and create community spaces backed by the current communities API."
      eyebrow="Communities"
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Communities and chapters"
    >
      {({ accessToken, user }) => {
        const canCreate = isAdminRole(user.roles);
        return <CommunitiesPanel accessToken={accessToken} canCreate={canCreate} />;
      }}
    </AppShell>
  );
}

export function MessagesRoutePage({ mode = "inbox" }: { mode?: "conversation" | "inbox" | "new" }) {
  const title =
    mode === "new" ? "New message" : mode === "conversation" ? "Direct conversation" : "Messages inbox";
  const description =
    mode === "new"
      ? "Search verified members and start a direct conversation using the live messaging API."
      : "Private member conversations, moderation reporting, block controls, and unread state from the live messaging API.";

  return (
    <AppShell
      description={description}
      eyebrow="Messages"
      requiredRoles={MEMBER_ACCESS_ROLES}
      title={title}
    >
      {({ accessToken, user }) => (
        <MessagingPanel accessToken={accessToken} currentUserId={user.id} />
      )}
    </AppShell>
  );
}

export function IntroductionRequestsRoutePage() {
  return (
    <AppShell
      description="Start verified alumni handoffs through live member search and direct-message threads."
      eyebrow="Introductions"
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Introduction requests"
    >
      {({ accessToken, user }) => (
        <IntroductionRequestsPanel accessToken={accessToken} currentUserId={user.id} />
      )}
    </AppShell>
  );
}

export function AdminVerificationRoutePage() {
  return (
    <AppShell
      allowLocalAdminBootstrap
      description="Review completed member profiles, evidence, and audit notes through the live verification queue."
      eyebrow="Admin verification"
      requiredRoles={ADMIN_ROLES}
      title="Verification queue"
    >
      {({ accessToken }) => <VerificationQueuePanel accessToken={accessToken} />}
    </AppShell>
  );
}

export function AdminModerationRoutePage() {
  return (
    <AppShell
      allowLocalAdminBootstrap
      description="Review community post reports, removed content, direct message reports, and trust escalations."
      eyebrow="Admin moderation"
      requiredRoles={ADMIN_ROLES}
      title="Moderation queues"
    >
      {({ accessToken }) => (
        <div className="grid gap-6">
          <AdminModerationConsole accessToken={accessToken} />
          <AdminMessageModerationConsole accessToken={accessToken} />
        </div>
      )}
    </AppShell>
  );
}

export function AdminConsoleRedirectRoutePage({
  description,
  eyebrow,
  targetPath,
  title
}: {
  description: string;
  eyebrow: string;
  targetPath: string;
  title: string;
}) {
  return (
    <ProtectedRoute
      allowLocalAdminBootstrap
      description={description}
      requiredRoles={ADMIN_ROLES}
      title={title}
    >
      {() => (
        <AdminConsoleRedirectPanel
          description={description}
          eyebrow={eyebrow}
          targetPath={targetPath}
          title={title}
        />
      )}
    </ProtectedRoute>
  );
}

function AdminConsoleRedirectPanel({
  description,
  eyebrow,
  targetPath,
  title
}: {
  description: string;
  eyebrow: string;
  targetPath: string;
  title: string;
}) {
  const targetUrl = resolveAdminConsoleUrl(targetPath);

  useEffect(() => {
    window.location.replace(targetUrl);
  }, [targetUrl]);

  return (
    <section className="mx-auto flex min-h-[calc(100vh-76px)] max-w-5xl items-center px-5 py-12 sm:px-8">
      <div className="w-full rounded-lg border border-border bg-white p-6 shadow-soft sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">{eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{description}</p>
        <p className="mt-4 text-sm font-semibold text-muted">
          Redirecting to the separate admin console...
        </p>
        <div className="mt-6">
          <Link
            className="focus-ring inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white"
            href={targetUrl}
          >
            Open admin console
          </Link>
        </div>
      </div>
    </section>
  );
}

function resolveAdminConsoleUrl(targetPath: string): string {
  const normalizedPath = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;
  const configuredBaseUrl = process.env.NEXT_PUBLIC_ADMIN_CONSOLE_BASE_URL?.replace(/\/$/, "");

  if (configuredBaseUrl) {
    return `${configuredBaseUrl}${normalizedPath}`;
  }

  if (typeof window === "undefined") {
    return normalizedPath;
  }

  const { hostname, protocol } = window.location;
  const currentPort = Number(window.location.port || 0);

  if (hostname === "127.0.0.1" || hostname === "localhost") {
    const adminPort =
      currentPort === 3010 || currentPort === 3110 ? currentPort + 1 : 3011;
    return `${protocol}//${hostname}:${adminPort}${normalizedPath}`;
  }

  if (hostname.includes("member")) {
    return `${protocol}//${hostname.replace("member", "admin")}${normalizedPath}`;
  }

  return `${protocol}//${hostname}${normalizedPath}`;
}
