import type { AdminSurfaceId } from "./roles";
import { ADMIN_SURFACES } from "./roles";

export type NavigationItem = {
  href: string;
  label: string;
};

export type AdminNavigationItem = NavigationItem & {
  surfaceId: AdminSurfaceId;
};

export const PUBLIC_NAV: readonly NavigationItem[] = [
  { href: "/#chapters", label: "Mission" },
  { href: "/#opportunities", label: "Impact" },
  { href: "/#trust", label: "Trust" },
  { href: "/register", label: "Join" }
] as const;

export const MEMBER_NAV: readonly NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/directory", label: "Directory" },
  { href: "/communities", label: "Communities" },
  { href: "/messages", label: "Messages" },
  { href: "/initiatives", label: "Initiatives" },
  { href: "/events", label: "Events" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/mentorship", label: "Mentorship" },
  { href: "/resources", label: "Resources" },
  { href: "/success-stories", label: "Stories" },
  { href: "/contributions", label: "Contributions" },
  { href: "/elections", label: "Elections" }
] as const;

export const MEMBER_ONBOARDING_NAV: readonly NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile/setup", label: "Profile" },
  { href: "/profile/program-affiliation", label: "Program" },
  { href: "/verification", label: "Verification" },
  { href: "/onboarding", label: "Onboarding" }
] as const;

export const ADMIN_NAV: readonly AdminNavigationItem[] = ADMIN_SURFACES.map((surface) => ({
  href: surface.href,
  label: surface.label,
  surfaceId: surface.id
}));

export const SUPER_ADMIN_NAV: readonly NavigationItem[] = [
  { href: "/", label: "Owner Dashboard" },
  { href: "/diagnostics", label: "Diagnostics" },
  { href: "/roles", label: "Role Visibility" },
  { href: "/audit", label: "Audit & Security" },
  { href: "/system", label: "System Checks" }
] as const;
