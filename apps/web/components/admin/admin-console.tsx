"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { AdminOverview, adminRoles, getAdminOverview } from "@/lib/api";

const queues = [
  ["Verification queue", "Review alumni evidence, approve, reject, or request more information."],
  ["User management", "Assign roles, review account status, and audit sensitive changes."],
  ["Moderation", "Resolve reports for posts, profiles, messages, events, and communities."],
  ["Governance", "Prepare contribution, election, and audit workflows for later phases."]
] as const;

type OverviewState =
  | { status: "loading" }
  | { status: "ready"; overview: AdminOverview }
  | { status: "error"; message: string };

export function AdminConsole() {
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
          <Link className="text-sm font-semibold text-primary" href="/dashboard">
            Member dashboard
          </Link>
        </div>
      </header>
      <ProtectedRoute
        allowLocalAdminBootstrap
        description="Admin queues require a platform, verification, moderation, finance, election, or super-admin role."
        requiredRoles={adminRoles}
        title="Admin console"
      >
        {({ accessToken, user }) => <AdminOverviewPanel accessToken={accessToken} email={user.email} />}
      </ProtectedRoute>
    </main>
  );
}

function AdminOverviewPanel({ accessToken, email }: { accessToken: string; email: string }) {
  const [state, setState] = useState<OverviewState>({ status: "loading" });

  useEffect(() => {
    getAdminOverview(accessToken)
      .then((overview) => setState({ status: "ready", overview }))
      .catch(() =>
        setState({
          status: "error",
          message: "The admin overview could not be loaded for this session."
        })
      );
  }, [accessToken]);

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
        Admin console
      </p>
      <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold text-ink">
        Operational queues for verification, trust, and governance.
      </h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
        Signed in as {email}. This route now checks live API permissions before showing privileged
        workflow data.
      </p>

      {state.status === "loading" ? (
        <div className="mt-10 rounded-lg border border-border bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold text-muted">Loading admin overview...</p>
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="mt-10 rounded-lg border border-red-200 bg-red-50 p-6 shadow-soft">
          <p className="text-sm font-semibold text-red-700">{state.message}</p>
        </div>
      ) : null}

      {state.status === "ready" ? (
        <>
          <div className="mt-10 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            <MetricCard label="Total users" value={state.overview.total_users} />
            <MetricCard label="Verified" value={state.overview.verified_users} />
            <MetricCard label="Unverified" value={state.overview.unverified_users} />
            <MetricCard label="Active sessions" value={state.overview.active_sessions} />
            <MetricCard label="Admins" value={state.overview.admin_users} />
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {queues.map(([title, body]) => (
              <article className="rounded-lg border border-border bg-white p-6 shadow-soft" key={title}>
                <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-lg border border-border bg-white p-6 shadow-soft">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">
                  Latest security events
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Recent auth and role-sensitive actions for audit visibility.
                </p>
              </div>
              <p className="text-sm font-semibold text-primary">
                Pending verification: {state.overview.pending_verification_users}
              </p>
            </div>
            <div className="mt-5 divide-y divide-border">
              {state.overview.latest_security_events.map((event) => (
                <div className="grid gap-2 py-4 text-sm sm:grid-cols-[1fr_auto]" key={event.id}>
                  <p className="font-semibold text-ink">{event.event_type.replaceAll("_", " ")}</p>
                  <time className="text-muted" dateTime={event.created_at}>
                    {new Date(event.created_at).toLocaleString()}
                  </time>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-3 font-display text-3xl font-bold text-primary">{value}</p>
    </article>
  );
}
