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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "admin_election_console",
    notes: "Admin election operations shell with fixture election controls.",
    route: "/admin/elections/[electionId]",
    status: "route-complete prototype"
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "ballot_privacy_integrity_controls",
    notes: "Admin ballot integrity controls for future elections backend.",
    route: "/admin/elections/[electionId]/privacy",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "partially implemented",
    dataSource: "fixture",
    exportFolder: "candidate_review_queue",
    notes: "Legacy route remains a fixture reference; live draft-only candidate approve/reject controls exist in the separate admin console.",
    route: "/admin/elections/[electionId]/candidates",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "chapter_analytics_dashboard",
    notes: "Analytics dashboard shell with fixture membership and activity metrics.",
    route: "/admin/chapters/[chapterId]/analytics",
    status: "route-complete prototype"
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "contribute_to_campaign",
    notes: "Contribution checkout surface is disabled until payments backend lands.",
    route: "/contributions/[campaignId]/pay",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "contribution_campaign_detail",
    notes: "Campaign detail and ledger preview use internal fixture data.",
    route: "/contributions/[campaignId]",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "contribution_receipt",
    notes: "Receipt route renders a production-shaped receipt preview.",
    route: "/contributions/receipts/[receiptId]",
    status: "route-complete prototype"
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "create_new_election_wizard",
    notes: "Admin election wizard is visually available with disabled submit.",
    route: "/admin/elections/new",
    status: "route-complete prototype"
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "election_admin_dashboard",
    notes: "Election admin hub with fixture election lifecycle state.",
    route: "/admin/elections",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "partially implemented",
    dataSource: "fixture",
    exportFolder: "election_audit_results_report",
    notes: "Legacy route remains a fixture reference; live admin-console election audit CSV export is available.",
    route: "/admin/elections/[electionId]/audit",
    status: "route-complete prototype"
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "voter_roll_management",
    notes: "Voter roll management shell until elections backend lands.",
    route: "/admin/elections/[electionId]/voter-roll",
    status: "route-complete prototype"
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Contribution campaigns, transparent ledgers, receipts, and treasurer workflows for chapter funding.",
    eyebrow: "Contributions",
    highlights: [
      {
        body: "Browse active campaigns and see high-level funding progress.",
        meta: "Campaigns",
        title: "Funding visibility"
      },
      {
        body: "Campaign detail, pay, receipt, and treasury routes are all present.",
        meta: "Route parity",
        title: "Contribution workflow"
      },
      {
        body: "Payment processing and ledger persistence remain future backend work.",
        meta: "Backend needed",
        title: "No real payments"
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Campaign detail route with goal, allocation plan, ledger preview, donor visibility, and contribution action.",
    eyebrow: "Campaign detail",
    highlights: [
      {
        body: "Shows goal progress, allocation buckets, contributors, and governance notes.",
        meta: "Ledger-ready",
        title: "Transparent campaign"
      },
      {
        body: "Payment action links to a route-complete checkout prototype.",
        meta: "Workflow",
        title: "Contribution path"
      },
      {
        body: "Payment and ledger writes are disabled until finance backend exists.",
        meta: "Backend needed",
        title: "No real money movement"
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Contribution checkout route with amount, donor details, payment method, and receipt preview.",
    eyebrow: "Contribute",
    highlights: [
      {
        body: "Checkout form is visible for design review but payment is disabled.",
        meta: "Payments",
        title: "Safe checkout prototype"
      },
      {
        body: "Receipt route exists to review post-payment confirmation flow.",
        meta: "Receipt",
        title: "Receipt path ready"
      },
      {
        body: "Stripe or equivalent payment integration is a future implementation slice.",
        meta: "Backend needed",
        title: "No real charge"
      }
    ],
    metrics: [
      { label: "Suggested", value: "$50" },
      { label: "Fees", value: "planned" },
      { label: "Submit", value: "disabled" }
    ],
    primaryAction: { disabled: true, label: "Confirm contribution" },
    route: "/contributions/[campaignId]/pay",
    secondaryAction: { href: "/contributions/receipts/demo-receipt", label: "Preview receipt" },
    sourceExports: ["contribute_to_campaign"],
    table: {
      headers: ["Step", "Detail", "Status"],
      rows: [
        ["Amount", "Member selects amount", "ready"],
        ["Payment", "Provider tokenization", "backend needed"],
        ["Receipt", "Receipt and ledger entry", "prototype"]
      ]
    },
    title: "Contribute to campaign",
    workflow: ["Select amount", "Enter donor details", "Pay", "Receive receipt"]
  },
  contributionReceipt: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Contribution receipt route with donor, campaign, amount, transaction metadata, and ledger note.",
    eyebrow: "Receipt",
    highlights: [
      {
        body: "Receipt layout is ready for future transaction records.",
        meta: "Finance",
        title: "Audit-friendly receipt"
      },
      {
        body: "Print and download actions are disabled until PDF generation exists.",
        meta: "Backend needed",
        title: "Document generation pending"
      },
      {
        body: "Designed to align with treasury dashboard and campaign ledger.",
        meta: "Governance",
        title: "Traceable contribution"
      }
    ],
    metrics: [
      { label: "Amount", value: "$50" },
      { label: "Receipt ID", value: "RCPT-001" },
      { label: "Ledger", value: "pending" }
    ],
    primaryAction: { disabled: true, label: "Download PDF" },
    route: "/contributions/receipts/[receiptId]",
    sourceExports: ["contribution_receipt"],
    table: {
      headers: ["Receipt field", "Value", "Status"],
      rows: [
        ["Campaign", "Chapter innovation fund", "recorded"],
        ["Payment provider", "Pending integration", "planned"],
        ["Ledger reference", "Future transaction ID", "planned"]
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Admin elections dashboard for lifecycle state, voter roll readiness, candidate review, privacy controls, and audits.",
    eyebrow: "Admin elections",
    highlights: [
      {
        body: "Manage election setup, candidates, voter roll, privacy controls, and audit reports.",
        meta: "Governance",
        title: "Election operations"
      },
      {
        body: "All exported election admin surfaces are now routed for frontend review.",
        meta: "Route parity",
        title: "Complete admin surface"
      },
      {
        body: "Secure voting, ledger, and eligibility backends remain future work.",
        meta: "Backend needed",
        title: "Fixture only"
      }
    ],
    metrics: [
      { label: "Active", value: "2" },
      { label: "Candidate queues", value: "8" },
      { label: "Voter rolls", value: "3.8k" }
    ],
    primaryAction: { href: "/admin/elections/new", label: "Create election" },
    requiresAdmin: true,
    route: "/admin/elections",
    sourceExports: ["election_admin_dashboard"],
    table: {
      headers: ["Election", "Phase", "Action"],
      rows: [
        ["Chapter council 2026", "Voting", "Monitor"],
        ["Treasurer by-election", "Setup", "Review roll"],
        ["Programs committee", "Closed", "Audit"]
      ]
    },
    title: "Election admin dashboard",
    workflow: ["Create election", "Review candidates", "Lock voter roll", "Publish audit"]
  },
  adminElectionNew: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Admin election creation wizard for role, eligibility, voting window, candidate rules, and privacy controls.",
    eyebrow: "Create election",
    highlights: [
      {
        body: "Captures election basics, positions, voter eligibility, dates, and audit settings.",
        meta: "Wizard",
        title: "Governance setup"
      },
      {
        body: "Submit remains disabled until elections backend and audit logging exist.",
        meta: "Backend needed",
        title: "Safe prototype"
      },
      {
        body: "Wizard links into candidate, voter roll, privacy, and audit surfaces.",
        meta: "Workflow",
        title: "End-to-end routes"
      }
    ],
    metrics: [
      { label: "Steps", value: "6" },
      { label: "Privacy", value: "planned" },
      { label: "Submit", value: "disabled" }
    ],
    primaryAction: { disabled: true, label: "Create election" },
    requiresAdmin: true,
    route: "/admin/elections/new",
    sourceExports: ["create_new_election_wizard"],
    table: {
      headers: ["Step", "Purpose", "Status"],
      rows: [
        ["Basics", "Name and positions", "ready"],
        ["Eligibility", "Voter roll rules", "backend needed"],
        ["Privacy", "Ballot controls", "ready"]
      ]
    },
    title: "Create new election wizard",
    workflow: ["Basics", "Positions", "Candidates", "Voter roll", "Privacy", "Review"]
  },
  adminElectionConsole: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Election operations console for one election, with candidate queue, roll status, privacy controls, and audit readiness.",
    eyebrow: "Election console",
    highlights: [
      {
        body: "Centralized operational view for a single election.",
        meta: "Admin",
        title: "One-election console"
      },
      {
        body: "Links to every exported admin election sub-screen.",
        meta: "Routes",
        title: "Connected controls"
      },
      {
        body: "All actions are disabled until the elections backend is built.",
        meta: "Backend needed",
        title: "Safe state"
      }
    ],
    metrics: [
      { label: "Candidates", value: "8" },
      { label: "Roll status", value: "draft" },
      { label: "Audit", value: "pending" }
    ],
    primaryAction: { href: "/admin/elections/chapter-council-2026/candidates", label: "Review candidates" },
    requiresAdmin: true,
    route: "/admin/elections/[electionId]",
    secondaryAction: { href: "/admin/elections/chapter-council-2026/privacy", label: "Privacy controls" },
    sourceExports: ["admin_election_console"],
    table: {
      headers: ["Control", "State", "Route"],
      rows: [
        ["Candidate review", "8 pending", "/candidates"],
        ["Voter roll", "draft", "/voter-roll"],
        ["Audit report", "not generated", "/audit"]
      ]
    },
    title: "Admin election console",
    workflow: ["Review candidates", "Lock voter roll", "Open voting", "Publish audit"]
  },
  adminElectionCandidates: {
    backendDependencyStatus: "partially implemented",
    dataSource: "fixture",
    description:
      "Candidate review queue for election admins, including eligibility checks, statements, and decision notes.",
    eyebrow: "Candidate review",
    highlights: [
      {
        body: "Queue candidates by pending, approved, needs info, and rejected states.",
        meta: "Review",
        title: "Candidate governance"
      },
      {
        body: "The separate admin console can approve or reject draft candidates through the live election API.",
        meta: "Live admin console",
        title: "Draft review available"
      },
      {
        body: "Designed for audit notes and candidate statement validation.",
        meta: "Audit",
        title: "Traceable decisions"
      }
    ],
    metrics: [
      { label: "Pending", value: "8" },
      { label: "Approved", value: "14" },
      { label: "Needs info", value: "3" }
    ],
    primaryAction: { disabled: true, label: "Use admin console" },
    requiresAdmin: true,
    route: "/admin/elections/[electionId]/candidates",
    sourceExports: ["candidate_review_queue"],
    table: {
      headers: ["Candidate", "Position", "Status"],
      rows: [
        ["Amina Mensah", "Chair", "pending"],
        ["Jean Niyonzima", "Secretary", "needs info"],
        ["Thandi Dlamini", "Treasurer", "approved"]
      ]
    },
    title: "Candidate review queue",
    workflow: ["Review profile", "Check eligibility", "Add note", "Approve"]
  },
  adminElectionVoterRoll: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Voter roll management for election eligibility, verification status, exclusions, and roll locking.",
    eyebrow: "Voter roll",
    highlights: [
      {
        body: "Shows eligibility rules and roll health before locking.",
        meta: "Eligibility",
        title: "Roll readiness"
      },
      {
        body: "Lock and export actions are disabled until elections backend exists.",
        meta: "Backend needed",
        title: "Safe controls"
      },
      {
        body: "Designed to coordinate with ballot privacy controls.",
        meta: "Integrity",
        title: "Ballot preparation"
      }
    ],
    metrics: [
      { label: "Eligible", value: "3,812" },
      { label: "Excluded", value: "96" },
      { label: "Status", value: "draft" }
    ],
    primaryAction: { disabled: true, label: "Lock voter roll" },
    requiresAdmin: true,
    route: "/admin/elections/[electionId]/voter-roll",
    sourceExports: ["voter_roll_management"],
    table: {
      headers: ["Segment", "Count", "Status"],
      rows: [
        ["Verified alumni", "3,812", "eligible"],
        ["Unverified accounts", "462", "excluded"],
        ["Admin exclusions", "96", "review"]
      ]
    },
    title: "Voter roll management",
    workflow: ["Set rules", "Review exclusions", "Resolve conflicts", "Lock roll"]
  },
  adminElectionPrivacy: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Ballot privacy and integrity controls for anonymous ballots, audit logs, and fraud checks.",
    eyebrow: "Ballot integrity",
    highlights: [
      {
        body: "Separates voter identity, ballot receipt, and tally audit concepts.",
        meta: "Privacy",
        title: "Integrity controls"
      },
      {
        body: "Controls are disabled until secure election architecture is implemented.",
        meta: "Security",
        title: "No unsafe toggles"
      },
      {
        body: "Designed to make governance assumptions visible before backend build.",
        meta: "Policy",
        title: "Reviewable rules"
      }
    ],
    metrics: [
      { label: "Anonymity", value: "planned" },
      { label: "Audit trail", value: "planned" },
      { label: "Fraud checks", value: "planned" }
    ],
    primaryAction: { disabled: true, label: "Save controls" },
    requiresAdmin: true,
    route: "/admin/elections/[electionId]/privacy",
    sourceExports: ["ballot_privacy_integrity_controls"],
    table: {
      headers: ["Control", "Current", "Status"],
      rows: [
        ["Anonymous ballots", "required", "planned"],
        ["Receipt hashes", "enabled", "planned"],
        ["Duplicate detection", "strict", "planned"]
      ]
    },
    title: "Ballot privacy integrity controls",
    workflow: ["Review policy", "Set privacy", "Lock controls", "Audit"]
  },
  adminElectionAudit: {
    backendDependencyStatus: "partially implemented",
    dataSource: "fixture",
    description:
      "Election audit report route for turnout, tally confirmation, privacy checks, and publication notes.",
    eyebrow: "Election audit",
    highlights: [
      {
        body: "Summarizes turnout, ballot counts, exceptions, and audit notes.",
        meta: "Audit",
        title: "Results report"
      },
      {
        body: "The separate admin console can download a CSV export from live audit events.",
        meta: "Live admin console",
        title: "CSV export available"
      },
      {
        body: "Complements the member-facing results audit route.",
        meta: "Transparency",
        title: "Public trust"
      }
    ],
    metrics: [
      { label: "Ballots", value: "2,318" },
      { label: "Exceptions", value: "0" },
      { label: "Status", value: "clean" }
    ],
    primaryAction: { disabled: true, label: "Use admin console" },
    requiresAdmin: true,
    route: "/admin/elections/[electionId]/audit",
    sourceExports: ["election_audit_results_report"],
    table: {
      headers: ["Audit item", "Result", "Status"],
      rows: [
        ["Eligible voter count", "3,812", "matched"],
        ["Ballots cast", "2,318", "matched"],
        ["Duplicate attempts", "0", "clean"]
      ]
    },
    title: "Election audit results report",
    workflow: ["Close election", "Verify tally", "Resolve exceptions", "Publish report"]
  },
  adminChapters: {
    backendDependencyStatus: "partially implemented",
    dataSource: "fixture",
    description:
      "Admin chapter management hub for community health, leaders, approvals, and analytics links.",
    eyebrow: "Admin chapters",
    highlights: [
      {
        body: "Current communities backend supports many chapter-adjacent workflows.",
        meta: "Partial backend",
        title: "Community foundation exists"
      },
      {
        body: "Dedicated chapter analytics and governance models remain future work.",
        meta: "Next",
        title: "Chapter layer needed"
      },
      {
        body: "Route links to chapter analytics prototype for review.",
        meta: "Route parity",
        title: "Analytics surface present"
      }
    ],
    metrics: [
      { label: "Chapters", value: "49" },
      { label: "Managers", value: "112" },
      { label: "Health alerts", value: "7" }
    ],
    primaryAction: { href: "/admin/chapters/demo-chapter/analytics", label: "Open analytics" },
    requiresAdmin: true,
    route: "/admin/chapters",
    sourceExports: ["chapter_analytics_dashboard"],
    table: {
      headers: ["Chapter", "Members", "Health"],
      rows: [
        ["Ghana", "1,284", "strong"],
        ["Rwanda", "842", "stable"],
        ["Kenya", "1,036", "watch"]
      ]
    },
    title: "Chapter management",
    workflow: ["Review health", "Open analytics", "Assign leaders", "Audit activity"]
  },
  adminChapterAnalytics: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Chapter analytics dashboard for membership growth, activity, events, opportunities, and governance health.",
    eyebrow: "Chapter analytics",
    highlights: [
      {
        body: "Metrics are grouped for chapter leaders and platform admins.",
        meta: "Analytics",
        title: "Health dashboard"
      },
      {
        body: "Uses fixture data until analytics aggregation jobs and events exist.",
        meta: "Backend needed",
        title: "Data pipeline pending"
      },
      {
        body: "Designed for quick scanning and repeated operational use.",
        meta: "Admin-grade",
        title: "Dense and practical"
      }
    ],
    metrics: [
      { label: "Members", value: "1,284" },
      { label: "Active month", value: "72%" },
      { label: "Events", value: "9" }
    ],
    primaryAction: { disabled: true, label: "Export analytics" },
    requiresAdmin: true,
    route: "/admin/chapters/[chapterId]/analytics",
    sourceExports: ["chapter_analytics_dashboard"],
    table: {
      headers: ["Metric", "Current", "Trend"],
      rows: [
        ["New members", "84", "+12%"],
        ["Event RSVPs", "486", "+8%"],
        ["Open reports", "3", "-2"]
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
