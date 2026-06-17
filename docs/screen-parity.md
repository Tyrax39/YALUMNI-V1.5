# YALUMNI V1.5 Screen Parity Tracker

Source export root: `C:\xampp\htdocs\yalumni-v0\Yalumni_rebuild_docs\design\exports`

Audit date: 2026-05-08

## Summary

- Export directories found: 59
- Screen exports with `code.html` and `screen.png`: 58
- Design-system reference directory: 1
- Current implementation target: route parity for all 58 screen exports.
- Mobile exports are responsive references for the same canonical route, not separate public pages.
- Existing modules use live APIs where available. Future modules use fixture data with disabled write actions until backend slices exist.

## Coverage Table

| Export folder | Target route | Status | Data | Backend | Notes |
| --- | --- | --- | --- | --- | --- |
| `admin_election_console` | `/admin/elections/[electionId]` | live redirect | live API | implemented | Legacy member-app route now hands off to the separate live admin console election operations workflow. |
| `admin_verification_queue` | `/admin/verification` | live route | live API | implemented | Wraps the live verification queue. |
| `agenda_speaker_planner` | `/events/[eventId]/agenda` | live route | live API | implemented | Agenda and speaker planner route backed by event agenda records. |
| `alumni_directory` | `/directory` | live route | live API | implemented | Uses current member directory API plus the member-only MWF Alumni cache tab. |
| `alumni_directory_mobile` | `/directory` | responsive reference | live API | implemented | Mobile behavior folded into canonical directory including YALUMNI/MWF tabs. |
| `alumni_verification` | `/verification` | live route | live API | implemented | Focused Step 3 credentials submission screen uses current verification request and evidence APIs. |
| `annual_gathering_hub` | `/events/[eventId]` | live route | live API | implemented | Event detail and gathering hub backed by live event records. |
| `ballot_privacy_integrity_controls` | `/admin/elections/[electionId]/privacy` | route-complete prototype | fixture | not implemented | Ballot privacy and integrity controls. |
| `candidate_review_queue` | `/admin/elections/[electionId]/candidates` | live redirect | live API | implemented | Legacy member-app route now hands off to the separate live admin console candidate review workflow. |
| `chapter_analytics_dashboard` | `/admin/chapters/[chapterId]/analytics` | route-complete prototype | fixture | not implemented | Chapter analytics shell. |
| `chapter_leader_dashboard` | `/communities/[communityId]/dashboard` | live route | live API | partially implemented | Dedicated leader dashboard now uses live community, roster, invitation, post, and report APIs. |
| `complete_your_profile` | `/profile/setup` | live route | live API | implemented | Focused Step 4 setup screen uses current profile and photo APIs. |
| `contribute_a_resource` | `/resources/new` | live route | live API | implemented | Resource contribution form submits member resources into the moderation workflow. |
| `contribute_to_campaign` | `/contributions/[campaignId]/pay` | route-complete prototype | fixture | not implemented | Contribution checkout shell, no real payments. |
| `contribution_campaign_detail` | `/contributions/[campaignId]` | route-complete prototype | fixture | not implemented | Contribution campaign detail. |
| `contribution_receipt` | `/contributions/receipts/[receiptId]` | route-complete prototype | fixture | not implemented | Receipt preview route. |
| `create_gathering_wizard` | `/events/new` | live route | live API | implemented | Event creation wizard publishes member events with optional agenda metadata. |
| `create_new_election_wizard` | `/admin/elections/new` | live redirect | live API | implemented | Legacy member-app route now hands off to the separate live admin console election draft workflow. |
| `direct_conversation` | `/messages/[conversationId]` | live route | live API | implemented | Wraps live direct messaging. |
| `direct_message_detail_desktop` | `/messages/[conversationId]` | responsive reference | live API | implemented | Desktop detail maps to the same route. |
| `election_admin_dashboard` | `/admin/elections` | live redirect | live API | implemented | Legacy member-app route now hands off to the separate live admin console elections surface. |
| `election_audit_results_report` | `/admin/elections/[electionId]/audit` | live redirect | live API | implemented | Legacy member-app route now hands off to the separate live admin console election audit workflow. |
| `election_hub` | `/elections` | live route | live API | implemented | Member election hub uses the live election API with paginated load-more behavior. |
| `election_results_audit` | `/elections/[electionId]/results` | live route | live API | implemented | Member results route uses live election results and quorum data. |
| `election_voting_details` | `/elections/[electionId]/vote` | live route | live API | implemented | Voting route submits live eligible-voter ballots through the election API. |
| `find_a_mentor` | `/mentorship/find` | live route | live API | implemented | Mentor discovery route uses live mentor profiles, filters, and paginated load-more behavior. |
| `initiative_details` | `/initiatives/[initiativeId]` | live route | live API | implemented | Initiative detail route backed by live initiative and milestone records. |
| `initiative_hub` | `/initiatives` | live route | live API | implemented | Initiative hub backed by live initiative search and current-user initiatives. |
| `introduction_requests` | `/messages/introductions` | live route | live API | partially implemented | Introduction center now uses live member search and direct-message threads; dedicated request approval workflow remains future backend work. |
| `introduction_requests_desktop` | `/messages/introductions` | responsive reference | live API | partially implemented | Desktop reference folded into the same live introduction route. |
| `member_dashboard` | `/dashboard` | live route | live API | implemented | High-level member hub now includes live profile, verification, notifications, communities, community feed highlights, messages, events, initiatives, sessions, and 2FA context. |
| `mentor_settings_profile` | `/mentorship/settings` | live route | live API | implemented | Mentor settings route saves live mentor availability profiles. |
| `messages_inbox` | `/messages` | live route | live API | implemented | Wraps live messaging APIs. |
| `messages_mobile` | `/messages` | responsive reference | live API | implemented | Mobile messaging reference. |
| `mobile_onboarding_flow` | `/onboarding` | code-native route | live API | partially implemented | Mirrors the mobile onboarding export, reads live profile and verification status, and links into live profile, affiliation, and verification routes. |
| `my_mentorships` | `/mentorship` | live route | live API | implemented | Mentorship hub uses live mentor summary, incoming requests, outgoing requests, and recommended mentors. |
| `new_message` | `/messages/new` | live route | live API | implemented | Live member search and conversation composer. |
| `opportunities_marketplace` | `/opportunities` | live route | live API | implemented | Opportunities marketplace uses live API filters, member submissions, and paginated load-more behavior. |
| `opportunity_details` | `/opportunities/[opportunityId]` | live route | live API | implemented | Opportunity detail reads live opportunity records. |
| `opportunity_moderation_queue` | `/admin/opportunities` | live redirect | live API | implemented | Legacy member-app route now hands off to the separate live admin console moderation queue. |
| `post_new_opportunity` | `/opportunities/new` | live route | live API | implemented | Opportunity posting form submits member opportunities into the moderation workflow. |
| `program_affiliation` | `/profile/program-affiliation` | live route | live API | implemented | Focused Step 2 program selection route uses the existing profile affiliation API. |
| `propose_new_initiative` | `/initiatives/new` | live route | live API | implemented | Initiative proposal form creates live member initiatives with optional first milestone. |
| `public_landing_page` | `/` | live route | live API | implemented | Existing code-native public landing. |
| `public_landing_page_mobile` | `/` | responsive reference | live API | implemented | Mobile landing reference. |
| `request_mentorship` | `/mentorship/request` | live route | live API | implemented | Mentorship request form creates live pending mentorship requests. |
| `resource_detail_view` | `/resources/[resourceId]` | live route | live API | implemented | Resource detail reads live resource records. |
| `resource_library_hub` | `/resources` | live route | live API | implemented | Resource library uses live API filters, member submissions, and paginated load-more behavior. |
| `resource_management_console` | `/admin/resources` | live redirect | live API | implemented | Legacy member-app route now hands off to the separate live admin console moderation queue. |
| `rsvp_attendee_management` | `/events/[eventId]/attendees` | live route | live API | implemented | RSVP and attendee management backed by event attendee records. |
| `share_your_impact_story` | `/success-stories/new` | live route | live API | implemented | Impact story submission form submits stories into the moderation workflow. |
| `story_detail_empowering_agri_tech_in_zambia` | `/success-stories/[storyId]` | live route | live API | implemented | Story detail reads live success-story records. |
| `success_stories_hub` | `/success-stories` | live route | live API | implemented | Success stories hub uses live API filters, member submissions, and paginated load-more behavior. |
| `success_stories_hub_mobile` | `/success-stories` | responsive reference | live API | implemented | Mobile behavior is folded into the live success stories route. |
| `success_story_moderation_queue` | `/admin/success-stories` | live redirect | live API | implemented | Legacy member-app route now hands off to the separate live admin console moderation queue. |
| `treasurer_dashboard` | `/admin/treasury` | live redirect | live API | implemented | Legacy member-app route now hands off to the separate live admin console treasury surface. |
| `voter_roll_management` | `/admin/elections/[electionId]/voter-roll` | route-complete prototype | fixture | not implemented | Voter roll management. |
| `welcome_to_the_network` | `/verification/submitted` | code-native route | live API | implemented | Verification submitted screen reads live profile and verification status with first-action links into member routes. |

## Added Routes Beyond The Original List

These routes were necessary to map every export cleanly:

- `/communities`
- `/communities/[communityId]/dashboard`
- `/messages/introductions`
- `/verification/submitted`
- `/admin/elections/new`
- `/admin/elections/[electionId]`

## Current Backend Gap Summary

- Implemented live modules: auth, profile, program affiliation, verification, directory, MWF alumni directory cache, communities, direct messages, notifications, admin overview, admin verification, admin moderation, audit log, notification digests, opportunities, resources, success stories, events, initiatives, mentorship, member elections, and the separate admin-console election lifecycle/voter-roll tools.
- Missing backend modules: contributions/payments/receipts, chapter analytics, treasury, plus advanced election workflows such as nominations, signed/certified audit packets beyond the CSV export foundation, chapter/cohort voter-roll imports, richer candidate nomination states beyond draft approve/reject, and dedicated admin detail subroutes beyond the consolidated admin-console panel.
- Current route parity status: frontend routes exist for all exported screens; data is live only where the backend already exists.
