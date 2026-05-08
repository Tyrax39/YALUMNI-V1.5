"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  ADMIN_SURFACES,
  ApiClientError,
  type AdminAuditEvent,
  type AdminOverview,
  type AdminSurfaceId,
  type AuthUser,
  adminSurfacesForRoles,
  canAccessAdminSurface,
  fetchAdminAuditEvents,
  fetchAdminOverview,
  fetchSessionUser,
  isAdminRole
} from "@yalumni/frontend-shared";
import {
  BookOpen,
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardCheck,
  Gauge,
  Landmark,
  Library,
  LogOut,
  MessageSquareWarning,
  ShieldCheck,
  Vote
} from "lucide-react";

type AdminConsoleProps = {
  surfaceId: AdminSurfaceId;
};

type ConsoleState =
  | { status: "loading" }
  | {
      auditEvents: AdminAuditEvent[];
      overview: AdminOverview | null;
      status: "ready";
      user: AuthUser;
    }
  | { message: string; status: "error" };

type SurfaceDetail = {
  cta: string;
  rows: string[][];
  title: string;
};

const surfaceIcons = {
  chapters: Landmark,
  contributions: ClipboardCheck,
  elections: Vote,
  moderation: MessageSquareWarning,
  opportunities: BriefcaseBusiness,
  overview: Gauge,
  resources: Library,
  "success-stories": BookOpen,
  treasury: CircleDollarSign,
  verification: ShieldCheck
} satisfies Record<AdminSurfaceId, typeof Gauge>;

const surfaceDetails = {
  chapters: {
    cta: "Chapter analytics APIs are planned; this console is ready for routing and RBAC review.",
    rows: [
      ["Ghana chapter", "1,284 members", "health strong"],
      ["Rwanda chapter", "842 members", "leader handover due"],
      ["Kenya chapter", "1,036 members", "activity watch"]
    ],
    title: "Chapter operations"
  },
  contributions: {
    cta: "Payments and receipts backend is pending; finance review flows stay read-only here.",
    rows: [
      ["Innovation fund", "$18.4k", "receipts matched"],
      ["Scholarship campaign", "$9.2k", "approval pending"],
      ["Microgrant reserve", "$14.1k", "ledger ready"]
    ],
    title: "Contribution oversight"
  },
  elections: {
    cta: "Election backend is not implemented yet; candidate, voter-roll, and audit surfaces remain prototypes.",
    rows: [
      ["Chapter council 2026", "Voting", "monitor turnout"],
      ["Treasurer by-election", "Setup", "review voter roll"],
      ["Programs committee", "Closed", "publish audit"]
    ],
    title: "Election administration"
  },
  moderation: {
    cta: "Community and direct-message moderation APIs are live; content modules still need backend slices.",
    rows: [
      ["Community reports", "live", "triage reported posts"],
      ["Direct messages", "live", "review safety reports"],
      ["Stories/resources/opportunities", "prototype", "backend pending"]
    ],
    title: "Moderation queues"
  },
  opportunities: {
    cta: "Opportunity listings will plug into this queue when the marketplace backend lands.",
    rows: [
      ["Civic innovation grant", "partner org", "pending review"],
      ["Climate fellowship", "regional hub", "approved fixture"],
      ["Program manager role", "chapter partner", "pending review"]
    ],
    title: "Opportunity moderation"
  },
  overview: {
    cta: "High-level role-based console; drill into only the surfaces your role can operate.",
    rows: [
      ["Verification queue", "live", "review pending alumni"],
      ["Moderation queues", "live/partial", "community and message safety"],
      ["Finance/elections/content", "prototype", "backend modules pending"]
    ],
    title: "Admin operations overview"
  },
  resources: {
    cta: "Resource library moderation is route-ready and waiting on resource storage APIs.",
    rows: [
      ["Grant proposal toolkit", "Ghana chapter", "pending"],
      ["Mentorship playbook", "Rwanda chapter", "approved fixture"],
      ["Event checklist", "Kenya chapter", "needs changes"]
    ],
    title: "Resource review"
  },
  "success-stories": {
    cta: "Story publishing and evidence review will become active when editorial backend lands.",
    rows: [
      ["Agri-tech in Zambia", "Zambia", "pending media"],
      ["Girls in STEM bootcamp", "Nigeria", "needs edits"],
      ["Open budget fellows", "Kenya", "approved fixture"]
    ],
    title: "Success story moderation"
  },
  treasury: {
    cta: "Treasury data is fixture-shaped until payments, ledger, and receipt modules are implemented.",
    rows: [
      ["Receipts", "312", "2 exceptions"],
      ["Allocations", "$23.5k", "approval pending"],
      ["Audit exports", "planned", "backend pending"]
    ],
    title: "Treasury console"
  },
  verification: {
    cta: "Verification APIs are live; use the member app routes for full evidence review until this console gets deep queue wiring.",
    rows: [
      ["Pending evidence", "live count", "approve/reject in API"],
      ["Program affiliation", "live", "profile-backed"],
      ["Audit trace", "live", "recorded through auth admin audit"]
    ],
    title: "Verification queue"
  }
} satisfies Record<AdminSurfaceId, SurfaceDetail>;

export function AdminConsole({ surfaceId }: AdminConsoleProps) {
  const pathname = usePathname();
  const [state, setState] = useState<ConsoleState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const user = await fetchSessionUser();
        const [overviewResult, auditResult] = await Promise.allSettled([
          fetchAdminOverview(),
          fetchAdminAuditEvents(6)
        ]);

        if (!isMounted) {
          return;
        }

        setState({
          auditEvents: auditResult.status === "fulfilled" ? auditResult.value.events : [],
          overview: overviewResult.status === "fulfilled" ? overviewResult.value : null,
          status: "ready",
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
          message: caught instanceof Error ? caught.message : "The admin session could not be loaded.",
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
    return <GuardPanel description="Checking the admin session and role scope." title="Loading admin console" />;
  }

  if (state.status === "error") {
    return <GuardPanel description={state.message} title="Admin console unavailable" />;
  }

  const user = state.user;
  const isAdmin = isAdminRole(user.roles);
  const canAccess = canAccessAdminSurface(user.roles, surfaceId);
  const availableSurfaces = adminSurfacesForRoles(user.roles);
  const surface = ADMIN_SURFACES.find((item) => item.id === surfaceId) ?? ADMIN_SURFACES[0];
  const detail = surfaceDetails[surfaceId];

  if (!isAdmin) {
    return (
      <GuardPanel
        description="This app is reserved for administrative roles. Use the member workspace on port 3010 for alumni features."
        title="Admin role required"
      />
    );
  }

  if (!canAccess) {
    return (
      <Shell availableSurfaces={availableSurfaces} onLogout={handleLogout} pathname={pathname} user={user}>
        <GuardPanel
          description={`Signed in as ${user.email}, but this route is not included in your assigned admin role scope.`}
          eyebrow={`Current roles: ${user.roles.join(", ")}`}
          title="Route blocked by RBAC"
        />
      </Shell>
    );
  }

  return (
    <Shell availableSurfaces={availableSurfaces} onLogout={handleLogout} pathname={pathname} user={user}>
      <div className="grid gap-6">
        <section className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">
              RBAC admin console
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
              {detail.title}
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted">{surface.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={surface.status} />
            <StatusBadge label={surface.allowedRoles.join(" / ")} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total users"
            value={formatNumber(state.overview?.total_users)}
            detail="Live admin overview when backend is available."
          />
          <MetricCard
            label="Verified alumni"
            value={formatNumber(state.overview?.verified_users)}
            detail="Identity coverage from current API data."
          />
          <MetricCard
            label="Pending verification"
            value={formatNumber(state.overview?.pending_verification_users)}
            detail="Queue count for verification admins."
          />
          <MetricCard
            label="Active sessions"
            value={formatNumber(state.overview?.active_sessions)}
            detail="Security signal from auth sessions."
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white">
                <SurfaceIcon surfaceId={surfaceId} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">Operational scope</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{detail.cta}</p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-lg border border-border">
              <div className="hidden bg-surface px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-muted md:grid md:grid-cols-3">
                <span>Queue</span>
                <span>Signal</span>
                <span>Next action</span>
              </div>
              <div className="divide-y divide-border">
                {detail.rows.map((row) => (
                  <div className="grid gap-2 px-4 py-4 text-sm md:grid-cols-3" key={row.join(":")}>
                    {row.map((cell, index) => (
                      <p className="font-semibold text-ink" key={`${cell}:${index}`}>
                        {cell}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
            <h2 className="font-display text-2xl font-semibold text-ink">Recent audit</h2>
            <div className="mt-5 grid gap-3">
              {state.auditEvents.length ? (
                state.auditEvents.map((event) => (
                  <div className="rounded-lg border border-border bg-surface p-4" key={event.id}>
                    <p className="text-sm font-bold text-ink">{event.event_type ?? "Audit event"}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      {event.user_email ?? "system"} · {formatDate(event.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-border bg-surface p-4 text-sm leading-6 text-muted">
                  Audit records will appear here when the backend endpoint is reachable for this role.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}

function Shell({
  availableSurfaces,
  children,
  onLogout,
  pathname,
  user
}: {
  availableSurfaces: ReturnType<typeof adminSurfacesForRoles>;
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
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link className="focus-ring rounded-lg text-sm font-black text-primary" href="/">
            YALUMNI Admin
          </Link>
          <div className="flex items-center gap-3">
            <Link
              className="hidden text-sm font-bold text-muted transition hover:text-primary sm:inline"
              href="http://127.0.0.1:3010/dashboard"
            >
              Member app
            </Link>
            <Link
              className="hidden text-sm font-bold text-muted transition hover:text-primary sm:inline"
              href="http://127.0.0.1:3012/"
            >
              Super admin
            </Link>
            <div className="hidden items-center gap-3 rounded-full border border-border bg-white py-1 pl-1 pr-3 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {initials || "YA"}
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

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[272px_1fr]">
        <aside className="sticky top-16 hidden h-[calc(100vh-64px)] overflow-y-auto border-r border-border bg-[#f3f3fa] px-4 py-5 lg:block">
          <div className="mb-6 rounded-lg border border-border bg-white p-4">
            <p className="text-sm font-bold text-ink">Role scope</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-muted">{user.roles.join(", ")}</p>
          </div>
          <nav aria-label="Admin routes" className="grid gap-1">
            {availableSurfaces.map((surface) => (
              <SideNavLink
                href={surface.href}
                isActive={isActivePath(pathname, surface.href)}
                key={surface.id}
                label={surface.label}
                surfaceId={surface.id}
              />
            ))}
          </nav>
        </aside>

        <section className="min-w-0 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8">{children}</section>
      </div>

      <nav
        aria-label="Mobile admin routes"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 gap-1 border-t border-border bg-white/95 px-2 py-2 backdrop-blur lg:hidden"
      >
        {availableSurfaces.slice(0, 4).map((surface) => (
          <MobileNavLink
            href={surface.href}
            isActive={isActivePath(pathname, surface.href)}
            key={surface.id}
            label={surface.label}
            surfaceId={surface.id}
          />
        ))}
      </nav>
    </main>
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

function SideNavLink({
  href,
  isActive,
  label,
  surfaceId
}: {
  href: string;
  isActive: boolean;
  label: string;
  surfaceId: AdminSurfaceId;
}) {
  return (
    <Link
      className={`focus-ring flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${
        isActive
          ? "bg-white text-primary shadow-[inset_4px_0_0_#004A99]"
          : "text-muted hover:bg-white hover:text-primary"
      }`}
      href={href}
    >
      <SurfaceIcon surfaceId={surfaceId} />
      <span>{label}</span>
    </Link>
  );
}

function MobileNavLink({
  href,
  isActive,
  label,
  surfaceId
}: {
  href: string;
  isActive: boolean;
  label: string;
  surfaceId: AdminSurfaceId;
}) {
  return (
    <Link
      className={`focus-ring flex min-h-12 flex-col items-center justify-center rounded-lg text-[11px] font-bold ${
        isActive ? "bg-primary text-white" : "text-muted"
      }`}
      href={href}
    >
      <SurfaceIcon surfaceId={surfaceId} />
      <span className="mt-1 max-w-full truncate">{label}</span>
    </Link>
  );
}

function SurfaceIcon({ surfaceId }: { surfaceId: AdminSurfaceId }) {
  const Icon = surfaceIcons[surfaceId];
  return <Icon aria-hidden="true" className="h-4 w-4" />;
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

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
