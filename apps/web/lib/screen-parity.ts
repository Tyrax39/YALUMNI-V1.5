export type ScreenDataSource = "fixture" | "live API" | "placeholder";

export type BackendDependencyStatus =
  | "implemented"
  | "partially implemented"
  | "not implemented";

export type ScreenParityRecord = {
  backendDependencyStatus: BackendDependencyStatus;
  dataSource: ScreenDataSource;
  exportFolder: string;
  notes: string;
  route: string;
  status: string;
};

export type FeatureMetric = {
  detail?: string;
  label: string;
  value: string;
};

export type FeatureCard = {
  body: string;
  meta?: string;
  title: string;
};

export type FeatureAction = {
  disabled?: boolean;
  href?: string;
  label: string;
};

export type FeatureScreenConfig = {
  backendDependencyStatus: BackendDependencyStatus;
  dataSource: ScreenDataSource;
  description: string;
  emptyState?: string;
  eyebrow: string;
  highlights: FeatureCard[];
  metrics: FeatureMetric[];
  primaryAction?: FeatureAction;
  requiresAdmin?: boolean;
  route: string;
  secondaryAction?: FeatureAction;
  sourceExports: string[];
  table: {
    headers: string[];
    rows: string[][];
  };
  title: string;
  workflow: string[];
};

export const designExportRoot =
  "C:\\xampp\\htdocs\\yalumni-v0\\Yalumni_rebuild_docs\\design\\exports";

export const screenParityRecords: ScreenParityRecord[] = [
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "admin_election_console",
    notes: "Legacy member-app route now hands off to the separate live admin console election operations workflow.",
    route: "/admin/elections/[electionId]",
    status: "live redirect"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "admin_verification_queue",
    notes: "Dedicated route wraps the live verification review queue.",
    route: "/admin/verification",
    status: "live route"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "agenda_speaker_planner",
    notes: "Agenda and speaker planner surface until event APIs land.",
    route: "/events/[eventId]/agenda",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "alumni_directory",
    notes: "Canonical responsive directory route uses the existing search API.",
    route: "/directory",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "alumni_directory_mobile",
    notes: "Mobile export applied as responsive behavior on /directory.",
    route: "/directory",
    status: "responsive reference"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "alumni_verification",
    notes: "Focused Step 3 credentials submission screen uses current verification request and evidence APIs.",
    route: "/verification",
    status: "live route"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "annual_gathering_hub",
    notes: "Event detail shell with RSVP, agenda, speaker, and attendee links.",
    route: "/events/[eventId]",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "ballot_privacy_integrity_controls",
    notes: "Admin ballot privacy route now reads the live election privacy API.",
    route: "/admin/elections/[electionId]/privacy",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "candidate_review_queue",
    notes: "Legacy member-app route now hands off to the separate live admin console candidate review workflow.",
    route: "/admin/elections/[electionId]/candidates",
    status: "live redirect"
  },
  {
    backendDependencyStatus: "partially implemented",
    dataSource: "live API",
    exportFolder: "chapter_analytics_dashboard",
    notes: "Chapter analytics now derives live chapter health from current community, roster, invitation, post, and moderation APIs.",
    route: "/admin/chapters/[chapterId]/analytics",
    status: "live route"
  },
  {
    backendDependencyStatus: "partially implemented",
    dataSource: "live API",
    exportFolder: "chapter_leader_dashboard",
    notes: "Dedicated leader dashboard route now uses live community, roster, invitation, post, and report APIs.",
    route: "/communities/[communityId]/dashboard",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "complete_your_profile",
    notes: "Focused Step 4 setup screen uses current profile and photo APIs.",
    route: "/profile/setup",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "contribute_a_resource",
    notes: "Resource contribution form submits live member resources into the moderation workflow.",
    route: "/resources/new",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "contribute_to_campaign",
    notes: "Contribution checkout now records live local-confirmed payments and issues receipts.",
    route: "/contributions/[campaignId]/pay",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "contribution_campaign_detail",
    notes: "Campaign detail now reads the live contributions API and links into payment/receipt flows.",
    route: "/contributions/[campaignId]",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "contribution_receipt",
    notes: "Receipt route now reads the live contribution receipt API with download actions.",
    route: "/contributions/receipts/[receiptId]",
    status: "live route"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "create_gathering_wizard",
    notes: "Event creation wizard is visually available with disabled submit.",
    route: "/events/new",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "create_new_election_wizard",
    notes: "Legacy member-app route now hands off to the separate live admin console election draft workflow.",
    route: "/admin/elections/new",
    status: "live redirect"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "direct_conversation",
    notes: "Conversation detail route wraps the live direct messaging component.",
    route: "/messages/[conversationId]",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "direct_message_detail_desktop",
    notes: "Desktop message detail export maps to the same responsive conversation route.",
    route: "/messages/[conversationId]",
    status: "responsive reference"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "election_admin_dashboard",
    notes: "Legacy member-app route now hands off to the separate live admin console elections surface.",
    route: "/admin/elections",
    status: "live redirect"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "election_audit_results_report",
    notes: "Legacy member-app route now hands off to the separate live admin console election audit workflow.",
    route: "/admin/elections/[electionId]/audit",
    status: "live redirect"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "election_hub",
    notes: "Member elections hub uses live election API data with paginated load-more behavior.",
    route: "/elections",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "election_results_audit",
    notes: "Member-facing results route uses live election results and quorum data.",
    route: "/elections/[electionId]/results",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "election_voting_details",
    notes: "Voting route submits live eligible-voter ballots through the election API.",
    route: "/elections/[electionId]/vote",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "find_a_mentor",
    notes: "Mentor discovery route uses live mentor profiles, filters, and paginated load-more behavior.",
    route: "/mentorship/find",
    status: "live route"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "initiative_details",
    notes: "Initiative detail page with fixture milestones and collaborator data.",
    route: "/initiatives/[initiativeId]",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "initiative_hub",
    notes: "Initiatives hub with fixture status lanes.",
    route: "/initiatives",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "partially implemented",
    dataSource: "live API",
    exportFolder: "introduction_requests",
    notes: "Introduction center uses live member search and direct-message threads; dedicated request approval workflow remains future backend work.",
    route: "/messages/introductions",
    status: "live route"
  },
  {
    backendDependencyStatus: "partially implemented",
    dataSource: "live API",
    exportFolder: "introduction_requests_desktop",
    notes: "Desktop introduction export maps to the same live responsive route.",
    route: "/messages/introductions",
    status: "responsive reference"
  },
  {
    backendDependencyStatus: "partially implemented",
    dataSource: "live API",
    exportFolder: "member_dashboard",
    notes: "Current dashboard remains a high-level live hub with links to dedicated routes.",
    route: "/dashboard",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "mentor_settings_profile",
    notes: "Mentor settings profile saves live mentor availability records.",
    route: "/mentorship/settings",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "messages_inbox",
    notes: "Inbox route wraps current direct messaging APIs.",
    route: "/messages",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "messages_mobile",
    notes: "Mobile messaging export is a responsive reference for /messages.",
    route: "/messages",
    status: "responsive reference"
  },
  {
    backendDependencyStatus: "partially implemented",
    dataSource: "live API",
    exportFolder: "mobile_onboarding_flow",
    notes: "Code-native onboarding flow mirrors the mobile export, reads live profile and verification status, and links into live profile, affiliation, and verification routes.",
    route: "/onboarding",
    status: "code-native route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "my_mentorships",
    notes: "Mentorship hub uses live mentor summary, requests, reviews, and recommendations.",
    route: "/mentorship",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "new_message",
    notes: "New message route wraps the live member search and conversation composer.",
    route: "/messages/new",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "opportunities_marketplace",
    notes: "Opportunities marketplace uses the live API with filters, member submissions, and paginated load-more behavior.",
    route: "/opportunities",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "opportunity_details",
    notes: "Opportunity detail route reads live opportunity records.",
    route: "/opportunities/[opportunityId]",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "opportunity_moderation_queue",
    notes: "Legacy member-app route now hands off to the separate live admin console moderation queue.",
    route: "/admin/opportunities",
    status: "live redirect"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "post_new_opportunity",
    notes: "Opportunity posting form submits live member opportunities into the moderation workflow.",
    route: "/opportunities/new",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "program_affiliation",
    notes: "Focused Step 2 program selection route uses the existing profile affiliation API.",
    route: "/profile/program-affiliation",
    status: "live route"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "propose_new_initiative",
    notes: "Initiative proposal form is present with disabled submit.",
    route: "/initiatives/new",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "public_landing_page",
    notes: "Existing public landing remains code-native and responsive.",
    route: "/",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "public_landing_page_mobile",
    notes: "Mobile landing export is a responsive reference for /.",
    route: "/",
    status: "responsive reference"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "request_mentorship",
    notes: "Mentorship request flow creates live pending mentorship requests.",
    route: "/mentorship/request",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "resource_detail_view",
    notes: "Resource detail route reads live resource records.",
    route: "/resources/[resourceId]",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "resource_library_hub",
    notes: "Resource library hub uses the live API with filters, member submissions, and paginated load-more behavior.",
    route: "/resources",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "resource_management_console",
    notes: "Legacy member-app route now hands off to the separate live admin console moderation queue.",
    route: "/admin/resources",
    status: "live redirect"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "rsvp_attendee_management",
    notes: "RSVP and attendee management shell until event APIs land.",
    route: "/events/[eventId]/attendees",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "share_your_impact_story",
    notes: "Impact story submission form submits live stories into the moderation workflow.",
    route: "/success-stories/new",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "story_detail_empowering_agri_tech_in_zambia",
    notes: "Story detail route reads live success-story records.",
    route: "/success-stories/[storyId]",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "success_stories_hub",
    notes: "Success stories hub uses the live API with filters, member submissions, and paginated load-more behavior.",
    route: "/success-stories",
    status: "live route"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "success_stories_hub_mobile",
    notes: "Mobile behavior is folded into the live success stories route.",
    route: "/success-stories",
    status: "responsive reference"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "success_story_moderation_queue",
    notes: "Legacy member-app route now hands off to the separate live admin console moderation queue.",
    route: "/admin/success-stories",
    status: "live redirect"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "treasurer_dashboard",
    notes: "Legacy member-app route now hands off to the separate live admin console treasury surface.",
    route: "/admin/treasury",
    status: "live redirect"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "voter_roll_management",
    notes: "Legacy member-app route now hands off to the separate live admin console voter-roll workflow.",
    route: "/admin/elections/[electionId]/voter-roll",
    status: "live redirect"
  },
  {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    exportFolder: "welcome_to_the_network",
    notes: "Code-native verification submitted screen reads live profile and verification status with first-action links into member routes.",
    route: "/verification/submitted",
    status: "code-native route"
  }
];

export const featureScreens = {
  onboarding: {
    backendDependencyStatus: "partially implemented",
    dataSource: "live API",
    description:
      "A guided first-run flow that moves a member from account creation into profile completion, program affiliation, verification, and first community action.",
    eyebrow: "Member onboarding",
    highlights: [
      {
        body: "Finish identity basics, add a YALI program record, and submit verification evidence.",
        meta: "Step 1",
        title: "Complete your identity"
      },
      {
        body: "Review visibility defaults before the member appears in directory search.",
        meta: "Step 2",
        title: "Set privacy controls"
      },
      {
        body: "Join country, sector, or cohort communities after verification is underway.",
        meta: "Step 3",
        title: "Take a first action"
      }
    ],
    metrics: [
      { detail: "Profile, program, verification, discovery", label: "Steps", value: "4" },
      { detail: "Uses existing profile APIs where available", label: "Live modules", value: "2" },
      { detail: "Responsive from mobile export", label: "Mobile", value: "ready" }
    ],
    primaryAction: { href: "/profile/setup", label: "Continue profile" },
    route: "/onboarding",
    secondaryAction: { href: "/verification", label: "Start verification" },
    sourceExports: ["mobile_onboarding_flow"],
    table: {
      headers: ["Checklist item", "Status", "Route"],
      rows: [
        ["Create account and verify email", "implemented", "/verify-email"],
        ["Complete profile", "live", "/profile/setup"],
        ["Add program affiliation", "live", "/profile/program-affiliation"],
        ["Submit alumni verification", "live", "/verification"]
      ]
    },
    title: "Welcome to the network",
    workflow: [
      "Review profile completion",
      "Add program affiliation",
      "Submit verification request",
      "Visit directory and communities"
    ]
  },
  verificationSubmitted: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "A confirmation and next-action page for members who have submitted their alumni verification request.",
    eyebrow: "Verification submitted",
    highlights: [
      {
        body: "The review queue keeps every verification decision audit-ready.",
        meta: "Trust",
        title: "Admin review is in progress"
      },
      {
        body: "Members can keep profile and affiliation details current while waiting.",
        meta: "Profile",
        title: "Keep records fresh"
      },
      {
        body: "Directory visibility remains permission-aware while verification is pending.",
        meta: "Privacy",
        title: "Visibility stays controlled"
      }
    ],
    metrics: [
      { label: "Expected review", value: "3-5 days" },
      { label: "Evidence status", value: "attached" },
      { label: "Next step", value: "profile" }
    ],
    primaryAction: { href: "/dashboard", label: "Return to dashboard" },
    route: "/verification/submitted",
    secondaryAction: { href: "/directory", label: "Preview directory" },
    sourceExports: ["welcome_to_the_network"],
    table: {
      headers: ["Area", "What happens next", "Owner"],
      rows: [
        ["Profile", "Completion remains editable", "Member"],
        ["Evidence", "Admin verifies proof and notes", "Verification admin"],
        ["Directory", "Visibility follows verified profile rules", "Platform"]
      ]
    },
    title: "Your verification request is ready for review",
    workflow: ["Profile snapshot captured", "Evidence attached", "Queue review", "Verified access"]
  },
  communitiesHub: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Country chapters, sector groups, cohort circles, and private working teams connected to the existing communities API.",
    eyebrow: "Communities",
    highlights: [
      {
        body: "Find country, sector, cohort, and private project groups.",
        meta: "Discovery",
        title: "Browse active communities"
      },
      {
        body: "Join open groups or request access where the manager approval policy applies.",
        meta: "Membership",
        title: "Controlled access"
      },
      {
        body: "Community detail routes already support posts, members, invitations, and moderation controls.",
        meta: "Live",
        title: "Operational detail pages"
      }
    ],
    metrics: [
      { label: "Backend", value: "live" },
      { label: "Membership", value: "join/leave" },
      { label: "Moderation", value: "active" }
    ],
    primaryAction: { href: "/communities", label: "Browse communities" },
    route: "/communities",
    sourceExports: ["chapter_leader_dashboard"],
    table: {
      headers: ["Surface", "Status", "Route"],
      rows: [
        ["Community listing", "live", "/communities"],
        ["Community detail", "live", "/communities/[communityId]"],
        ["Leader dashboard", "prototype", "/communities/[communityId]/dashboard"]
      ]
    },
    title: "Communities and chapter spaces",
    workflow: ["Search", "Join or request", "Post updates", "Moderate trust issues"]
  },
  communityLeader: {
    backendDependencyStatus: "partially implemented",
    dataSource: "live API",
    description:
      "A live leader console for chapter managers that organizes member activity, pending approvals, invitations, posts, and governance actions.",
    eyebrow: "Chapter leadership",
    highlights: [
      {
        body: "Track pending memberships, open reports, and invitation performance.",
        meta: "Control",
        title: "Manager command center"
      },
      {
        body: "The dedicated route now reads real community, roster, invitation, post, and report data.",
        meta: "Live API",
        title: "Operational leadership view"
      },
      {
        body: "Next work can add analytics, chapter events, and deeper governance without replacing this live base.",
        meta: "Next",
        title: "Prepared for expansion"
      }
    ],
    metrics: [
      { detail: "Manager and owner visibility", label: "Access", value: "RBAC" },
      { detail: "Community roster and approvals", label: "Data", value: "live" },
      { detail: "Posts and reports surfaced", label: "Moderation", value: "live" }
    ],
    primaryAction: { href: "/communities", label: "Browse communities" },
    route: "/communities/[communityId]/dashboard",
    sourceExports: ["chapter_leader_dashboard"],
    table: {
      headers: ["Queue", "Current load", "Action"],
      rows: [
        ["Membership approvals", "live", "Review pending members"],
        ["Post reports", "live", "Moderate content"],
        ["Invitations", "live", "Track acceptance"]
      ]
    },
    title: "Chapter leader dashboard",
    workflow: ["Review member requests", "Track invitations", "Moderate posts", "Open live community"]
  },
  initiativesHub: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "A collaboration hub for alumni-led initiatives with status lanes, impact goals, collaborator needs, and progress updates.",
    eyebrow: "Initiatives",
    highlights: [
      {
        body: "Track community projects from proposal through implementation and reporting.",
        meta: "500+ active",
        title: "Impact portfolio"
      },
      {
        body: "Signal when a project needs mentors, funders, volunteers, or chapter partners.",
        meta: "Matching",
        title: "Find collaborators"
      },
      {
        body: "Prepare for future milestone, reporting, and impact evidence APIs.",
        meta: "Backend needed",
        title: "Structured for real data"
      }
    ],
    metrics: [
      { label: "Active initiatives", value: "24" },
      { label: "Countries", value: "11" },
      { label: "Open roles", value: "38" }
    ],
    primaryAction: { href: "/initiatives/new", label: "Propose initiative" },
    route: "/initiatives",
    sourceExports: ["initiative_hub"],
    table: {
      headers: ["Initiative", "Country", "Need"],
      rows: [
        ["Youth climate clinics", "Kenya", "Volunteer coordinators"],
        ["Civic data fellowship", "Ghana", "Mentors"],
        ["Women founders circle", "Rwanda", "Sponsor partners"]
      ]
    },
    title: "Initiative hub",
    workflow: ["Discover projects", "Open detail", "Request collaborator role", "Report progress"]
  },
  initiativeDetail: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "A detailed initiative workspace for scope, milestones, impact evidence, collaborators, and contribution needs.",
    eyebrow: "Initiative detail",
    highlights: [
      {
        body: "Milestones, owners, and dates are laid out for future project tracking.",
        meta: "Roadmap",
        title: "Progress visible"
      },
      {
        body: "Collaborator roles show where alumni can help without direct backend support yet.",
        meta: "Open roles",
        title: "Action-ready structure"
      },
      {
        body: "Evidence and outcomes are shaped for future impact reporting.",
        meta: "Impact",
        title: "Measurement prepared"
      }
    ],
    metrics: [
      { label: "Milestones", value: "6" },
      { label: "Collaborators", value: "18" },
      { label: "Completion", value: "64%" }
    ],
    primaryAction: { disabled: true, label: "Request to collaborate" },
    route: "/initiatives/[initiativeId]",
    sourceExports: ["initiative_details"],
    table: {
      headers: ["Milestone", "Owner", "Status"],
      rows: [
        ["Community partner onboarding", "Chapter lead", "complete"],
        ["Pilot workshops", "Program team", "active"],
        ["Impact report", "Monitoring lead", "next"]
      ]
    },
    title: "Digital agriculture mentorship initiative",
    workflow: ["Review scope", "Check milestones", "Offer support", "Track evidence"]
  },
  initiativeNew: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "A structured proposal form for alumni initiatives, ready to connect to initiative creation and review APIs.",
    eyebrow: "Propose initiative",
    highlights: [
      {
        body: "Captures problem statement, beneficiary group, country, sector, and collaboration needs.",
        meta: "Form",
        title: "Proposal intake"
      },
      {
        body: "Review status and admin approval hooks are reserved for the next backend slice.",
        meta: "Workflow",
        title: "Moderation-ready"
      },
      {
        body: "Submit remains disabled while persistence is not implemented.",
        meta: "Fixture",
        title: "No fake writes"
      }
    ],
    metrics: [
      { label: "Fields", value: "9" },
      { label: "Backend", value: "needed" },
      { label: "Submit", value: "disabled" }
    ],
    primaryAction: { disabled: true, label: "Submit proposal" },
    route: "/initiatives/new",
    sourceExports: ["propose_new_initiative"],
    table: {
      headers: ["Field group", "Purpose", "Status"],
      rows: [
        ["Basics", "Title, country, sector", "ready"],
        ["Impact", "Goals and beneficiaries", "ready"],
        ["Needs", "Funding, mentors, volunteers", "ready"]
      ]
    },
    title: "Propose a new initiative",
    workflow: ["Define problem", "Add partners", "Set milestones", "Submit for review"]
  },
  eventsHub: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "A gathering hub for annual events, chapter meetups, RSVP tracking, agenda planning, speakers, and attendee management.",
    eyebrow: "Events",
    highlights: [
      {
        body: "Spotlight annual gatherings, chapter events, and virtual sessions.",
        meta: "Calendar",
        title: "Discover gatherings"
      },
      {
        body: "RSVP, agenda, speaker, and attendee routes exist for frontend review.",
        meta: "Route parity",
        title: "Full event surface"
      },
      {
        body: "Backend event models and approval queues are still a future slice.",
        meta: "Fixture",
        title: "Prototype data"
      }
    ],
    metrics: [
      { label: "Upcoming", value: "12" },
      { label: "Countries", value: "7" },
      { label: "RSVPs", value: "1.2k" }
    ],
    primaryAction: { href: "/events/new", label: "Create gathering" },
    route: "/events",
    sourceExports: ["annual_gathering_hub"],
    table: {
      headers: ["Event", "Date", "Status"],
      rows: [
        ["Annual alumni gathering", "June 18", "RSVP open"],
        ["Regional innovation salon", "July 3", "Agenda draft"],
        ["Chapter strategy clinic", "July 16", "Speaker review"]
      ]
    },
    title: "Annual gathering hub",
    workflow: ["Browse", "RSVP", "Review agenda", "Manage attendees"]
  },
  eventDetail: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Event detail with schedule, speakers, location, RSVP state, and organizer calls to action.",
    eyebrow: "Event detail",
    highlights: [
      {
        body: "Use the agenda and attendee routes to review deeper design surfaces.",
        meta: "Linked",
        title: "Connected event workflow"
      },
      {
        body: "Status, location, and attendance metrics are shaped for future event APIs.",
        meta: "Future",
        title: "Backend-ready layout"
      },
      {
        body: "RSVP actions are disabled until persistence and email notifications are built.",
        meta: "Disabled",
        title: "No fake confirmations"
      }
    ],
    metrics: [
      { label: "Registered", value: "486" },
      { label: "Speakers", value: "18" },
      { label: "Sessions", value: "22" }
    ],
    primaryAction: { disabled: true, label: "RSVP" },
    route: "/events/[eventId]",
    secondaryAction: { href: "/events/annual-gathering/agenda", label: "View agenda" },
    sourceExports: ["annual_gathering_hub"],
    table: {
      headers: ["Track", "Lead", "Status"],
      rows: [
        ["Governance", "Chapter council", "confirmed"],
        ["Opportunity marketplace", "Partnerships", "draft"],
        ["Impact stories", "Communications", "confirmed"]
      ]
    },
    title: "Annual alumni gathering",
    workflow: ["Review overview", "RSVP", "Plan agenda", "Manage attendees"]
  },
  eventNew: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "A gathering creation wizard for chapter managers, structured for future approval workflows.",
    eyebrow: "Create gathering",
    highlights: [
      {
        body: "Captures event basics, format, audience, capacity, and organizer details.",
        meta: "Wizard",
        title: "Event intake"
      },
      {
        body: "Approval, publishing, and notifications are reserved for the backend event slice.",
        meta: "Next",
        title: "Workflow hooks"
      },
      {
        body: "Submit is disabled while data persistence is not implemented.",
        meta: "Fixture",
        title: "Safe prototype"
      }
    ],
    metrics: [
      { label: "Steps", value: "5" },
      { label: "Approvals", value: "planned" },
      { label: "Submit", value: "disabled" }
    ],
    primaryAction: { disabled: true, label: "Create gathering" },
    route: "/events/new",
    sourceExports: ["create_gathering_wizard"],
    table: {
      headers: ["Step", "Fields", "Status"],
      rows: [
        ["Basics", "Title, format, date", "ready"],
        ["Audience", "Chapter, sector, capacity", "ready"],
        ["Review", "Approvals and publishing", "backend needed"]
      ]
    },
    title: "Create a gathering",
    workflow: ["Basics", "Venue", "Audience", "Agenda seed", "Review"]
  },
  eventAgenda: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Speaker and agenda planning surface for organizers to shape sessions before publishing.",
    eyebrow: "Agenda planner",
    highlights: [
      {
        body: "Session blocks, speaker assignments, and room labels mirror the exported planner UI.",
        meta: "Planner",
        title: "Structured agenda"
      },
      {
        body: "Designed to connect to future event and speaker APIs.",
        meta: "Backend needed",
        title: "Persistence pending"
      },
      {
        body: "Timeline rows keep the page readable on desktop and mobile.",
        meta: "Responsive",
        title: "Mobile-friendly"
      }
    ],
    metrics: [
      { label: "Sessions", value: "22" },
      { label: "Speakers", value: "18" },
      { label: "Open slots", value: "4" }
    ],
    primaryAction: { disabled: true, label: "Publish agenda" },
    route: "/events/[eventId]/agenda",
    sourceExports: ["agenda_speaker_planner"],
    table: {
      headers: ["Time", "Session", "Speaker"],
      rows: [
        ["09:00", "Opening keynote", "Regional director"],
        ["10:30", "Chapter governance lab", "Council leads"],
        ["14:00", "Marketplace demos", "Alumni founders"]
      ]
    },
    title: "Agenda and speaker planner",
    workflow: ["Draft sessions", "Assign speakers", "Check conflicts", "Publish"]
  },
  eventAttendees: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "RSVP and attendee management surface for event organizers and chapter managers.",
    eyebrow: "Attendees",
    highlights: [
      {
        body: "Segment attendees by RSVP status, role, accessibility needs, and chapter.",
        meta: "Operations",
        title: "Attendee control"
      },
      {
        body: "Check-in, export, and waitlist controls are visible but disabled.",
        meta: "Backend needed",
        title: "Ready for event APIs"
      },
      {
        body: "Designed as a dense operations screen rather than a marketing page.",
        meta: "Admin-grade",
        title: "Work-focused"
      }
    ],
    metrics: [
      { label: "Confirmed", value: "486" },
      { label: "Waitlist", value: "72" },
      { label: "Checked in", value: "0" }
    ],
    primaryAction: { disabled: true, label: "Export attendees" },
    route: "/events/[eventId]/attendees",
    sourceExports: ["rsvp_attendee_management"],
    table: {
      headers: ["Attendee", "Chapter", "RSVP"],
      rows: [
        ["Amina Mensah", "Ghana", "confirmed"],
        ["Jean Niyonzima", "Rwanda", "waitlist"],
        ["Thandi Dlamini", "South Africa", "confirmed"]
      ]
    },
    title: "RSVP attendee management",
    workflow: ["Review RSVPs", "Approve waitlist", "Send reminders", "Check in"]
  },
  opportunitiesHub: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "A marketplace for grants, fellowships, jobs, calls for proposals, and partner opportunities.",
    eyebrow: "Opportunities",
    highlights: [
      {
        body: "Filter opportunities by type, deadline, country, program, and sector.",
        meta: "Discovery",
        title: "Marketplace search"
      },
      {
        body: "Posting and moderation routes are present for future workflow review.",
        meta: "Route parity",
        title: "End-to-end surface"
      },
      {
        body: "Applications are external or disabled until the opportunities backend is built.",
        meta: "Fixture",
        title: "No fake submissions"
      }
    ],
    metrics: [
      { label: "Open listings", value: "36" },
      { label: "Closing soon", value: "8" },
      { label: "Partner orgs", value: "14" }
    ],
    primaryAction: { href: "/opportunities/new", label: "Post opportunity" },
    route: "/opportunities",
    sourceExports: ["opportunities_marketplace"],
    table: {
      headers: ["Opportunity", "Type", "Deadline"],
      rows: [
        ["Civic innovation grant", "Grant", "May 28"],
        ["Climate fellowship", "Fellowship", "June 2"],
        ["Program manager role", "Job", "June 10"]
      ]
    },
    title: "Opportunities marketplace",
    workflow: ["Search", "Open detail", "Save or apply", "Moderate submissions"]
  },
  opportunityDetail: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Opportunity detail route with eligibility, deadline, sponsor, and action guidance.",
    eyebrow: "Opportunity detail",
    highlights: [
      {
        body: "Details are shaped for grants, fellowships, jobs, and partner calls.",
        meta: "Flexible",
        title: "Reusable detail model"
      },
      {
        body: "Apply and save actions are disabled until persistence exists.",
        meta: "Backend needed",
        title: "Safe actions"
      },
      {
        body: "Moderation metadata is ready for admin review workflows.",
        meta: "Trust",
        title: "Review-ready"
      }
    ],
    metrics: [
      { label: "Deadline", value: "May 28" },
      { label: "Eligible countries", value: "12" },
      { label: "Saves", value: "142" }
    ],
    primaryAction: { disabled: true, label: "Apply now" },
    route: "/opportunities/[opportunityId]",
    sourceExports: ["opportunity_details"],
    table: {
      headers: ["Requirement", "Detail", "Status"],
      rows: [
        ["Program affiliation", "YALI alumni", "required"],
        ["Sector", "Civic tech or governance", "preferred"],
        ["Submission", "External application", "not connected"]
      ]
    },
    title: "Civic innovation grant",
    workflow: ["Review eligibility", "Check deadline", "Prepare materials", "Apply externally"]
  },
  opportunityNew: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Opportunity posting form for partners and admins, prepared for moderation before publishing.",
    eyebrow: "Post opportunity",
    highlights: [
      {
        body: "Captures title, sponsor, type, deadline, countries, eligibility, and source link.",
        meta: "Form",
        title: "Listing intake"
      },
      {
        body: "Publishing stays disabled until the opportunity API and moderation queue exist.",
        meta: "Trust",
        title: "Review before publishing"
      },
      {
        body: "Admin moderation route is available as a prototype.",
        meta: "Admin",
        title: "Queue linked"
      }
    ],
    metrics: [
      { label: "Fields", value: "10" },
      { label: "Review", value: "required" },
      { label: "Submit", value: "disabled" }
    ],
    primaryAction: { disabled: true, label: "Submit for review" },
    route: "/opportunities/new",
    sourceExports: ["post_new_opportunity"],
    table: {
      headers: ["Field group", "Purpose", "Status"],
      rows: [
        ["Basics", "Title, type, sponsor", "ready"],
        ["Eligibility", "Country, cohort, sector", "ready"],
        ["Publication", "Moderation state", "backend needed"]
      ]
    },
    title: "Post a new opportunity",
    workflow: ["Add details", "Set eligibility", "Preview listing", "Submit for moderation"]
  },
  mentorshipHub: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "The mentorship workspace for active mentorships, requests, introductions, and mentor availability.",
    eyebrow: "Mentorship",
    highlights: [
      {
        body: "Track live incoming and outgoing requests plus recommended mentor profiles.",
        meta: "Live API",
        title: "Mentorship pipeline"
      },
      {
        body: "Discovery, request, and settings routes are wired to the mentorship API.",
        meta: "Member workflow",
        title: "Complete surface"
      },
      {
        body: "Deeper matching, notifications, analytics, and admin oversight remain future work.",
        meta: "Future",
        title: "Enhancement backlog"
      }
    ],
    metrics: [
      { label: "Summary", value: "live" },
      { label: "Requests", value: "live" },
      { label: "Mentors", value: "live" }
    ],
    primaryAction: { href: "/mentorship/find", label: "Find a mentor" },
    route: "/mentorship",
    secondaryAction: { href: "/mentorship/settings", label: "Mentor settings" },
    sourceExports: ["my_mentorships"],
    table: {
      headers: ["Capability", "Source", "Status"],
      rows: [
        ["Mentor summary", "Mentorship API", "live"],
        ["Request review", "Mentorship API", "live"],
        ["Mentorship analytics", "Future reporting API", "not implemented"]
      ]
    },
    title: "My mentorships",
    workflow: ["Find mentor", "Request introduction", "Confirm match", "Track sessions"]
  },
  mentorshipFind: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Mentor discovery surface with availability, sectors, languages, and mentoring strengths.",
    eyebrow: "Find a mentor",
    highlights: [
      {
        body: "Search and filter live mentor profiles by sector, country, expertise, and availability.",
        meta: "Discovery",
        title: "Mentor marketplace"
      },
      {
        body: "Load additional mentor pages using the API's pagination metadata.",
        meta: "Pagination",
        title: "Load more"
      },
      {
        body: "Request actions route into the live mentorship request form.",
        meta: "Request",
        title: "Live handoff"
      }
    ],
    metrics: [
      { label: "Mentors", value: "live" },
      { label: "Filters", value: "live" },
      { label: "Pagination", value: "live" }
    ],
    primaryAction: { href: "/mentorship/request", label: "Request mentorship" },
    route: "/mentorship/find",
    sourceExports: ["find_a_mentor"],
    table: {
      headers: ["Capability", "Source", "Status"],
      rows: [
        ["Mentor profile search", "Mentorship API", "live"],
        ["Availability filters", "Mentorship API", "live"],
        ["Load more mentors", "Mentorship API", "live"]
      ]
    },
    title: "Find a mentor",
    workflow: ["Filter mentors", "Review profile", "Request introduction", "Confirm terms"]
  },
  mentorshipRequest: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Mentorship request form for goals, expectations, availability, and preferred mentor attributes.",
    eyebrow: "Request mentorship",
    highlights: [
      {
        body: "Captures goals, focus area, and message for a live pending request.",
        meta: "Form",
        title: "Request intake"
      },
      {
        body: "Submission persists through the mentorship request API.",
        meta: "Live API",
        title: "Request persistence"
      },
      {
        body: "Notification and direct-message automation remain future enhancements.",
        meta: "Future",
        title: "Handoff backlog"
      }
    ],
    metrics: [
      { label: "Mentor list", value: "live" },
      { label: "Submit", value: "live" },
      { label: "Review", value: "live" }
    ],
    primaryAction: { href: "/mentorship/request", label: "Send request" },
    route: "/mentorship/request",
    sourceExports: ["request_mentorship"],
    table: {
      headers: ["Capability", "Source", "Status"],
      rows: [
        ["Mentor selector", "Mentorship API", "live"],
        ["Request creation", "Mentorship API", "live"],
        ["Accepted handoff automation", "Future messaging workflow", "not implemented"]
      ]
    },
    title: "Request mentorship",
    workflow: ["Describe goals", "Set cadence", "Pick mentor fit", "Submit"]
  },
  mentorshipSettings: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Mentor availability and profile settings for members who want to support others.",
    eyebrow: "Mentor settings",
    highlights: [
      {
        body: "Control mentor availability, preferred sectors, countries, and capacity.",
        meta: "Settings",
        title: "Availability controls"
      },
      {
        body: "Settings save through the live mentor profile API.",
        meta: "Live API",
        title: "Profile persistence"
      },
      {
        body: "Designed for future discovery ranking and request matching.",
        meta: "Matching",
        title: "Search-ready profile"
      }
    ],
    metrics: [
      { label: "Capacity", value: "live" },
      { label: "Visibility", value: "live" },
      { label: "Save", value: "live" }
    ],
    primaryAction: { href: "/mentorship/settings", label: "Save mentor profile" },
    route: "/mentorship/settings",
    sourceExports: ["mentor_settings_profile"],
    table: {
      headers: ["Capability", "Source", "Status"],
      rows: [
        ["Accepting requests", "Mentorship API", "live"],
        ["Focus sectors", "Mentorship API", "live"],
        ["Capacity", "Mentorship API", "live"]
      ]
    },
    title: "Mentor settings profile",
    workflow: ["Set availability", "Add focus areas", "Preview card", "Save"]
  },
  introductionRequests: {
    backendDependencyStatus: "partially implemented",
    dataSource: "live API",
    description:
      "A request center for warm introductions, mentor handoffs, and direct-message follow-ups.",
    eyebrow: "Introductions",
    highlights: [
      {
        body: "Uses the live member directory and direct-message APIs to start verified handoff conversations.",
        meta: "Live API",
        title: "Directory handoff"
      },
      {
        body: "Connects the future introduction request workflow to the already-live messaging module.",
        meta: "Cross-module",
        title: "Network handoffs"
      },
      {
        body: "Accept, decline, and brokered introduction states remain future backend work.",
        meta: "Partial backend",
        title: "Request workflow"
      }
    ],
    metrics: [
      { label: "Member search", value: "live" },
      { label: "Direct threads", value: "live" },
      { label: "Request states", value: "future" }
    ],
    primaryAction: { href: "/messages/introductions", label: "Open introductions" },
    route: "/messages/introductions",
    sourceExports: ["introduction_requests", "introduction_requests_desktop"],
    table: {
      headers: ["Capability", "Source", "Status"],
      rows: [
        ["Verified alumni search", "Directory API", "live"],
        ["Introduction thread", "Messages API", "live"],
        ["Accept or decline workflow", "Future introduction API", "not implemented"]
      ]
    },
    title: "Introduction requests",
    workflow: ["Create request", "Recipient reviews", "Accept or decline", "Open message thread"]
  },
  resourcesHub: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "A resource library for grants, toolkits, research, templates, training materials, and chapter playbooks.",
    eyebrow: "Resources",
    highlights: [
      {
        body: "Browse trusted resources by topic, format, country, and program relevance.",
        meta: "Library",
        title: "Knowledge hub"
      },
      {
        body: "Contribution and admin review routes are available for frontend QA.",
        meta: "Workflow",
        title: "Contribution pipeline"
      },
      {
        body: "Resource persistence, file storage, and search indexing remain future backend work.",
        meta: "Backend needed",
        title: "Fixture data"
      }
    ],
    metrics: [
      { label: "Resources", value: "128" },
      { label: "Topics", value: "16" },
      { label: "Pending review", value: "9" }
    ],
    primaryAction: { href: "/resources/new", label: "Contribute resource" },
    route: "/resources",
    sourceExports: ["resource_library_hub"],
    table: {
      headers: ["Resource", "Format", "Topic"],
      rows: [
        ["Grant proposal toolkit", "PDF", "Funding"],
        ["Chapter event checklist", "Template", "Events"],
        ["Mentorship playbook", "Guide", "Mentorship"]
      ]
    },
    title: "Resource library hub",
    workflow: ["Search library", "Open detail", "Contribute resource", "Admin review"]
  },
  resourceDetail: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Resource detail route with metadata, summary, contributor information, and related materials.",
    eyebrow: "Resource detail",
    highlights: [
      {
        body: "Shows format, contributor, reviewed status, usage notes, and related items.",
        meta: "Metadata",
        title: "Trust context"
      },
      {
        body: "Download and save actions are disabled until file storage is available.",
        meta: "Backend needed",
        title: "No fake downloads"
      },
      {
        body: "Admin review state is prepared for moderation workflows.",
        meta: "Review",
        title: "Governed contribution"
      }
    ],
    metrics: [
      { label: "Format", value: "PDF" },
      { label: "Reviewed", value: "yes" },
      { label: "Related", value: "6" }
    ],
    primaryAction: { disabled: true, label: "Download resource" },
    route: "/resources/[resourceId]",
    sourceExports: ["resource_detail_view"],
    table: {
      headers: ["Field", "Value", "Visibility"],
      rows: [
        ["Contributor", "YALI Ghana Chapter", "public"],
        ["License", "Member use", "members"],
        ["Review", "Approved", "admin"]
      ]
    },
    title: "Grant proposal toolkit",
    workflow: ["Read summary", "Check metadata", "Download", "Share"]
  },
  resourceNew: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Resource contribution form for members to submit toolkits, templates, reports, or training materials.",
    eyebrow: "Contribute resource",
    highlights: [
      {
        body: "Captures title, type, topic, summary, file/link, and contributor notes.",
        meta: "Form",
        title: "Contribution intake"
      },
      {
        body: "Submission stays disabled until resource upload and review APIs exist.",
        meta: "Backend needed",
        title: "Safe prototype"
      },
      {
        body: "Admin review queue route already exists as a fixture surface.",
        meta: "Admin",
        title: "Review-ready"
      }
    ],
    metrics: [
      { label: "Fields", value: "8" },
      { label: "Review", value: "required" },
      { label: "Submit", value: "disabled" }
    ],
    primaryAction: { disabled: true, label: "Submit resource" },
    route: "/resources/new",
    sourceExports: ["contribute_a_resource"],
    table: {
      headers: ["Input", "Purpose", "Status"],
      rows: [
        ["Resource basics", "Title and topic", "ready"],
        ["Access", "File or URL", "backend needed"],
        ["Review note", "Admin context", "ready"]
      ]
    },
    title: "Contribute a resource",
    workflow: ["Add details", "Attach resource", "Add notes", "Submit for review"]
  },
  successStoriesHub: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "A curated impact story hub for alumni outcomes, chapter projects, and member achievements.",
    eyebrow: "Success stories",
    highlights: [
      {
        body: "Browse stories by country, sector, program, and impact category.",
        meta: "Storytelling",
        title: "Impact discovery"
      },
      {
        body: "Submission and moderation routes are present for visual review.",
        meta: "Workflow",
        title: "Editorial pipeline"
      },
      {
        body: "Publishing, moderation, and media storage still require backend slices.",
        meta: "Backend needed",
        title: "Fixture content"
      }
    ],
    metrics: [
      { label: "Stories", value: "54" },
      { label: "Countries", value: "19" },
      { label: "Pending review", value: "6" }
    ],
    primaryAction: { href: "/success-stories/new", label: "Share your story" },
    route: "/success-stories",
    sourceExports: ["success_stories_hub", "success_stories_hub_mobile"],
    table: {
      headers: ["Story", "Country", "Impact"],
      rows: [
        ["Empowering agri-tech in Zambia", "Zambia", "2,400 farmers"],
        ["Girls in STEM bootcamp", "Nigeria", "180 students"],
        ["Open budget fellows", "Kenya", "12 counties"]
      ]
    },
    title: "Success stories hub",
    workflow: ["Browse stories", "Open detail", "Submit story", "Admin review"]
  },
  successStoryDetail: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "A long-form impact story detail route with story metadata, outcomes, and related calls to action.",
    eyebrow: "Impact story",
    highlights: [
      {
        body: "Narrative, metrics, program links, and related initiatives are presented as real UI.",
        meta: "Editorial",
        title: "Story detail"
      },
      {
        body: "Media and publishing state are fixture-backed until story APIs exist.",
        meta: "Backend needed",
        title: "Future CMS"
      },
      {
        body: "Designed to connect public storytelling with authenticated member action.",
        meta: "Engagement",
        title: "Action path"
      }
    ],
    metrics: [
      { label: "Farmers reached", value: "2,400" },
      { label: "Women trained", value: "61%" },
      { label: "Regions", value: "4" }
    ],
    primaryAction: { href: "/initiatives", label: "Explore initiatives" },
    route: "/success-stories/[storyId]",
    sourceExports: ["story_detail_empowering_agri_tech_in_zambia"],
    table: {
      headers: ["Outcome", "Evidence", "Status"],
      rows: [
        ["Farmer training", "Attendance records", "reported"],
        ["Market access", "Partner letters", "reported"],
        ["Youth trainers", "Certification list", "in progress"]
      ]
    },
    title: "Empowering agri-tech in Zambia",
    workflow: ["Read story", "Review outcomes", "Find related initiatives", "Share"]
  },
  successStoryNew: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Story submission surface for members to share outcomes, evidence, media, and editorial notes.",
    eyebrow: "Share impact",
    highlights: [
      {
        body: "Captures story summary, location, impact metrics, media notes, and permissions.",
        meta: "Form",
        title: "Story intake"
      },
      {
        body: "Submit remains disabled until story persistence and moderation APIs exist.",
        meta: "Backend needed",
        title: "Safe prototype"
      },
      {
        body: "Admin story moderation route is ready for frontend review.",
        meta: "Admin",
        title: "Editorial review"
      }
    ],
    metrics: [
      { label: "Fields", value: "9" },
      { label: "Review", value: "required" },
      { label: "Submit", value: "disabled" }
    ],
    primaryAction: { disabled: true, label: "Submit story" },
    route: "/success-stories/new",
    sourceExports: ["share_your_impact_story"],
    table: {
      headers: ["Section", "Purpose", "Status"],
      rows: [
        ["Narrative", "Story and context", "ready"],
        ["Impact", "Metrics and evidence", "ready"],
        ["Media", "Photo/video rights", "backend needed"]
      ]
    },
    title: "Share your impact story",
    workflow: ["Draft story", "Add metrics", "Attach media", "Submit for review"]
  },
  contributionsHub: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Contribution campaigns, receipts, and treasury-ready records backed by the live contributions API.",
    eyebrow: "Contributions",
    highlights: [
      {
        body: "Browse live campaigns and see current funding progress from the contributions API.",
        meta: "Campaigns",
        title: "Funding visibility"
      },
      {
        body: "Campaign detail, pay, and receipt routes all run on live backend records.",
        meta: "Live API",
        title: "Contribution workflow"
      },
      {
        body: "External provider hardening remains follow-up work, but local confirmed payment and receipt flows are implemented.",
        meta: "Finance foundation",
        title: "Current payment scope"
      }
    ],
    metrics: [
      { label: "Active campaigns", value: "5" },
      { label: "Raised", value: "$42k" },
      { label: "Receipts", value: "312" }
    ],
    primaryAction: { href: "/contributions/chapter-innovation-fund", label: "Open campaign" },
    route: "/contributions",
    sourceExports: ["contribution_campaign_detail"],
    table: {
      headers: ["Campaign", "Raised", "Status"],
      rows: [
        ["Chapter innovation fund", "$18,400", "active"],
        ["Annual gathering scholarships", "$9,200", "active"],
        ["Youth leadership microgrants", "$14,100", "review"]
      ]
    },
    title: "Contribution campaigns",
    workflow: ["Browse campaign", "Contribute", "Receive receipt", "Treasury audit"]
  },
  contributionCampaign: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Campaign detail route with live goal progress, donor visibility, and contribution actions.",
    eyebrow: "Campaign detail",
    highlights: [
      {
        body: "Shows live goal progress, contributors, and governance notes from the contributions API.",
        meta: "Live campaign",
        title: "Transparent campaign"
      },
      {
        body: "Contribution actions route members into the live payment and receipt workflow.",
        meta: "Workflow",
        title: "Contribution path"
      },
      {
        body: "Local confirmed payments and receipts are implemented while provider hardening remains future work.",
        meta: "Finance foundation",
        title: "Payment scope"
      }
    ],
    metrics: [
      { label: "Raised", value: "$18.4k" },
      { label: "Goal", value: "$25k" },
      { label: "Contributors", value: "146" }
    ],
    primaryAction: { href: "/contributions/chapter-innovation-fund/pay", label: "Contribute" },
    route: "/contributions/[campaignId]",
    sourceExports: ["contribution_campaign_detail"],
    table: {
      headers: ["Allocation", "Budget", "Status"],
      rows: [
        ["Microgrants", "$12,000", "approved"],
        ["Mentor stipends", "$6,000", "planned"],
        ["Reporting", "$2,500", "planned"]
      ]
    },
    title: "Chapter innovation fund",
    workflow: ["Review campaign", "Choose amount", "Confirm receipt", "Audit ledger"]
  },
  contributionPay: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Contribution checkout route with live amount capture, donor details, payment recording, and receipt issuance.",
    eyebrow: "Contribute",
    highlights: [
      {
        body: "Members can record local confirmed contributions against live campaigns.",
        meta: "Payments",
        title: "Live checkout foundation"
      },
      {
        body: "Receipt routes open on the live receipt API after a contribution is recorded.",
        meta: "Receipt",
        title: "Receipt path live"
      },
      {
        body: "External processor hardening remains a follow-up slice beyond the current local-confirmed payment flow.",
        meta: "Future",
        title: "Provider hardening"
      }
    ],
    metrics: [
      { label: "Suggested", value: "$25" },
      { label: "Receipt", value: "live" },
      { label: "Submit", value: "enabled" }
    ],
    primaryAction: { href: "/contributions/[campaignId]/pay", label: "Record contribution" },
    route: "/contributions/[campaignId]/pay",
    secondaryAction: { href: "/contributions/receipts/demo-receipt", label: "Open receipt route" },
    sourceExports: ["contribute_to_campaign"],
    table: {
      headers: ["Step", "Detail", "Status"],
      rows: [
        ["Amount", "Member selects amount", "live"],
        ["Payment", "Local confirmed payment", "live"],
        ["Receipt", "Receipt and ledger entry", "live"]
      ]
    },
    title: "Contribute to campaign",
    workflow: ["Select amount", "Enter donor details", "Pay", "Receive receipt"]
  },
  contributionReceipt: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Contribution receipt route with live donor, campaign, amount, and download actions.",
    eyebrow: "Receipt",
    highlights: [
      {
        body: "Receipt layout now reads the live contribution receipt record.",
        meta: "Finance",
        title: "Audit-friendly receipt"
      },
      {
        body: "Text and PDF receipt download endpoints are implemented.",
        meta: "Downloads",
        title: "Document actions live"
      },
      {
        body: "Receipts align with campaign contribution records and treasury review flows.",
        meta: "Governance",
        title: "Traceable contribution"
      }
    ],
    metrics: [
      { label: "Amount", value: "live" },
      { label: "Receipt ID", value: "live" },
      { label: "Downloads", value: "enabled" }
    ],
    primaryAction: { href: "/contributions/receipts/[receiptId]", label: "Download PDF" },
    route: "/contributions/receipts/[receiptId]",
    sourceExports: ["contribution_receipt"],
    table: {
      headers: ["Receipt field", "Value", "Status"],
      rows: [
        ["Campaign", "Contribution campaign", "live"],
        ["Payment provider", "Recorded method/reference", "live"],
        ["Ledger reference", "Receipt-backed record", "live"]
      ]
    },
    title: "Contribution receipt",
    workflow: ["Payment success", "Receipt created", "Ledger updated", "Treasury review"]
  },
  electionsHub: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Member election hub for active ballots, candidate information, voting details, and results/audit reports backed by the live election API.",
    eyebrow: "Elections",
    highlights: [
      {
        body: "Members can see live active, closed, and archived elections with load-more pagination.",
        meta: "Governance",
        title: "Election discovery"
      },
      {
        body: "Voting and results routes now use the same backend election records.",
        meta: "Live API",
        title: "Full member surface"
      },
      {
        body: "Nomination workflows, signed audit packets, and dedicated admin detail routes remain follow-up work.",
        meta: "Future hardening",
        title: "Advanced governance gaps"
      }
    ],
    metrics: [
      { label: "Data", value: "live" },
      { label: "Page size", value: "12" },
      { label: "Voting", value: "API" }
    ],
    primaryAction: { href: "/elections", label: "Browse elections" },
    route: "/elections",
    sourceExports: ["election_hub"],
    table: {
      headers: ["Election", "Window", "Status"],
      rows: [
        ["Election list", "GET /api/v1/elections", "live"],
        ["Ballot route", "POST /api/v1/elections/{id}/vote", "live"],
        ["Results route", "GET /api/v1/elections/{id}/results", "live"]
      ]
    },
    title: "Election hub",
    workflow: ["Check eligibility", "Review candidates", "Vote", "Review results"]
  },
  electionDetail: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Election overview with live eligibility, candidate summary, voting window, and governance rules.",
    eyebrow: "Election detail",
    highlights: [
      {
        body: "Central route links members to live voting and results once each phase opens.",
        meta: "Governance",
        title: "Election overview"
      },
      {
        body: "Eligibility, vote state, and candidate counts are returned from the election API.",
        meta: "Trust",
        title: "Rules surfaced"
      },
      {
        body: "Admin detail subroutes and signed audit packets are still future hardening.",
        meta: "Future hardening",
        title: "Advanced admin gaps"
      }
    ],
    metrics: [
      { label: "Candidates", value: "live" },
      { label: "Window", value: "live" },
      { label: "Eligibility", value: "live" }
    ],
    primaryAction: { href: "/elections", label: "Open elections hub" },
    route: "/elections/[electionId]",
    secondaryAction: { href: "/elections/chapter-council-2026/results", label: "Results audit" },
    sourceExports: ["election_hub"],
    table: {
      headers: ["Rule", "Detail", "Status"],
      rows: [
        ["Eligibility", "Verified members on voter roll", "live"],
        ["Ballot privacy", "One vote per eligible voter", "live"],
        ["Audit", "Admin audit trail endpoint", "live foundation"]
      ]
    },
    title: "Chapter council election 2026",
    workflow: ["Review rules", "Study candidates", "Vote", "Audit results"]
  },
  electionNew: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Member-side election proposal route is present for parity; operational creation lives under admin elections.",
    eyebrow: "Election setup",
    highlights: [
      {
        body: "This member route links users to election information while admin setup remains permission-gated.",
        meta: "Routing",
        title: "Route included from plan"
      },
      {
        body: "Creation is disabled for regular members.",
        meta: "Governance",
        title: "Permission-aware"
      },
      {
        body: "Use the admin election wizard for the operational creation prototype.",
        meta: "Admin route",
        title: "Admin creation available"
      }
    ],
    metrics: [
      { label: "Member creation", value: "disabled" },
      { label: "Admin wizard", value: "ready" },
      { label: "Backend", value: "needed" }
    ],
    primaryAction: { href: "/admin/elections/new", label: "Admin election wizard" },
    route: "/elections/new",
    sourceExports: ["create_new_election_wizard"],
    table: {
      headers: ["Route", "Purpose", "Status"],
      rows: [
        ["/elections/new", "Member-plan route", "safe shell"],
        ["/admin/elections/new", "Admin creation wizard", "prototype"],
        ["Election APIs", "Persist elections", "not implemented"]
      ]
    },
    title: "Election setup requires admin access",
    workflow: ["Review governance", "Request admin support", "Create in admin", "Publish election"]
  },
  electionVote: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Voting details route with ballot instructions, candidates, integrity copy, and live cast-vote action.",
    eyebrow: "Voting",
    highlights: [
      {
        body: "Candidate choices are loaded from the election API.",
        meta: "Ballot",
        title: "Vote detail"
      },
      {
        body: "Vote submission uses the live eligible-voter ballot endpoint.",
        meta: "Security",
        title: "Live vote casting"
      },
      {
        body: "The route respects voter-roll eligibility and duplicate-vote protection.",
        meta: "Audit",
        title: "Integrity-aware"
      }
    ],
    metrics: [
      { label: "Candidates", value: "live" },
      { label: "Eligible", value: "live" },
      { label: "Vote", value: "enabled" }
    ],
    primaryAction: { href: "/elections", label: "Find eligible ballots" },
    route: "/elections/[electionId]/vote",
    sourceExports: ["election_voting_details"],
    table: {
      headers: ["Candidate", "Region", "Status"],
      rows: [
        ["Candidate list", "Election candidates API", "live"],
        ["Eligibility", "Election voter-roll API", "live"],
        ["Vote record", "Election vote API", "live"]
      ]
    },
    title: "Election voting details",
    workflow: ["Confirm eligibility", "Review candidates", "Select candidate", "Cast secure vote"]
  },
  electionResults: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Member-facing election results route with live vote totals, candidate percentages, and quorum status.",
    eyebrow: "Results audit",
    highlights: [
      {
        body: "Results are separated from vote casting and use the live results endpoint.",
        meta: "Transparency",
        title: "Audit-first results"
      },
      {
        body: "Results include eligible-voter counts, total votes, candidate shares, and quorum status.",
        meta: "Governance",
        title: "Cross-linked"
      },
      {
        body: "Signed report packets and dispute handling remain later governance hardening.",
        meta: "Future hardening",
        title: "Audit exports pending"
      }
    ],
    metrics: [
      { label: "Turnout", value: "live" },
      { label: "Ballots", value: "live" },
      { label: "Quorum", value: "live" }
    ],
    primaryAction: { href: "/elections", label: "Open elections hub" },
    route: "/elections/[electionId]/results",
    sourceExports: ["election_results_audit"],
    table: {
      headers: ["Candidate", "Votes", "Share"],
      rows: [
        ["Candidate totals", "Election results API", "live"],
        ["Quorum", "Election results API", "live"],
        ["Admin audit", "Election audit API", "live foundation"]
      ]
    },
    title: "Election results audit",
    workflow: ["Close polls", "Tally ballots", "Publish results", "Audit report"]
  },
  adminOpportunities: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Legacy member-app route that now redirects admins into the live separate admin console opportunity moderation queue.",
    eyebrow: "Admin opportunities",
    highlights: [
      {
        body: "Submitted opportunities are reviewed in the separate RBAC admin console.",
        meta: "Live console",
        title: "Operational moderation"
      },
      {
        body: "The moderation API is already live in the admin app and publishes approved listings into the member marketplace.",
        meta: "Live API",
        title: "Publishing connected"
      },
      {
        body: "This legacy route now exists as a secure handoff instead of a dead-end prototype.",
        meta: "Route parity",
        title: "Split-runtime aligned"
      }
    ],
    metrics: [
      { label: "Runtime", value: "3011" },
      { label: "Review queue", value: "live" },
      { label: "Publishing", value: "connected" }
    ],
    primaryAction: { href: "http://127.0.0.1:3011/opportunities", label: "Open admin console" },
    requiresAdmin: true,
    route: "/admin/opportunities",
    sourceExports: ["opportunity_moderation_queue"],
    table: {
      headers: ["Listing", "Sponsor", "Status"],
      rows: [
        ["Review queue", "Separate admin console", "live"],
        ["Member publishing", "Opportunity API", "live"],
        ["Legacy route", "Secure handoff", "active"]
      ]
    },
    title: "Opportunity moderation queue",
    workflow: ["Authenticate as admin", "Redirect to admin console", "Review listing", "Publish"]
  },
  adminResources: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Legacy member-app route that now redirects admins into the live separate admin console resource moderation queue.",
    eyebrow: "Admin resources",
    highlights: [
      {
        body: "Submitted resources are reviewed in the separate RBAC admin console.",
        meta: "Live console",
        title: "Operational moderation"
      },
      {
        body: "The moderation API is already live in the admin app and publishes approved records into the member library.",
        meta: "Live API",
        title: "Publishing connected"
      },
      {
        body: "This legacy route now exists as a secure handoff instead of a dead-end prototype.",
        meta: "Route parity",
        title: "Split-runtime aligned"
      }
    ],
    metrics: [
      { label: "Runtime", value: "3011" },
      { label: "Review queue", value: "live" },
      { label: "Publishing", value: "connected" }
    ],
    primaryAction: { href: "http://127.0.0.1:3011/resources", label: "Open admin console" },
    requiresAdmin: true,
    route: "/admin/resources",
    sourceExports: ["resource_management_console"],
    table: {
      headers: ["Resource", "Contributor", "Status"],
      rows: [
        ["Review queue", "Separate admin console", "live"],
        ["Member publishing", "Resource API", "live"],
        ["Legacy route", "Secure handoff", "active"]
      ]
    },
    title: "Resource management console",
    workflow: ["Authenticate as admin", "Redirect to admin console", "Review resource", "Publish"]
  },
  adminSuccessStories: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Legacy member-app route that now redirects admins into the live separate admin console success story moderation queue.",
    eyebrow: "Admin stories",
    highlights: [
      {
        body: "Submitted stories are reviewed in the separate RBAC admin console.",
        meta: "Live console",
        title: "Operational moderation"
      },
      {
        body: "The moderation API is already live in the admin app and publishes approved stories into the member hub.",
        meta: "Live API",
        title: "Publishing connected"
      },
      {
        body: "This legacy route now exists as a secure handoff instead of a dead-end prototype.",
        meta: "Route parity",
        title: "Split-runtime aligned"
      }
    ],
    metrics: [
      { label: "Runtime", value: "3011" },
      { label: "Review queue", value: "live" },
      { label: "Publishing", value: "connected" }
    ],
    primaryAction: { href: "http://127.0.0.1:3011/success-stories", label: "Open admin console" },
    requiresAdmin: true,
    route: "/admin/success-stories",
    sourceExports: ["success_story_moderation_queue"],
    table: {
      headers: ["Story", "Country", "Status"],
      rows: [
        ["Review queue", "Separate admin console", "live"],
        ["Member publishing", "Success stories API", "live"],
        ["Legacy route", "Secure handoff", "active"]
      ]
    },
    title: "Success story moderation queue",
    workflow: ["Authenticate as admin", "Redirect to admin console", "Review story", "Publish"]
  },
  adminElections: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Legacy member-app route that now redirects election admins into the live separate admin console elections surface.",
    eyebrow: "Admin elections",
    highlights: [
      {
        body: "Election administration now runs in the separate RBAC admin console.",
        meta: "Live console",
        title: "Operational elections"
      },
      {
        body: "Live election summaries, draft candidate queues, and audit visibility already exist in the admin console surface.",
        meta: "Live API",
        title: "Governance visibility connected"
      },
      {
        body: "This legacy route now exists as a secure handoff instead of a dead-end prototype.",
        meta: "Route parity",
        title: "Split-runtime aligned"
      }
    ],
    metrics: [
      { label: "Runtime", value: "3011" },
      { label: "Elections", value: "live" },
      { label: "Audit", value: "connected" }
    ],
    primaryAction: { href: "http://127.0.0.1:3011/elections", label: "Open admin console" },
    requiresAdmin: true,
    route: "/admin/elections",
    sourceExports: ["election_admin_dashboard"],
    table: {
      headers: ["Election", "Phase", "Action"],
      rows: [
        ["Election queue", "Separate admin console", "live"],
        ["Candidate review", "Election APIs", "live"],
        ["Legacy route", "Secure handoff", "active"]
      ]
    },
    title: "Election admin dashboard",
    workflow: ["Authenticate as admin", "Redirect to admin console", "Review elections", "Open governance tools"]
  },
  adminElectionNew: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Legacy member-app route that now redirects election admins into the live separate admin console election draft workflow.",
    eyebrow: "Create election",
    highlights: [
      {
        body: "Election drafts are now created from the separate RBAC admin console.",
        meta: "Live console",
        title: "Operational draft creation"
      },
      {
        body: "The live console already supports draft creation, candidate management, voter-roll updates, and audit export access.",
        meta: "Live API",
        title: "Governance workflow connected"
      },
      {
        body: "This legacy route now exists as a secure handoff instead of a disabled prototype shell.",
        meta: "Route parity",
        title: "Split-runtime aligned"
      }
    ],
    metrics: [
      { label: "Runtime", value: "3011" },
      { label: "Drafts", value: "live" },
      { label: "Create", value: "enabled" }
    ],
    primaryAction: { href: "http://127.0.0.1:3011/elections", label: "Open admin console" },
    requiresAdmin: true,
    route: "/admin/elections/new",
    sourceExports: ["create_new_election_wizard"],
    table: {
      headers: ["Step", "Purpose", "Status"],
      rows: [
        ["Draft creation", "Separate admin console", "live"],
        ["Candidate and voter setup", "Election APIs", "live"],
        ["Legacy route", "Secure handoff", "active"]
      ]
    },
    title: "Create new election wizard",
    workflow: ["Authenticate as admin", "Redirect to admin console", "Create draft", "Continue election setup"]
  },
  adminElectionConsole: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Legacy member-app route that now redirects election admins into the live separate admin console election operations workflow.",
    eyebrow: "Election console",
    highlights: [
      {
        body: "Election operations now run in the separate RBAC admin console.",
        meta: "Live console",
        title: "Operational election console"
      },
      {
        body: "The live admin console already exposes draft creation, candidate review, voter-roll updates, status changes, and audit export access.",
        meta: "Live API",
        title: "Governance controls connected"
      },
      {
        body: "This legacy route now exists as a secure handoff instead of a fixture election shell.",
        meta: "Route parity",
        title: "Split-runtime aligned"
      }
    ],
    metrics: [
      { label: "Runtime", value: "3011" },
      { label: "Election", value: "live" },
      { label: "Governance", value: "enabled" }
    ],
    primaryAction: { href: "http://127.0.0.1:3011/elections", label: "Open admin console" },
    requiresAdmin: true,
    route: "/admin/elections/[electionId]",
    secondaryAction: { href: "http://127.0.0.1:3011/elections", label: "Open governance tools" },
    sourceExports: ["admin_election_console"],
    table: {
      headers: ["Control", "State", "Route"],
      rows: [
        ["Election workflow", "Separate admin console", "live"],
        ["Candidate, roll, and audit tools", "Election APIs", "live"],
        ["Legacy route", "Secure handoff", "active"]
      ]
    },
    title: "Admin election console",
    workflow: ["Authenticate as admin", "Redirect to admin console", "Review election", "Operate governance tools"]
  },
  adminElectionCandidates: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Legacy member-app route that now redirects election admins into the live separate admin console candidate review workflow.",
    eyebrow: "Candidate review",
    highlights: [
      {
        body: "Candidate review now runs in the separate RBAC admin console.",
        meta: "Live console",
        title: "Operational candidate review"
      },
      {
        body: "The live admin console already supports approve and reject actions for draft election candidates.",
        meta: "Live API",
        title: "Draft review available"
      },
      {
        body: "This legacy route now exists as a secure handoff instead of a fixture review queue.",
        meta: "Route parity",
        title: "Split-runtime aligned"
      }
    ],
    metrics: [
      { label: "Runtime", value: "3011" },
      { label: "Candidates", value: "live" },
      { label: "Review", value: "enabled" }
    ],
    primaryAction: { href: "http://127.0.0.1:3011/elections", label: "Open admin console" },
    requiresAdmin: true,
    route: "/admin/elections/[electionId]/candidates",
    sourceExports: ["candidate_review_queue"],
    table: {
      headers: ["Candidate", "Position", "Status"],
      rows: [
        ["Candidate queue", "Separate admin console", "live"],
        ["Approve/reject actions", "Election APIs", "live"],
        ["Legacy route", "Secure handoff", "active"]
      ]
    },
    title: "Candidate review queue",
    workflow: ["Authenticate as admin", "Redirect to admin console", "Review candidate", "Approve or reject"]
  },
  adminElectionVoterRoll: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Voter roll management now runs in the separate RBAC admin console election workflow.",
    eyebrow: "Voter roll",
    highlights: [
      {
        body: "The legacy route now hands off to the live admin console voter-roll workflow.",
        meta: "Live console",
        title: "Secure handoff"
      },
      {
        body: "Eligibility review, roll updates, and lifecycle actions stay on the existing election APIs.",
        meta: "Live API",
        title: "Operational controls"
      },
      {
        body: "Admin auth still gates the legacy member-app path before redirecting to the RBAC console.",
        meta: "RBAC",
        title: "Protected route"
      }
    ],
    metrics: [
      { label: "Runtime", value: "admin app" },
      { label: "Workflow", value: "live" },
      { label: "Status", value: "redirect" }
    ],
    primaryAction: { href: "/admin/elections", label: "Open admin console" },
    requiresAdmin: true,
    route: "/admin/elections/[electionId]/voter-roll",
    sourceExports: ["voter_roll_management"],
    table: {
      headers: ["Surface", "Destination", "Status"],
      rows: [
        ["Legacy route", "Separate admin console", "live"],
        ["Voter roll actions", "Election APIs", "live"],
        ["Access control", "Secure handoff", "active"]
      ]
    },
    title: "Voter roll management",
    workflow: ["Authenticate as admin", "Redirect to admin console", "Review voter roll", "Update eligibility"]
  },
  adminElectionPrivacy: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Ballot privacy and integrity controls now read the live election admin privacy API.",
    eyebrow: "Ballot integrity",
    highlights: [
      {
        body: "Loads the election privacy mode and audit guidance directly from the backend.",
        meta: "Privacy",
        title: "Live controls"
      },
      {
        body: "Surfaces the current vote-recording guarantee used by the election foundation.",
        meta: "Recording",
        title: "Audit posture"
      },
      {
        body: "Keeps future ballot-envelope hardening visible without pretending it is complete today.",
        meta: "Future",
        title: "Hardening note"
      }
    ],
    metrics: [
      { label: "Data", value: "live" },
      { label: "Audit trail", value: "available" },
      { label: "Mode", value: "active" }
    ],
    primaryAction: { href: "/admin/elections/[electionId]/audit", label: "Review audit route" },
    requiresAdmin: true,
    route: "/admin/elections/[electionId]/privacy",
    sourceExports: ["ballot_privacy_integrity_controls"],
    table: {
      headers: ["Control", "Current", "Status"],
      rows: [
        ["Privacy mode", "Election admin API", "live"],
        ["Vote recording", "Uniqueness enforced", "live"],
        ["Envelope hardening", "Future slice", "planned"]
      ]
    },
    title: "Ballot privacy integrity controls",
    workflow: ["Load election", "Review privacy mode", "Inspect audit note", "Review audit route"]
  },
  adminElectionAudit: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Legacy member-app route that now redirects election admins into the live separate admin console election audit workflow.",
    eyebrow: "Election audit",
    highlights: [
      {
        body: "Election audit export now runs in the separate RBAC admin console.",
        meta: "Live console",
        title: "Operational audit access"
      },
      {
        body: "The live admin console already exposes CSV export from the election audit workflow.",
        meta: "Live API",
        title: "CSV export available"
      },
      {
        body: "This legacy route now exists as a secure handoff instead of a fixture audit preview.",
        meta: "Route parity",
        title: "Split-runtime aligned"
      }
    ],
    metrics: [
      { label: "Runtime", value: "3011" },
      { label: "Audit", value: "live" },
      { label: "Export", value: "enabled" }
    ],
    primaryAction: { href: "http://127.0.0.1:3011/elections", label: "Open admin console" },
    requiresAdmin: true,
    route: "/admin/elections/[electionId]/audit",
    sourceExports: ["election_audit_results_report"],
    table: {
      headers: ["Audit item", "Result", "Status"],
      rows: [
        ["Audit export", "Separate admin console", "live"],
        ["Election lifecycle", "Election APIs", "live"],
        ["Legacy route", "Secure handoff", "active"]
      ]
    },
    title: "Election audit results report",
    workflow: ["Authenticate as admin", "Redirect to admin console", "Review audit", "Download CSV"]
  },
  adminChapters: {
    backendDependencyStatus: "partially implemented",
    dataSource: "live API",
    description:
      "Admin chapter management hub backed by live community records with direct links into community detail, leader, and analytics routes.",
    eyebrow: "Admin chapters",
    highlights: [
      {
        body: "Country and city chapter inventory now reads from the current live communities APIs.",
        meta: "Live API",
        title: "Chapter inventory is live"
      },
      {
        body: "Admins can jump directly into the live community detail and leader dashboard routes from the hub.",
        meta: "Workflow",
        title: "Operational entry points"
      },
      {
        body: "Dedicated chapter analytics and deeper aggregation/export pipelines remain follow-up work.",
        meta: "Partial backend",
        title: "Analytics depth still partial"
      }
    ],
    metrics: [
      { label: "Inventory", value: "live" },
      { label: "Roster", value: "live" },
      { label: "Analytics", value: "partial" }
    ],
    primaryAction: { href: "/admin/chapters", label: "Open chapter hub" },
    requiresAdmin: true,
    route: "/admin/chapters",
    sourceExports: ["chapter_analytics_dashboard"],
    table: {
      headers: ["Chapter", "Members", "Health"],
      rows: [
        ["Inventory", "Live chapter records", "available"],
        ["Leader routes", "Community dashboards", "available"],
        ["Analytics", "Derived live route", "partial"]
      ]
    },
    title: "Chapter management",
    workflow: ["Review chapters", "Open live route", "Inspect analytics", "Follow up with leaders"]
  },
  adminChapterAnalytics: {
    backendDependencyStatus: "partially implemented",
    dataSource: "live API",
    description:
      "Chapter analytics dashboard derived from live community, roster, invitation, post, and moderation data.",
    eyebrow: "Chapter analytics",
    highlights: [
      {
        body: "Metrics are grouped for chapter leaders and platform admins using current live community APIs.",
        meta: "Analytics",
        title: "Health dashboard"
      },
      {
        body: "Dedicated aggregation jobs, export pipelines, and richer event analytics remain partial follow-up work.",
        meta: "Partial backend",
        title: "Derived analytics"
      },
      {
        body: "Designed for quick scanning and repeated operational use.",
        meta: "Admin-grade",
        title: "Dense and practical"
      }
    ],
    metrics: [
      { label: "Roster", value: "live" },
      { label: "Activity", value: "live" },
      { label: "Reports", value: "live" }
    ],
    primaryAction: { href: "/admin/chapters/demo-chapter/analytics", label: "Open analytics" },
    requiresAdmin: true,
    route: "/admin/chapters/[chapterId]/analytics",
    sourceExports: ["chapter_analytics_dashboard"],
    table: {
      headers: ["Metric", "Current", "Trend"],
      rows: [
        ["Active roster", "Community members API", "live"],
        ["Recent activity", "Community posts API", "live"],
        ["Open reports", "Moderation queue API", "live"]
      ]
    },
    title: "Chapter analytics dashboard",
    workflow: ["Review membership", "Check activity", "Flag risks", "Export report"]
  },
  adminTreasury: {
    backendDependencyStatus: "implemented",
    dataSource: "live API",
    description:
      "Legacy member-app route that now redirects finance admins into the live separate admin console treasury surface.",
    eyebrow: "Treasury",
    highlights: [
      {
        body: "Treasury review now runs in the separate RBAC admin console.",
        meta: "Live console",
        title: "Operational treasury"
      },
      {
        body: "Live campaign, receipt, and ledger summaries already exist in the admin console surface.",
        meta: "Live API",
        title: "Finance visibility connected"
      },
      {
        body: "This legacy route now exists as a secure handoff instead of a dead-end prototype.",
        meta: "Route parity",
        title: "Split-runtime aligned"
      }
    ],
    metrics: [
      { label: "Runtime", value: "3011" },
      { label: "Treasury", value: "live" },
      { label: "Receipts", value: "connected" }
    ],
    primaryAction: { href: "http://127.0.0.1:3011/treasury", label: "Open admin console" },
    requiresAdmin: true,
    route: "/admin/treasury",
    sourceExports: ["treasurer_dashboard"],
    table: {
      headers: ["Ledger item", "Amount", "Status"],
      rows: [
        ["Treasury queue", "Separate admin console", "live"],
        ["Campaign and receipts", "Contribution APIs", "live"],
        ["Legacy route", "Secure handoff", "active"]
      ]
    },
    title: "Treasurer dashboard",
    workflow: ["Authenticate as admin", "Redirect to admin console", "Review treasury", "Export finance data"]
  }
} satisfies Record<string, FeatureScreenConfig>;

export type FeatureScreenKey = keyof typeof featureScreens;
