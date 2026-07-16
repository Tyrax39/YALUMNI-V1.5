"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  ADMIN_SURFACES,
  ApiClientError,
  SUPER_ADMIN_NAV,
  type AdminAuditEvent,
  type AdminOverview,
  type AuthUser,
  type MwfAlumniSyncRun,
  type MwfAlumniSyncStatus,
  type SystemDiagnostics,
  fetchAdminAuditEvents,
  fetchAdminOverview,
  fetchMwfSyncRuns,
  fetchMwfSyncStatus,
  fetchSessionUser,
  fetchSystemDiagnostics,
  refreshMwfSync,
  isSuperAdmin
} from "@yalumni/frontend-shared";
import {
  Activity,
  BadgeCheck,
  ClipboardList,
  DatabaseZap,
  LogOut,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UsersRound
} from "lucide-react";

type SuperPageId = "audit" | "diagnostics" | "home" | "roles" | "system";

type SuperAdminConsoleProps = {
  pageId: SuperPageId;
};

type ConsoleState =
  | { status: "loading" }
  | {
      auditEvents: AdminAuditEvent[];
      overview: AdminOverview | null;
      status: "ready";
      systemDiagnostics: SystemDiagnostics | null;
      user: AuthUser;
    }
  | { message: string; status: "error" };

const pageCopy = {
  audit: {
    description: "Security event visibility, session risk indicators, and recent administrative audit entries.",
    eyebrow: "Audit and security",
    title: "Audit & Security"
  },
  diagnostics: {
    description: "Read-only owner diagnostics for route isolation, backend reachability, and protected account health.",
    eyebrow: "Owner diagnostics",
    title: "Platform Diagnostics"
  },
  home: {
    description: "Super-admin-only platform ownership console with health, role, and security signals.",
    eyebrow: "Super admin console",
    title: "Owner Dashboard"
  },
  roles: {
    description: "Role visibility matrix across administrative surfaces and member access scopes.",
    eyebrow: "Role visibility",
    title: "Role Matrix"
  },
  system: {
    description: "System checks for the separated runtimes, backend service, CORS, and auth session plumbing.",
    eyebrow: "System checks",
    title: "System Health"
  }
} satisfies Record<SuperPageId, { description: string; eyebrow: string; title: string }>;

export function SuperAdminConsole({ pageId }: SuperAdminConsoleProps) {
  const pathname = usePathname();
  const [state, setState] = useState<ConsoleState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const user = await fetchSessionUser();
        const [overviewResult, auditResult, systemResult] = await Promise.allSettled([
          fetchAdminOverview(),
          fetchAdminAuditEvents(8),
          fetchSystemDiagnostics()
        ]);

        if (!isMounted) {
          return;
        }

        setState({
          auditEvents: auditResult.status === "fulfilled" ? auditResult.value.events : [],
          overview: overviewResult.status === "fulfilled" ? overviewResult.value : null,
          status: "ready",
          systemDiagnostics: systemResult.status === "fulfilled" ? systemResult.value : null,
          user
        });
      } catch (caught) {
        if (!isMounted) {
          return;
        }
        if (caught instanceof ApiClientError && caught.status === 401) {
          window.location.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        setState({
          message: caught instanceof Error ? caught.message : "The super-admin session could not be loaded.",
          status: "error"
        });
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  async function handleLogout() {
    const csrfResponse = await fetch("/api/session/csrf", {
      cache: "no-store",
      credentials: "include"
    });
    const csrf = (await csrfResponse.json()) as { csrf_token: string };
    await fetch("/api/session/logout", {
      cache: "no-store",
      credentials: "include",
      headers: { "x-csrf-token": csrf.csrf_token },
      method: "POST"
    });
    window.location.assign("/login");
  }

  if (state.status === "loading") {
    return <GuardPanel description="Checking the platform owner session." title="Loading super-admin console" />;
  }

  if (state.status === "error") {
    return <GuardPanel description={state.message} title="Super-admin console unavailable" />;
  }

  if (!isSuperAdmin(state.user.roles)) {
    return (
      <GuardPanel
        description="This app is restricted to SUPER_ADMIN only. Use the RBAC admin console on port 3011 for other administrative roles."
        eyebrow={`Current roles: ${state.user.roles.join(", ")}`}
        title="Super-admin role required"
      />
    );
  }

  return (
    <Shell onLogout={handleLogout} pathname={pathname} user={state.user}>
      <div className="grid gap-6">
        <section className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">{pageCopy[pageId].eyebrow}</p>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
              {pageCopy[pageId].title}
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted">{pageCopy[pageId].description}</p>
          </div>
          <StatusBadge label="SUPER_ADMIN only" />
        </section>

        {pageId === "roles" ? <RoleMatrix /> : null}
        {pageId === "diagnostics" ? (
          <Diagnostics diagnostics={state.systemDiagnostics} overview={state.overview} user={state.user} />
        ) : null}
        {pageId === "audit" ? <AuditPanel events={state.auditEvents} overview={state.overview} /> : null}
        {pageId === "system" ? (
          <div className="grid gap-5">
            <SystemChecks diagnostics={state.systemDiagnostics} overview={state.overview} />
            <ReleaseReadinessPanel diagnostics={state.systemDiagnostics} />
            <MwfCachePanel />
          </div>
        ) : null}
        {pageId === "home" ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                detail="From the live admin overview endpoint when available."
                label="Total users"
                value={formatNumber(state.overview?.total_users)}
              />
              <MetricCard
                detail="Administrators across all non-owner roles."
                label="Admin users"
                value={formatNumber(state.overview?.admin_users)}
              />
              <MetricCard
                detail="Current auth session footprint."
                label="Active sessions"
                value={formatNumber(state.overview?.active_sessions)}
              />
              <MetricCard
                detail="Pending alumni verification requests."
                label="Verification queue"
                value={formatNumber(state.overview?.pending_verification_users)}
              />
            </section>
            <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <Diagnostics
                compact
                diagnostics={state.systemDiagnostics}
                overview={state.overview}
                user={state.user}
              />
              <AuditPanel events={state.auditEvents} overview={state.overview} compact />
            </section>
          </>
        ) : null}
      </div>
    </Shell>
  );
}

function Shell({
  children,
  onLogout,
  pathname,
  user
}: {
  children: React.ReactNode;
  onLogout: () => void;
  pathname: string;
  user: AuthUser;
}) {
  const initials = useMemo(() => {
    return user.display_name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user.display_name]);

  return (
    <main className="min-h-screen bg-surface text-ink">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link className="focus-ring rounded-lg text-sm font-black text-primary" href="/">
            YALUMNI Super Admin
          </Link>
          <div className="flex items-center gap-3">
            <Link className="hidden text-sm font-bold text-muted transition hover:text-primary sm:inline" href="http://127.0.0.1:3011/">
              Admin app
            </Link>
            <Link className="hidden text-sm font-bold text-muted transition hover:text-primary sm:inline" href="http://127.0.0.1:3010/dashboard">
              Member app
            </Link>
            <div className="hidden items-center gap-3 rounded-full border border-border bg-white py-1 pl-1 pr-3 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {initials || "SA"}
              </div>
              <div className="max-w-40 truncate text-xs font-semibold text-muted">{user.email}</div>
            </div>
            <button
              aria-label="Sign out"
              className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-primary"
              onClick={onLogout}
              type="button"
            >
              <LogOut aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="grid w-full lg:grid-cols-[272px_1fr]">
        <aside className="sticky top-16 hidden h-[calc(100vh-64px)] overflow-y-auto border-r border-border bg-[#f3f3fa] px-4 py-5 lg:block">
          <div className="mb-6 rounded-lg border border-border bg-white p-4">
            <p className="text-sm font-bold text-ink">Protected owner account</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-muted">
              This console is intentionally isolated from normal administrative surfaces.
            </p>
          </div>
          <nav aria-label="Super-admin routes" className="grid gap-1">
            {SUPER_ADMIN_NAV.map((item) => (
              <SideNavLink href={item.href} isActive={isActivePath(pathname, item.href)} key={item.href} label={item.label} />
            ))}
          </nav>
        </aside>

        <section className="min-w-0 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8">{children}</section>
      </div>

      <nav
        aria-label="Mobile super-admin routes"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t border-border bg-white/95 px-2 py-2 backdrop-blur lg:hidden"
      >
        {SUPER_ADMIN_NAV.map((item) => (
          <Link
            className={`focus-ring flex min-h-12 flex-col items-center justify-center rounded-lg text-[10px] font-bold ${
              isActivePath(pathname, item.href) ? "bg-primary text-white" : "text-muted"
            }`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}

function Diagnostics({
  compact = false,
  diagnostics,
  overview,
  user
}: {
  compact?: boolean;
  diagnostics: SystemDiagnostics | null;
  overview: AdminOverview | null;
  user: AuthUser;
}) {
  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white">
          <DatabaseZap aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Owner diagnostics</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Read-only platform owner signals; destructive account operations are intentionally absent.
          </p>
        </div>
      </div>
      <div className={`mt-6 grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
        <CheckRow label="SUPER_ADMIN role" status={isSuperAdmin(user.roles) ? "healthy" : "blocked"} />
        <CheckRow label="Owner demotion/removal" status="blocked by policy" />
        <CheckRow label="Backend admin overview" status={overview ? "reachable" : "not reachable"} />
        <CheckRow label="Runtime isolation" status="3010 / 3011 / 3012 split" />
        <CheckRow
          label="Release commit"
          status={diagnostics?.release.commit_sha ? diagnostics.release.commit_sha.slice(0, 12) : "not reported"}
        />
        <CheckRow
          label="Checkout provider readiness"
          status={
            diagnostics
              ? diagnostics.payments.checkout_provider === "STRIPE"
                ? diagnostics.payments.stripe.checkout_ready
                  ? "stripe ready"
                  : "stripe incomplete"
                : diagnostics.payments.checkout_provider === "FLUTTERWAVE"
                  ? diagnostics.payments.flutterwave.checkout_ready
                    ? "flutterwave ready"
                    : "flutterwave incomplete"
                  : diagnostics.payments.checkout_provider.toLowerCase()
              : "loading"
          }
        />
      </div>
    </section>
  );
}

function AuditPanel({
  compact = false,
  events,
  overview
}: {
  compact?: boolean;
  events: AdminAuditEvent[];
  overview: AdminOverview | null;
}) {
  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white">
          <ShieldAlert aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Security overview</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Active sessions: {formatNumber(overview?.active_sessions)}. Latest events are shown when permitted by backend RBAC.
          </p>
        </div>
      </div>
      <div className={`mt-6 grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
        {events.length ? (
          events.map((event) => (
            <div className="rounded-lg border border-border bg-surface p-4" key={event.id}>
              <p className="text-sm font-bold text-ink">{event.event_type ?? "Audit event"}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                {event.user_email ?? "system"} · {formatDate(event.created_at)}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-border bg-surface p-4 text-sm leading-6 text-muted">
            Audit records will appear here when the endpoint returns events.
          </p>
        )}
      </div>
    </section>
  );
}

function RoleMatrix() {
  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white">
          <UsersRound aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Administrative access matrix</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            SUPER_ADMIN can see every operational surface; non-owner admins are restricted by the RBAC map.
          </p>
        </div>
      </div>
      <div className="mt-6 overflow-hidden rounded-lg border border-border">
        <div className="hidden bg-surface px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-muted md:grid md:grid-cols-3">
          <span>Surface</span>
          <span>Allowed roles</span>
          <span>State</span>
        </div>
        <div className="divide-y divide-border">
          {ADMIN_SURFACES.map((surface) => (
            <div className="grid gap-2 px-4 py-4 text-sm md:grid-cols-3" key={surface.id}>
              <p className="font-semibold text-ink">{surface.label}</p>
              <p className="font-semibold text-muted">{surface.allowedRoles.join(", ")}</p>
              <p className="font-semibold text-primary">{surface.status}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SystemChecks({
  diagnostics,
  overview
}: {
  diagnostics: SystemDiagnostics | null;
  overview: AdminOverview | null;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SystemCard
        icon={<Activity className="h-5 w-5" />}
        label="Member app"
        value={diagnostics ? shortRuntimeUrl(diagnostics.runtime.web_base_url) : "3010"}
      />
      <SystemCard
        icon={<ClipboardList className="h-5 w-5" />}
        label="Admin console"
        value={diagnostics ? shortRuntimeUrl(diagnostics.runtime.admin_console_base_url) : "3011"}
      />
      <SystemCard
        icon={<ShieldCheck className="h-5 w-5" />}
        label="Super admin"
        value={diagnostics ? shortRuntimeUrl(diagnostics.runtime.super_admin_console_base_url) : "3012"}
      />
      <SystemCard icon={<BadgeCheck className="h-5 w-5" />} label="Backend API" value={overview ? "reachable" : "check 8002"} />
    </section>
  );
}

function ReleaseReadinessPanel({ diagnostics }: { diagnostics: SystemDiagnostics | null }) {
  if (!diagnostics) {
    return (
      <section className="rounded-lg border border-border bg-white p-5 shadow-soft">
        <p className="text-sm font-semibold text-muted">
          Release diagnostics will appear here when the backend system diagnostics endpoint is reachable.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Release parity</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Deployment and provider readiness</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            This surface summarizes the active API runtime, reported release metadata, and whether
            the configured Stripe or Flutterwave checkout path has the minimum settings required for staging.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <SystemMetric
              label="Environment"
              value={diagnostics.environment}
            />
            <SystemMetric
              label="Release SHA"
              value={diagnostics.release.commit_sha?.slice(0, 12) ?? "not set"}
            />
            <SystemMetric
              label="Release version"
              value={diagnostics.release.release_version ?? "not set"}
            />
            <SystemMetric
              label="Deployment target"
              value={diagnostics.release.deployment_target ?? "local/dev"}
            />
          </div>
        </div>
        <div className="grid gap-3">
          <CheckRow
            label={`Checkout provider: ${diagnostics.payments.checkout_provider}`}
            status={
              diagnostics.payments.checkout_provider === "STRIPE"
                ? diagnostics.payments.stripe.checkout_ready
                  ? "ready"
                  : "incomplete"
                : diagnostics.payments.checkout_provider === "FLUTTERWAVE"
                  ? diagnostics.payments.flutterwave.checkout_ready
                    ? "ready"
                    : "incomplete"
                  : diagnostics.payments.checkout_provider.toLowerCase()
            }
          />
          <CheckRow
            label="Stripe staging config"
            status={diagnostics.payments.stripe.checkout_ready ? "ready" : "missing settings"}
          />
          <CheckRow
            label="Flutterwave staging config"
            status={diagnostics.payments.flutterwave.checkout_ready ? "ready" : "missing settings"}
          />
          <CheckRow
            label="Email delivery"
            status={diagnostics.runtime.email_ready ? diagnostics.runtime.email_provider : "not ready"}
          />
          <CheckRow
            label="Redis configured"
            status={diagnostics.runtime.redis_configured ? "yes" : "no"}
          />
        </div>
      </div>
    </section>
  );
}

function MwfCachePanel() {
  const [runs, setRuns] = useState<MwfAlumniSyncRun[]>([]);
  const [status, setStatus] = useState<MwfAlumniSyncStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchMwfSyncStatus(), fetchMwfSyncRuns(6)])
      .then(([statusResponse, runsResponse]) => {
        if (isMounted) {
          setStatus(statusResponse);
          setRuns(runsResponse.runs);
          setMessage(null);
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setMessage(
            caught instanceof ApiClientError ? caught.message : "MWF cache status unavailable."
          );
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    setMessage(null);
    try {
      const response = await refreshMwfSync();
      const runHistory = await fetchMwfSyncRuns(6);
      setStatus(response);
      setRuns(runHistory.runs);
    } catch (caught) {
      setMessage(caught instanceof ApiClientError ? caught.message : "MWF cache refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }

  const headline = status
    ? `${status.active_profile_count.toLocaleString()} profiles cached`
    : "Status loading";
  const stateLabel = status?.sync_in_progress
    ? "Refresh running"
    : status?.cache_empty
      ? "Empty cache"
      : status?.cache_stale
        ? "Stale cache"
        : "Current cache";

  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">
              <DatabaseZap aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-muted">
                MWF alumni cache
              </p>
              <h3 className="mt-1 font-display text-2xl font-bold text-ink">{headline}</h3>
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">
            Super-admin-only controls for the Mandela Washington Fellowship public alumni cache.
            Member searches use this local cache instead of calling the official source live.
          </p>
        </div>
        <button
          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={refreshing}
          onClick={handleRefresh}
          type="button"
        >
          <RefreshCw aria-hidden="true" className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing" : "Refresh cache"}
        </button>
      </div>

      {message ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {message}
        </p>
      ) : null}

      {status ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SystemMetric label="State" value={stateLabel} />
          <SystemMetric label="TTL" value={`${status.cache_ttl_hours}h`} />
          <SystemMetric label="Worker cadence" value={formatDuration(status.worker_interval_seconds)} />
          <SystemMetric
            label="Last synced"
            value={status.last_synced_at ? formatDate(status.last_synced_at) : "pending"}
          />
          <SystemMetric label="Last run" value={status.latest_run?.status ?? "none"} />
        </div>
      ) : null}

      {status?.latest_run?.error_message ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {status.latest_run.error_message}
        </p>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-lg border border-border">
        <div className="bg-surface px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Recent sync runs</p>
        </div>
        <div className="divide-y divide-border">
          {runs.length ? (
            runs.map((run) => <SyncRunRow key={run.id} run={run} />)
          ) : (
            <p className="px-4 py-5 text-sm font-semibold text-muted">
              Sync history will appear after the first cache refresh.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function SyncRunRow({ run }: { run: MwfAlumniSyncRun }) {
  const changedCount = run.imported_count + run.updated_count + run.deactivated_count;
  return (
    <div className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1fr_1fr_auto] md:items-center">
      <div>
        <p className="font-bold text-ink">{run.status}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
          {formatDate(run.started_at)}
        </p>
      </div>
      <p className="text-sm font-semibold text-muted">
        {run.fetched_count.toLocaleString()} fetched · {changedCount.toLocaleString()} changed
      </p>
      <span className="rounded-md border border-border bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
        {run.finished_at ? "finished" : "running"}
      </span>
    </div>
  );
}

function SystemMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

function SystemCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">{icon}</div>
      <p className="mt-4 text-sm font-bold text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-primary">{value}</p>
    </article>
  );
}

function MetricCard({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-3 font-display text-3xl font-bold text-primary">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
    </article>
  );
}

function CheckRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3">
      <p className="text-sm font-bold text-ink">{label}</p>
      <span className="rounded-md border border-border bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
        {status}
      </span>
    </div>
  );
}

function GuardPanel({
  description,
  eyebrow,
  title
}: {
  description: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-surface px-5 py-12 text-ink">
      <section className="mx-auto flex min-h-[calc(100vh-96px)] max-w-5xl items-center">
        <div className="w-full rounded-lg border border-border bg-white p-6 shadow-soft sm:p-8">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">{eyebrow}</p>
          ) : null}
          <h1 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{description}</p>
        </div>
      </section>
    </main>
  );
}

function SideNavLink({ href, isActive, label }: { href: string; isActive: boolean; label: string }) {
  return (
    <Link
      className={`focus-ring flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${
        isActive
          ? "bg-white text-primary shadow-[inset_4px_0_0_#004A99]"
          : "text-muted hover:bg-white hover:text-primary"
      }`}
      href={href}
    >
      <ShieldCheck aria-hidden="true" className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded-md border border-border bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
      {label}
    </span>
  );
}

function formatNumber(value: number | undefined) {
  return typeof value === "number" ? value.toLocaleString() : "n/a";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatDuration(seconds: number) {
  if (seconds % 3600 === 0) {
    return `${seconds / 3600}h`;
  }
  if (seconds % 60 === 0) {
    return `${seconds / 60}m`;
  }
  return `${seconds}s`;
}

function shortRuntimeUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.hostname}:${url.port}`;
  } catch {
    return value;
  }
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
