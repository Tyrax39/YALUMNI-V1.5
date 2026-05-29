"use client";

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
