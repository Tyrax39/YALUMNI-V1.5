"use client";

import type { ComponentType, ReactNode } from "react";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  Handshake,
  Home,
  Landmark,
  Library,
  MessageSquare,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Vote
} from "lucide-react";
import {
  MEMBER_NAV,
  MEMBER_ONBOARDING_NAV,
  hasMemberWorkspaceAccess,
  isAdminRole
} from "@yalumni/frontend-shared";

import { ProtectedRoute, ProtectedRouteContext } from "@/components/auth/protected-route";

type NavItem = {
  href: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  label: string;
};

type AppShellProps = {
  actions?: ReactNode;
  allowLocalAdminBootstrap?: boolean;
  children: (context: ProtectedRouteContext) => ReactNode;
  description: string;
  eyebrow?: string;
  requiredRoles?: readonly string[];
  title: string;
};

const navIconByHref: Record<string, ComponentType<{ className?: string; size?: number }>> = {
  "/communities": Landmark,
  "/contributions": CircleDollarSign,
  "/dashboard": Home,
  "/directory": Users,
  "/elections": Vote,
  "/events": CalendarDays,
  "/initiatives": Rocket,
  "/mentorship": Handshake,
  "/messages": MessageSquare,
  "/onboarding": Rocket,
  "/opportunities": BriefcaseBusiness,
  "/profile/program-affiliation": ShieldCheck,
  "/profile/setup": Settings,
  "/resources": Library,
  "/success-stories": BookOpen,
  "/verification": ShieldCheck
};

function withIcons(items: readonly { href: string; label: string }[]): NavItem[] {
  return items.map((item) => ({
    ...item,
    icon: navIconByHref[item.href] ?? Home
  }));
}

export function AppShell({
  actions,
  allowLocalAdminBootstrap = false,
  children,
  description,
  eyebrow = "YALUMNI workspace",
  requiredRoles = [],
  title
}: AppShellProps) {
  return (
    <main className="min-h-screen bg-surface text-ink">
      <ProtectedRoute
        allowLocalAdminBootstrap={allowLocalAdminBootstrap}
        description={description}
        requiredRoles={requiredRoles}
        title={title}
      >
        {(context) => (
          <ShellChrome actions={actions} context={context} description={description} eyebrow={eyebrow} title={title}>
            {children(context)}
          </ShellChrome>
        )}
      </ProtectedRoute>
    </main>
  );
}

function ShellChrome({
  actions,
  children,
  context,
  description,
  eyebrow,
  title
}: {
  actions?: ReactNode;
  children: ReactNode;
  context: ProtectedRouteContext;
  description: string;
  eyebrow: string;
  title: string;
}) {
  const pathname = usePathname();
  const hasAdminRole = isAdminRole(context.user.roles);
  const hasMemberAccess = hasMemberWorkspaceAccess(context.user.roles);
  const memberNav = withIcons(hasMemberAccess ? MEMBER_NAV : MEMBER_ONBOARDING_NAV);
  const mobileNav = memberNav.slice(0, 5);
  const initials = context.user.display_name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-5">
            <Link className="focus-ring shrink-0 rounded-lg" href="/dashboard">
              <Image
                alt="YALUMNI"
                className="block h-auto w-[132px] object-contain"
                height={34}
                priority
                src="/brand/yalumni-logo-horizontal.svg"
                width={156}
              />
            </Link>
            <nav aria-label="Primary navigation" className="hidden items-center gap-5 xl:flex">
              {memberNav.slice(0, 6).map((item) => (
                <TopNavLink isActive={isActivePath(pathname, item.href)} item={item} key={item.href} />
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden h-10 w-72 items-center gap-2 rounded-full border border-border bg-surface-container-low px-4 lg:flex">
              <Search aria-hidden="true" className="h-4 w-4 text-muted" />
              <span className="text-sm font-semibold text-muted">Search members, resources...</span>
            </div>
            <Link
              aria-label="Notifications"
              className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-primary"
              href="/dashboard"
            >
              <Bell aria-hidden="true" className="h-5 w-5" />
            </Link>
            {hasAdminRole ? (
              <Link
                className="focus-ring hidden min-h-10 items-center rounded-lg border border-border bg-white px-3 text-xs font-bold text-muted transition hover:border-primary hover:text-primary md:inline-flex"
                href="http://127.0.0.1:3011/"
              >
                Admin console
              </Link>
            ) : null}
            <Link
              aria-label="Settings"
              className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-primary"
              href="/profile/setup"
            >
              <Settings aria-hidden="true" className="h-5 w-5" />
            </Link>
            <div className="hidden items-center gap-3 rounded-full border border-border bg-white py-1 pl-1 pr-3 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {initials || "YA"}
              </div>
              <div className="max-w-36 truncate text-xs font-semibold text-muted">{context.user.email}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[272px_1fr]">
        <aside className="sticky top-16 hidden h-[calc(100vh-64px)] overflow-y-auto border-r border-border bg-[#f3f3fa] px-4 py-5 lg:block">
          <div className="mb-6 rounded-lg border border-border bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                <Landmark aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-ink">Pan-African Network</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                  Verified workspace
                </p>
              </div>
            </div>
          </div>

          <NavGroup
            items={memberNav}
            label={hasMemberAccess ? "Member workspace" : "Account setup"}
            pathname={pathname}
          />
          {hasAdminRole ? (
            <div className="mb-7 rounded-lg border border-border bg-white p-4">
              <p className="text-sm font-bold text-ink">Administrative access</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Admin surfaces now run in the isolated RBAC console.
              </p>
              <Link
                className="focus-ring mt-4 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-bold text-white"
                href="http://127.0.0.1:3011/"
              >
                Open admin console
              </Link>
            </div>
          ) : null}
        </aside>

        <section className="min-w-0 px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8">
          <div className="mb-6 grid gap-4 border-b border-border pb-6 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">{eyebrow}</p>
              <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted">{description}</p>
            </div>
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </div>
          {children}
        </section>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-white/95 px-2 py-2 backdrop-blur lg:hidden"
      >
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              className={`focus-ring flex min-h-12 flex-col items-center justify-center rounded-lg text-[11px] font-bold ${
                active ? "bg-primary text-white" : "text-muted"
              }`}
              href={item.href}
              key={item.href}
            >
              <Icon aria-hidden="true" className="mb-1 h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function NavGroup({ items, label, pathname }: { items: NavItem[]; label: string; pathname: string }) {
  return (
    <div className="mb-7">
      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <nav className="grid gap-1" aria-label={label}>
        {items.map((item) => (
          <SideNavLink isActive={isActivePath(pathname, item.href)} item={item} key={item.href} />
        ))}
      </nav>
    </div>
  );
}

function SideNavLink({ isActive, item }: { isActive: boolean; item: NavItem }) {
  const Icon = item.icon;
  return (
    <Link
      className={`focus-ring flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${
        isActive
          ? "bg-white text-primary shadow-[inset_4px_0_0_#004A99]"
          : "text-muted hover:bg-white hover:text-primary"
      }`}
      href={item.href}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      <span>{item.label}</span>
    </Link>
  );
}

function TopNavLink({ isActive, item }: { isActive: boolean; item: NavItem }) {
  return (
    <Link
      className={`focus-ring rounded-md text-sm font-bold transition ${
        isActive ? "text-primary" : "text-muted hover:text-primary"
      }`}
      href={item.href}
    >
      {item.label}
    </Link>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
