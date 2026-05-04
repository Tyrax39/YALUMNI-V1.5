"use client";

import Image from "next/image";
import Link from "next/link";

import { ProfilePanel } from "@/components/alumni/profile-panel";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SessionCard } from "@/components/auth/session-card";
import { SessionManagementPanel } from "@/components/auth/session-management-panel";
import { adminRoles } from "@/lib/api";

const modules = [
  ["Verification", "Pending review queue and profile completion"],
  ["Directory", "Search by program, country, cohort, sector, and skills"],
  ["Communities", "Country chapters, sector groups, and private working teams"],
  ["Events", "RSVPs, gatherings, agendas, speakers, and check-in planning"],
  ["Messages", "Direct conversations with privacy and blocking controls"],
  ["Governance", "Contributions, elections, audit logs, and reports"]
] as const;

export function DashboardWorkspace() {
  return (
    <main className="min-h-screen bg-surface">
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
            href="/admin"
          >
            Admin console
          </Link>
        </div>
      </header>
      <ProtectedRoute
        description="The member workspace is only available after a valid session check."
        title="Member workspace"
      >
        {({ accessToken, clearSession, refreshToken, setUser, user }) => {
          const hasAdminRole = user.roles.some((role) => adminRoles.includes(role));

          return (
            <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
              <div className="grid gap-8 lg:grid-cols-[0.75fr_0.25fr]">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
                    Member workspace
                  </p>
                  <h1 className="mt-4 font-display text-4xl font-bold text-ink">
                    Welcome to your YALUMNI workspace.
                  </h1>
                  <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
                    Manage your verified alumni identity, keep your program record current, and
                    prepare for verification, discovery, communities, events, and governance tools.
                  </p>
                  {!hasAdminRole ? (
                    <p className="mt-5 max-w-2xl rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold text-muted">
                      Admin tools are permission-gated. Visit the admin route to test local
                      development bootstrap access.
                    </p>
                  ) : null}
                </div>
                <SessionCard
                  accessToken={accessToken}
                  initialUser={user}
                  onSessionEnd={clearSession}
                  onUserChange={setUser}
                />
              </div>
              <ProfilePanel accessToken={accessToken} />
              <SessionManagementPanel
                accessToken={accessToken}
                onCurrentSessionRevoked={clearSession}
                refreshToken={refreshToken}
              />
              <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {modules.map(([title, body]) => (
                  <article className="rounded-lg border border-border bg-white p-5" key={title}>
                    <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
                    <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
                  </article>
                ))}
              </div>
            </section>
          );
        }}
      </ProtectedRoute>
    </main>
  );
}
