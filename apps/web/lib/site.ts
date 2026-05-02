export const primaryNav = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Directory", href: "/dashboard#directory" },
  { label: "Communities", href: "/dashboard#communities" },
  { label: "Events", href: "/dashboard#events" },
  { label: "Admin", href: "/admin" }
] as const;

export const platformStats = [
  { label: "MVP modules", value: "8" },
  { label: "Core roles", value: "7" },
  { label: "Pilot focus", value: "Verified alumni" }
] as const;

export const capabilityCards = [
  {
    title: "Verified alumni identity",
    body: "Onboarding, profile completion, affiliation proof, and admin or chapter verification workflows."
  },
  {
    title: "Alumni discovery",
    body: "Search by country, program, cohort, sector, skills, interests, and availability while respecting privacy controls."
  },
  {
    title: "Communities and action",
    body: "Country chapters, sector groups, events, initiatives, opportunities, feed posts, and direct messages."
  },
  {
    title: "Governance-ready foundation",
    body: "Audit logs, role scopes, contribution ledgers, voter roll controls, and moderation queues planned from day one."
  }
] as const;

