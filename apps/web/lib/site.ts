export const primaryNav = [
  { label: "Directory", href: "#directory" },
  { label: "Chapters", href: "#chapters" },
  { label: "Opportunities", href: "#opportunities" },
  { label: "Elections", href: "#trust" }
] as const;

export const platformStats = [
  { label: "Verified alumni", value: "50k+" },
  { label: "Countries represented", value: "49" },
  { label: "Active initiatives", value: "500+" },
  { label: "Grant funding facilitated", value: "$12M" }
] as const;

export const capabilityCards = [
  {
    title: "Verified networking",
    body: "Connect with a pre-vetted database of leaders where every profile is tied to a trusted alumni verification workflow."
  },
  {
    title: "Social impact initiatives",
    body: "Launch or scale community projects, recruit collaborators, track milestones, and publish measurable progress."
  },
  {
    title: "Resource library",
    body: "Share grants, toolkits, training resources, reports, and leadership knowledge across chapters and cohorts."
  },
  {
    title: "Democratic governance",
    body: "Run chapter elections, contribution campaigns, transparent ledgers, and audit-ready governance workflows."
  }
] as const;
