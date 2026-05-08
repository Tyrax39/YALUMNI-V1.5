"use client";

import { AdminMessageModerationConsole } from "@/components/admin/admin-message-moderation-console";
import { AdminModerationConsole } from "@/components/admin/admin-moderation-console";
import { VerificationQueuePanel } from "@/components/admin/admin-console";
import { DirectorySearchPanel } from "@/components/alumni/directory-search-panel";
import { ProfilePanel } from "@/components/alumni/profile-panel";
import { VerificationRequestPanel } from "@/components/alumni/verification-request-panel";
import { CommunitiesPanel } from "@/components/communities/communities-panel";
import { MessagingPanel } from "@/components/messages/messaging-panel";
import { AppShell } from "@/components/platform/app-shell";
import { adminRoles } from "@/lib/api";

export function DirectoryRoutePage() {
  return (
    <AppShell
      description="Search verified alumni by country, city, program, cohort, sector, skill, organization, and role."
      eyebrow="Directory"
      title="Alumni directory"
    >
      {({ accessToken }) => <DirectorySearchPanel accessToken={accessToken} />}
    </AppShell>
  );
}

export function ProfileSetupRoutePage() {
  return (
    <AppShell
      description="Complete your public profile, visibility-ready career details, photo, skills, and core alumni identity."
      eyebrow="Profile"
      title="Complete your profile"
    >
      {({ accessToken, user }) => (
        <ProfilePanel accessToken={accessToken} displayName={user.display_name} />
      )}
    </AppShell>
  );
}

export function ProgramAffiliationRoutePage() {
  return (
    <AppShell
      description="Add and maintain YALI program affiliation records that support verification and directory trust."
      eyebrow="Program affiliation"
      title="Program affiliation"
    >
      {({ accessToken, user }) => (
        <ProfilePanel accessToken={accessToken} displayName={user.display_name} />
      )}
    </AppShell>
  );
}

export function VerificationRoutePage() {
  return (
    <AppShell
      description="Submit alumni verification, upload evidence, and track the latest request status from the live verification API."
      eyebrow="Verification"
      title="Alumni verification"
    >
      {({ accessToken }) => <VerificationRequestPanel accessToken={accessToken} />}
    </AppShell>
  );
}

export function CommunitiesRoutePage() {
  return (
    <AppShell
      description="Browse, join, and create community spaces backed by the current communities API."
      eyebrow="Communities"
      title="Communities and chapters"
    >
      {({ accessToken, user }) => {
        const canCreate = user.roles.some((role) => adminRoles.includes(role));
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
    <AppShell description={description} eyebrow="Messages" title={title}>
      {({ accessToken, user }) => (
        <MessagingPanel accessToken={accessToken} currentUserId={user.id} />
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
      requiredRoles={adminRoles}
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
      requiredRoles={adminRoles}
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

