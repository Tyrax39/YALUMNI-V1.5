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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "candidate_review_queue",
    notes: "Candidate review queue for future elections backend.",
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
    notes: "Community detail APIs exist; dedicated leader dashboard is fixture-enhanced.",
    route: "/communities/[communityId]/dashboard",
    status: "route-complete prototype"
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "contribute_a_resource",
    notes: "Resource contribution form shell until resources backend lands.",
    route: "/resources/new",
    status: "route-complete prototype"
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "election_audit_results_report",
    notes: "Admin election audit report shell until election audit APIs land.",
    route: "/admin/elections/[electionId]/audit",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "election_hub",
    notes: "Member elections hub is route-complete with fixture election data.",
    route: "/elections",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "election_results_audit",
    notes: "Member-facing results and audit trail preview.",
    route: "/elections/[electionId]/results",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "election_voting_details",
    notes: "Voting detail route is present with ballot actions disabled.",
    route: "/elections/[electionId]/vote",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "find_a_mentor",
    notes: "Mentor discovery surface with fixture mentor cards.",
    route: "/mentorship/find",
    status: "route-complete prototype"
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "mentor_settings_profile",
    notes: "Mentor settings profile is route-complete with disabled save.",
    route: "/mentorship/settings",
    status: "route-complete prototype"
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "my_mentorships",
    notes: "Mentorship hub with fixture active relationships.",
    route: "/mentorship",
    status: "route-complete prototype"
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "opportunities_marketplace",
    notes: "Opportunities marketplace uses fixture opportunity listings.",
    route: "/opportunities",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "opportunity_details",
    notes: "Opportunity detail route uses fixture deadline and application data.",
    route: "/opportunities/[opportunityId]",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "opportunity_moderation_queue",
    notes: "Admin opportunity moderation queue is fixture-backed.",
    route: "/admin/opportunities",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "post_new_opportunity",
    notes: "Opportunity posting form is present with disabled submit.",
    route: "/opportunities/new",
    status: "route-complete prototype"
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "request_mentorship",
    notes: "Mentorship request flow is present with disabled submit.",
    route: "/mentorship/request",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "resource_detail_view",
    notes: "Resource detail route uses fixture resource metadata.",
    route: "/resources/[resourceId]",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "resource_library_hub",
    notes: "Resource library hub uses fixture categories and resources.",
    route: "/resources",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "resource_management_console",
    notes: "Admin resource management queue is fixture-backed.",
    route: "/admin/resources",
    status: "route-complete prototype"
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "share_your_impact_story",
    notes: "Impact story submission form is present with disabled submit.",
    route: "/success-stories/new",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "story_detail_empowering_agri_tech_in_zambia",
    notes: "Story detail route uses fixture impact story data.",
    route: "/success-stories/[storyId]",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "success_stories_hub",
    notes: "Success stories hub uses fixture stories and filters.",
    route: "/success-stories",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "success_stories_hub_mobile",
    notes: "Mobile success stories export is a responsive reference.",
    route: "/success-stories",
    status: "responsive reference"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "success_story_moderation_queue",
    notes: "Admin story moderation queue is fixture-backed.",
    route: "/admin/success-stories",
    status: "route-complete prototype"
  },
  {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    exportFolder: "treasurer_dashboard",
    notes: "Treasurer dashboard uses fixture campaign and ledger data.",
    route: "/admin/treasury",
    status: "route-complete prototype"
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
    dataSource: "fixture",
    description:
      "A leader console for chapter managers that organizes member activity, pending approvals, invitations, posts, and governance actions.",
    eyebrow: "Chapter leadership",
    highlights: [
      {
        body: "Track pending memberships, open reports, and invitation performance.",
        meta: "Control",
        title: "Manager command center"
      },
      {
        body: "Route links back to the live community detail surface for current posts and members.",
        meta: "Live link",
        title: "Uses current community modules"
      },
      {
        body: "Adds room for future analytics, events, and chapter governance.",
        meta: "Next",
        title: "Prepared for expansion"
      }
    ],
    metrics: [
      { label: "Pending members", value: "14" },
      { label: "Open reports", value: "3" },
      { label: "Invites sent", value: "28" }
    ],
    primaryAction: { href: "/communities/demo-community", label: "Open live community" },
    route: "/communities/[communityId]/dashboard",
    sourceExports: ["chapter_leader_dashboard"],
    table: {
      headers: ["Queue", "Current load", "Action"],
      rows: [
        ["Membership approvals", "14 pending", "Review profiles"],
        ["Post reports", "3 open", "Moderate content"],
        ["Invitations", "28 active", "Track acceptance"]
      ]
    },
    title: "Chapter leader dashboard",
    workflow: ["Review member requests", "Publish chapter update", "Moderate posts", "Prepare event"]
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "The mentorship workspace for active mentorships, requests, introductions, and mentor availability.",
    eyebrow: "Mentorship",
    highlights: [
      {
        body: "Track active matches, pending requests, and introduction follow-ups.",
        meta: "Relationships",
        title: "Mentorship pipeline"
      },
      {
        body: "Discovery, request, and settings routes are all available for design review.",
        meta: "Route parity",
        title: "Complete surface"
      },
      {
        body: "Matching, request state, and messaging handoffs need backend implementation.",
        meta: "Future",
        title: "Backend required"
      }
    ],
    metrics: [
      { label: "Active", value: "3" },
      { label: "Pending", value: "5" },
      { label: "Open mentors", value: "42" }
    ],
    primaryAction: { href: "/mentorship/find", label: "Find a mentor" },
    route: "/mentorship",
    secondaryAction: { href: "/mentorship/settings", label: "Mentor settings" },
    sourceExports: ["my_mentorships"],
    table: {
      headers: ["Match", "Focus", "Status"],
      rows: [
        ["Amina and Chidi", "Social enterprise", "active"],
        ["Jean and Fatou", "Public health", "pending"],
        ["Lebo and Grace", "Civic data", "active"]
      ]
    },
    title: "My mentorships",
    workflow: ["Find mentor", "Request introduction", "Confirm match", "Track sessions"]
  },
  mentorshipFind: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Mentor discovery surface with availability, sectors, languages, and mentoring strengths.",
    eyebrow: "Find a mentor",
    highlights: [
      {
        body: "Search and filter mentors by sector, region, language, and support type.",
        meta: "Discovery",
        title: "Mentor marketplace"
      },
      {
        body: "Request actions are disabled until matching APIs are built.",
        meta: "Safe",
        title: "No fake requests"
      },
      {
        body: "Profile cards mirror the exported mentor finder structure.",
        meta: "Parity",
        title: "Responsive cards"
      }
    ],
    metrics: [
      { label: "Mentors", value: "42" },
      { label: "Sectors", value: "9" },
      { label: "Languages", value: "6" }
    ],
    primaryAction: { href: "/mentorship/request", label: "Request mentorship" },
    route: "/mentorship/find",
    sourceExports: ["find_a_mentor"],
    table: {
      headers: ["Mentor", "Sector", "Availability"],
      rows: [
        ["Nadia Okeke", "Agritech", "2 slots"],
        ["Samuel Mensah", "Governance", "1 slot"],
        ["Aline Uwase", "Entrepreneurship", "waitlist"]
      ]
    },
    title: "Find a mentor",
    workflow: ["Filter mentors", "Review profile", "Request introduction", "Confirm terms"]
  },
  mentorshipRequest: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Mentorship request form for goals, expectations, availability, and preferred mentor attributes.",
    eyebrow: "Request mentorship",
    highlights: [
      {
        body: "Captures goals, timeline, focus area, and communication preferences.",
        meta: "Form",
        title: "Request intake"
      },
      {
        body: "Submit is disabled until request persistence and notification workflows exist.",
        meta: "Backend needed",
        title: "Safe prototype"
      },
      {
        body: "Designed to hand off into direct messaging once a request is accepted.",
        meta: "Messaging",
        title: "Future handoff"
      }
    ],
    metrics: [
      { label: "Fields", value: "8" },
      { label: "Matching", value: "planned" },
      { label: "Submit", value: "disabled" }
    ],
    primaryAction: { disabled: true, label: "Send request" },
    route: "/mentorship/request",
    sourceExports: ["request_mentorship"],
    table: {
      headers: ["Section", "Purpose", "Status"],
      rows: [
        ["Goals", "Define outcomes", "ready"],
        ["Availability", "Session cadence", "ready"],
        ["Matching", "Preferred mentor", "backend needed"]
      ]
    },
    title: "Request mentorship",
    workflow: ["Describe goals", "Set cadence", "Pick mentor fit", "Submit"]
  },
  mentorshipSettings: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Mentor availability and profile settings for members who want to support others.",
    eyebrow: "Mentor settings",
    highlights: [
      {
        body: "Control mentor availability, preferred sectors, language, and capacity.",
        meta: "Settings",
        title: "Availability controls"
      },
      {
        body: "Settings stay local to the prototype until mentorship profile APIs land.",
        meta: "Backend needed",
        title: "Persistence pending"
      },
      {
        body: "Designed for future discovery ranking and request matching.",
        meta: "Matching",
        title: "Search-ready profile"
      }
    ],
    metrics: [
      { label: "Capacity", value: "2 slots" },
      { label: "Visibility", value: "members" },
      { label: "Save", value: "disabled" }
    ],
    primaryAction: { disabled: true, label: "Save mentor profile" },
    route: "/mentorship/settings",
    sourceExports: ["mentor_settings_profile"],
    table: {
      headers: ["Setting", "Current", "Status"],
      rows: [
        ["Accepting requests", "yes", "prototype"],
        ["Focus sectors", "Agritech, governance", "prototype"],
        ["Monthly capacity", "2 mentees", "prototype"]
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Member election hub for active ballots, candidate information, voting details, and results/audit reports.",
    eyebrow: "Elections",
    highlights: [
      {
        body: "Members can see active, upcoming, and closed elections.",
        meta: "Governance",
        title: "Election discovery"
      },
      {
        body: "Voting and results routes exist for design and route QA.",
        meta: "Route parity",
        title: "Full member surface"
      },
      {
        body: "Ballot casting, voter rolls, and audit ledgers require backend work.",
        meta: "Backend needed",
        title: "Fixture election data"
      }
    ],
    metrics: [
      { label: "Active elections", value: "2" },
      { label: "Eligible voters", value: "3.8k" },
      { label: "Turnout", value: "61%" }
    ],
    primaryAction: { href: "/elections/chapter-council-2026/vote", label: "View ballot" },
    route: "/elections",
    sourceExports: ["election_hub"],
    table: {
      headers: ["Election", "Window", "Status"],
      rows: [
        ["Chapter council 2026", "May 18-22", "active"],
        ["Treasurer by-election", "June 4-5", "upcoming"],
        ["Programs committee", "closed", "results ready"]
      ]
    },
    title: "Election hub",
    workflow: ["Check eligibility", "Review candidates", "Vote", "Review results"]
  },
  electionDetail: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Election overview with eligibility, candidate summary, voting window, and governance rules.",
    eyebrow: "Election detail",
    highlights: [
      {
        body: "Central route links members to voting and results once each phase opens.",
        meta: "Governance",
        title: "Election overview"
      },
      {
        body: "Eligibility and privacy copy are visible now for policy review.",
        meta: "Trust",
        title: "Rules surfaced"
      },
      {
        body: "Backend election state and ballots are pending.",
        meta: "Backend needed",
        title: "Prototype data"
      }
    ],
    metrics: [
      { label: "Candidates", value: "8" },
      { label: "Window", value: "5 days" },
      { label: "Status", value: "active" }
    ],
    primaryAction: { href: "/elections/chapter-council-2026/vote", label: "Open voting details" },
    route: "/elections/[electionId]",
    secondaryAction: { href: "/elections/chapter-council-2026/results", label: "Results audit" },
    sourceExports: ["election_hub"],
    table: {
      headers: ["Rule", "Detail", "Status"],
      rows: [
        ["Eligibility", "Verified members only", "planned"],
        ["Ballot privacy", "Anonymous ballot ledger", "planned"],
        ["Audit", "Results report after close", "prototype"]
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Voting details route with ballot instructions, candidates, integrity copy, and disabled cast-vote action.",
    eyebrow: "Voting",
    highlights: [
      {
        body: "Candidate choices and privacy assurances are shown as code-native UI.",
        meta: "Ballot",
        title: "Vote detail"
      },
      {
        body: "Vote submission is disabled until secure ballot APIs are built.",
        meta: "Security",
        title: "No fake voting"
      },
      {
        body: "Designed to connect to admin privacy and voter roll controls.",
        meta: "Audit",
        title: "Integrity-aware"
      }
    ],
    metrics: [
      { label: "Candidates", value: "8" },
      { label: "Eligible", value: "3.8k" },
      { label: "Vote", value: "disabled" }
    ],
    primaryAction: { disabled: true, label: "Cast vote" },
    route: "/elections/[electionId]/vote",
    sourceExports: ["election_voting_details"],
    table: {
      headers: ["Candidate", "Region", "Status"],
      rows: [
        ["Amina Mensah", "West Africa", "approved"],
        ["Jean Niyonzima", "East Africa", "approved"],
        ["Thandi Dlamini", "Southern Africa", "approved"]
      ]
    },
    title: "Election voting details",
    workflow: ["Confirm eligibility", "Review candidates", "Select candidate", "Cast secure vote"]
  },
  electionResults: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Member-facing election results and audit route with turnout, winner summary, and audit notes.",
    eyebrow: "Results audit",
    highlights: [
      {
        body: "Results are separated from vote casting and include integrity context.",
        meta: "Transparency",
        title: "Audit-first results"
      },
      {
        body: "Designed to connect with admin audit report and ballot controls.",
        meta: "Governance",
        title: "Cross-linked"
      },
      {
        body: "Numbers are fixture-only until election ledger APIs exist.",
        meta: "Fixture",
        title: "No real tally"
      }
    ],
    metrics: [
      { label: "Turnout", value: "61%" },
      { label: "Ballots", value: "2,318" },
      { label: "Audit status", value: "clean" }
    ],
    primaryAction: { href: "/admin/elections/chapter-council-2026/audit", label: "Admin audit report" },
    route: "/elections/[electionId]/results",
    sourceExports: ["election_results_audit"],
    table: {
      headers: ["Candidate", "Votes", "Share"],
      rows: [
        ["Amina Mensah", "1,046", "45.1%"],
        ["Jean Niyonzima", "876", "37.8%"],
        ["Thandi Dlamini", "396", "17.1%"]
      ]
    },
    title: "Election results audit",
    workflow: ["Close polls", "Tally ballots", "Publish results", "Audit report"]
  },
  adminOpportunities: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Admin moderation queue for submitted opportunities, partner listings, deadlines, and trust review.",
    eyebrow: "Admin opportunities",
    highlights: [
      {
        body: "Queue includes pending, approved, rejected, and expired opportunity states.",
        meta: "Moderation",
        title: "Listing review"
      },
      {
        body: "Decision actions are disabled until opportunity moderation APIs exist.",
        meta: "Backend needed",
        title: "Safe admin prototype"
      },
      {
        body: "Designed to connect to the public member marketplace.",
        meta: "Publishing",
        title: "Workflow-ready"
      }
    ],
    metrics: [
      { label: "Pending", value: "11" },
      { label: "Approved", value: "36" },
      { label: "Expired", value: "4" }
    ],
    primaryAction: { disabled: true, label: "Approve selected" },
    requiresAdmin: true,
    route: "/admin/opportunities",
    sourceExports: ["opportunity_moderation_queue"],
    table: {
      headers: ["Listing", "Sponsor", "Status"],
      rows: [
        ["Civic innovation grant", "Partner org", "pending"],
        ["Climate fellowship", "Regional hub", "approved"],
        ["Program manager role", "Chapter partner", "pending"]
      ]
    },
    title: "Opportunity moderation queue",
    workflow: ["Review listing", "Check sponsor", "Approve or reject", "Publish"]
  },
  adminResources: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Admin resource management console for submitted resources, review notes, categories, and publishing state.",
    eyebrow: "Admin resources",
    highlights: [
      {
        body: "Queue resources by submitted, approved, needs changes, and archived states.",
        meta: "Content ops",
        title: "Resource review"
      },
      {
        body: "Approvals and file checks are disabled until resource APIs exist.",
        meta: "Backend needed",
        title: "Safe controls"
      },
      {
        body: "Designed to publish into the member resource library.",
        meta: "Library",
        title: "Publishing path"
      }
    ],
    metrics: [
      { label: "Pending", value: "9" },
      { label: "Approved", value: "128" },
      { label: "Needs changes", value: "3" }
    ],
    primaryAction: { disabled: true, label: "Publish resource" },
    requiresAdmin: true,
    route: "/admin/resources",
    sourceExports: ["resource_management_console"],
    table: {
      headers: ["Resource", "Contributor", "Status"],
      rows: [
        ["Grant proposal toolkit", "Ghana chapter", "pending"],
        ["Mentorship playbook", "Rwanda chapter", "approved"],
        ["Event checklist", "Kenya chapter", "needs changes"]
      ]
    },
    title: "Resource management console",
    workflow: ["Review submission", "Check metadata", "Approve", "Publish"]
  },
  adminSuccessStories: {
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Editorial moderation queue for submitted success stories, evidence, media rights, and publishing status.",
    eyebrow: "Admin stories",
    highlights: [
      {
        body: "Queue supports editorial review, evidence checks, and publication decisions.",
        meta: "Editorial",
        title: "Story moderation"
      },
      {
        body: "Publishing actions are disabled until story backend and media storage exist.",
        meta: "Backend needed",
        title: "Safe prototype"
      },
      {
        body: "Designed to connect directly to the success stories hub.",
        meta: "Publishing",
        title: "Impact storytelling"
      }
    ],
    metrics: [
      { label: "Pending", value: "6" },
      { label: "Approved", value: "54" },
      { label: "Needs edits", value: "4" }
    ],
    primaryAction: { disabled: true, label: "Approve story" },
    requiresAdmin: true,
    route: "/admin/success-stories",
    sourceExports: ["success_story_moderation_queue"],
    table: {
      headers: ["Story", "Country", "Status"],
      rows: [
        ["Agri-tech in Zambia", "Zambia", "pending media"],
        ["Girls in STEM bootcamp", "Nigeria", "needs edits"],
        ["Open budget fellows", "Kenya", "approved"]
      ]
    },
    title: "Success story moderation queue",
    workflow: ["Review narrative", "Check evidence", "Edit copy", "Publish"]
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
    backendDependencyStatus: "not implemented",
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
        body: "Decision actions remain disabled while election APIs are pending.",
        meta: "Backend needed",
        title: "Safe review"
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
    primaryAction: { disabled: true, label: "Approve candidate" },
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
    backendDependencyStatus: "not implemented",
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
        body: "Export and publish controls are disabled until audit records exist.",
        meta: "Backend needed",
        title: "Safe report"
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
    primaryAction: { disabled: true, label: "Publish audit report" },
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
    backendDependencyStatus: "not implemented",
    dataSource: "fixture",
    description:
      "Treasurer dashboard for campaign funding, ledger entries, receipts, allocations, and audit review.",
    eyebrow: "Treasury",
    highlights: [
      {
        body: "Summarizes campaign totals, receipt coverage, allocations, and exceptions.",
        meta: "Finance",
        title: "Transparent treasury"
      },
      {
        body: "Ledger, payment provider, and receipt APIs are future backend slices.",
        meta: "Backend needed",
        title: "Fixture finance data"
      },
      {
        body: "Designed for finance admins and super admins only.",
        meta: "Admin",
        title: "Permission-gated"
      }
    ],
    metrics: [
      { label: "Raised", value: "$42k" },
      { label: "Receipts", value: "312" },
      { label: "Exceptions", value: "2" }
    ],
    primaryAction: { disabled: true, label: "Export ledger" },
    requiresAdmin: true,
    route: "/admin/treasury",
    sourceExports: ["treasurer_dashboard"],
    table: {
      headers: ["Ledger item", "Amount", "Status"],
      rows: [
        ["Innovation fund receipts", "$18,400", "matched"],
        ["Scholarship allocation", "$9,200", "pending approval"],
        ["Microgrant reserve", "$14,100", "matched"]
      ]
    },
    title: "Treasurer dashboard",
    workflow: ["Review campaigns", "Match receipts", "Approve allocation", "Export audit"]
  }
} satisfies Record<string, FeatureScreenConfig>;

export type FeatureScreenKey = keyof typeof featureScreens;
