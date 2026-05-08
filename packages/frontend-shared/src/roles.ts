export const SUPER_ADMIN_ROLE = "SUPER_ADMIN" as const;
export const PLATFORM_ADMIN_ROLE = "PLATFORM_ADMIN" as const;
export const ALUMNI_MEMBER_ROLE = "ALUMNI_MEMBER" as const;
export const UNVERIFIED_USER_ROLE = "UNVERIFIED_USER" as const;

export const ADMIN_ROLES = [
  SUPER_ADMIN_ROLE,
  PLATFORM_ADMIN_ROLE,
  "VERIFICATION_ADMIN",
  "MODERATOR",
  "FINANCE_ADMIN",
  "ELECTION_ADMIN"
] as const;

export const MEMBER_ACCESS_ROLES = [ALUMNI_MEMBER_ROLE, SUPER_ADMIN_ROLE] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type MemberAccessRole = (typeof MEMBER_ACCESS_ROLES)[number];
export type RoleName = AdminRole | MemberAccessRole | typeof UNVERIFIED_USER_ROLE | string;

export type AdminSurfaceId =
  | "overview"
  | "verification"
  | "moderation"
  | "opportunities"
  | "resources"
  | "success-stories"
  | "elections"
  | "treasury"
  | "contributions"
  | "chapters";

export type AdminSurface = {
  allowedRoles: readonly AdminRole[];
  description: string;
  href: string;
  id: AdminSurfaceId;
  label: string;
  status: "live API" | "prototype" | "partial";
};

const broadOperationalRoles = [SUPER_ADMIN_ROLE, PLATFORM_ADMIN_ROLE] as const;
const moderatorRoles = [SUPER_ADMIN_ROLE, PLATFORM_ADMIN_ROLE, "MODERATOR"] as const;
const financeRoles = [SUPER_ADMIN_ROLE, PLATFORM_ADMIN_ROLE, "FINANCE_ADMIN"] as const;
const electionRoles = [SUPER_ADMIN_ROLE, PLATFORM_ADMIN_ROLE, "ELECTION_ADMIN"] as const;
const verificationRoles = [SUPER_ADMIN_ROLE, PLATFORM_ADMIN_ROLE, "VERIFICATION_ADMIN"] as const;

export const ADMIN_SURFACES: readonly AdminSurface[] = [
  {
    allowedRoles: ADMIN_ROLES,
    description: "Operational queue health, pending review totals, and recent audit activity.",
    href: "/",
    id: "overview",
    label: "Overview",
    status: "partial"
  },
  {
    allowedRoles: verificationRoles,
    description: "Review alumni verification requests and evidence.",
    href: "/verification",
    id: "verification",
    label: "Verification",
    status: "live API"
  },
  {
    allowedRoles: moderatorRoles,
    description: "Community, message, story, resource, and opportunity moderation queues.",
    href: "/moderation",
    id: "moderation",
    label: "Moderation",
    status: "live API"
  },
  {
    allowedRoles: moderatorRoles,
    description: "Review submitted opportunity listings before publication.",
    href: "/opportunities",
    id: "opportunities",
    label: "Opportunities",
    status: "prototype"
  },
  {
    allowedRoles: moderatorRoles,
    description: "Review contributed resources and publishing metadata.",
    href: "/resources",
    id: "resources",
    label: "Resources",
    status: "prototype"
  },
  {
    allowedRoles: moderatorRoles,
    description: "Review impact stories, media rights, and editorial notes.",
    href: "/success-stories",
    id: "success-stories",
    label: "Success Stories",
    status: "prototype"
  },
  {
    allowedRoles: electionRoles,
    description: "Manage election setup, candidates, voter rolls, privacy, and audit readiness.",
    href: "/elections",
    id: "elections",
    label: "Elections",
    status: "prototype"
  },
  {
    allowedRoles: financeRoles,
    description: "Treasury overview, contribution campaigns, receipts, and ledger checks.",
    href: "/treasury",
    id: "treasury",
    label: "Treasury",
    status: "prototype"
  },
  {
    allowedRoles: financeRoles,
    description: "Contribution campaign review and donor receipt exception handling.",
    href: "/contributions",
    id: "contributions",
    label: "Contributions",
    status: "prototype"
  },
  {
    allowedRoles: broadOperationalRoles,
    description: "Chapter health, community leaders, analytics, and operational follow-up.",
    href: "/chapters",
    id: "chapters",
    label: "Chapters",
    status: "prototype"
  }
] as const;

export function hasRole(roles: readonly string[] = [], role: string): boolean {
  return roles.includes(role);
}

export function hasAnyRole(
  roles: readonly string[] = [],
  allowedRoles: readonly string[] = []
): boolean {
  return allowedRoles.some((role) => roles.includes(role));
}

export function isSuperAdmin(roles: readonly string[] = []): boolean {
  return hasRole(roles, SUPER_ADMIN_ROLE);
}

export function isAdminRole(roles: readonly string[] = []): boolean {
  return hasAnyRole(roles, ADMIN_ROLES);
}

export function hasMemberWorkspaceAccess(roles: readonly string[] = []): boolean {
  return hasAnyRole(roles, MEMBER_ACCESS_ROLES);
}

export function canAccessAdminSurface(
  roles: readonly string[] = [],
  surfaceId: AdminSurfaceId
): boolean {
  const surface = ADMIN_SURFACES.find((item) => item.id === surfaceId);
  return surface ? hasAnyRole(roles, surface.allowedRoles) : false;
}

export function adminSurfacesForRoles(roles: readonly string[] = []): AdminSurface[] {
  return ADMIN_SURFACES.filter((surface) => canAccessAdminSurface(roles, surface.id));
}
