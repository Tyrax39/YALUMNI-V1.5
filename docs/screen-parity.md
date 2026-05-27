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
| `admin_election_console` | `/admin/elections/[electionId]` | route-complete prototype | fixture | not implemented | Admin election operations shell with fixture controls. |
| `admin_verification_queue` | `/admin/verification` | live route | live API | implemented | Wraps the live verification queue. |
| `agenda_speaker_planner` | `/events/[eventId]/agenda` | live route | live API | implemented | Agenda and speaker planner route backed by event agenda records. |
| `alumni_directory` | `/directory` | live route | live API | implemented | Uses current member directory API plus the member-only MWF Alumni cache tab. |
| `alumni_directory_mobile` | `/directory` | responsive reference | live API | implemented | Mobile behavior folded into canonical directory including YALUMNI/MWF tabs. |
| `alumni_verification` | `/verification` | live route | live API | implemented | Uses current member verification APIs. |
| `annual_gathering_hub` | `/events/[eventId]` | live route | live API | implemented | Event detail and gathering hub backed by live event records. |
| `ballot_privacy_integrity_controls` | `/admin/elections/[electionId]/privacy` | route-complete prototype | fixture | not implemented | Ballot privacy and integrity controls. |
| `candidate_review_queue` | `/admin/elections/[electionId]/candidates` | route-complete prototype | fixture | not implemented | Candidate review queue. |
| `chapter_analytics_dashboard` | `/admin/chapters/[chapterId]/analytics` | route-complete prototype | fixture | not implemented | Chapter analytics shell. |
| `chapter_leader_dashboard` | `/communities/[communityId]/dashboard` | route-complete prototype | fixture | partially implemented | Community backend exists; leader dashboard is fixture-enhanced. |
| `complete_your_profile` | `/profile/setup` | live route | live API | implemented | Uses profile APIs. |
| `contribute_a_resource` | `/resources/new` | route-complete prototype | fixture | not implemented | Resource contribution form. |
| `contribute_to_campaign` | `/contributions/[campaignId]/pay` | route-complete prototype | fixture | not implemented | Contribution checkout shell, no real payments. |
| `contribution_campaign_detail` | `/contributions/[campaignId]` | route-complete prototype | fixture | not implemented | Contribution campaign detail. |
| `contribution_receipt` | `/contributions/receipts/[receiptId]` | route-complete prototype | fixture | not implemented | Receipt preview route. |
| `create_gathering_wizard` | `/events/new` | live route | live API | implemented | Event creation wizard publishes member events with optional agenda metadata. |
| `create_new_election_wizard` | `/admin/elections/new` | route-complete prototype | fixture | not implemented | Admin election creation wizard. |
| `direct_conversation` | `/messages/[conversationId]` | live route | live API | implemented | Wraps live direct messaging. |
| `direct_message_detail_desktop` | `/messages/[conversationId]` | responsive reference | live API | implemented | Desktop detail maps to the same route. |
| `election_admin_dashboard` | `/admin/elections` | route-complete prototype | fixture | not implemented | Admin election dashboard. |
| `election_audit_results_report` | `/admin/elections/[electionId]/audit` | route-complete prototype | fixture | not implemented | Admin audit report. |
| `election_hub` | `/elections` | route-complete prototype | fixture | not implemented | Member election hub. |
| `election_results_audit` | `/elections/[electionId]/results` | route-complete prototype | fixture | not implemented | Member results audit. |
| `election_voting_details` | `/elections/[electionId]/vote` | route-complete prototype | fixture | not implemented | Voting detail route with disabled cast action. |
| `find_a_mentor` | `/mentorship/find` | route-complete prototype | fixture | not implemented | Mentor discovery route. |
| `initiative_details` | `/initiatives/[initiativeId]` | live route | live API | implemented | Initiative detail route backed by live initiative and milestone records. |
| `initiative_hub` | `/initiatives` | live route | live API | implemented | Initiative hub backed by live initiative search and current-user initiatives. |
| `introduction_requests` | `/messages/introductions` | route-complete prototype | fixture | not implemented | Introduction request center. |
| `introduction_requests_desktop` | `/messages/introductions` | responsive reference | fixture | not implemented | Desktop reference for the same route. |
| `member_dashboard` | `/dashboard` | live route | live API | partially implemented | Existing dashboard remains the high-level hub. |
| `mentor_settings_profile` | `/mentorship/settings` | route-complete prototype | fixture | not implemented | Mentor settings route. |
| `messages_inbox` | `/messages` | live route | live API | implemented | Wraps live messaging APIs. |
| `messages_mobile` | `/messages` | responsive reference | live API | implemented | Mobile messaging reference. |
| `mobile_onboarding_flow` | `/onboarding` | code-native route | live API | partially implemented | Mirrors the mobile onboarding export, reads live profile and verification status, and links into live profile, affiliation, and verification routes. |
| `my_mentorships` | `/mentorship` | route-complete prototype | fixture | not implemented | Mentorship hub. |
| `new_message` | `/messages/new` | live route | live API | implemented | Live member search and conversation composer. |
| `opportunities_marketplace` | `/opportunities` | route-complete prototype | fixture | not implemented | Opportunities marketplace. |
| `opportunity_details` | `/opportunities/[opportunityId]` | route-complete prototype | fixture | not implemented | Opportunity detail. |
| `opportunity_moderation_queue` | `/admin/opportunities` | route-complete prototype | fixture | not implemented | Admin opportunity moderation. |
| `post_new_opportunity` | `/opportunities/new` | route-complete prototype | fixture | not implemented | Opportunity posting form. |
| `program_affiliation` | `/profile/program-affiliation` | live route | live API | implemented | Focused Step 2 program selection route uses the existing profile affiliation API. |
| `propose_new_initiative` | `/initiatives/new` | live route | live API | implemented | Initiative proposal form creates live member initiatives with optional first milestone. |
| `public_landing_page` | `/` | live route | live API | implemented | Existing code-native public landing. |
| `public_landing_page_mobile` | `/` | responsive reference | live API | implemented | Mobile landing reference. |
| `request_mentorship` | `/mentorship/request` | route-complete prototype | fixture | not implemented | Mentorship request form. |
| `resource_detail_view` | `/resources/[resourceId]` | route-complete prototype | fixture | not implemented | Resource detail. |
| `resource_library_hub` | `/resources` | route-complete prototype | fixture | not implemented | Resource library. |
| `resource_management_console` | `/admin/resources` | route-complete prototype | fixture | not implemented | Admin resource management. |
| `rsvp_attendee_management` | `/events/[eventId]/attendees` | live route | live API | implemented | RSVP and attendee management backed by event attendee records. |
| `share_your_impact_story` | `/success-stories/new` | route-complete prototype | fixture | not implemented | Impact story submission form. |
| `story_detail_empowering_agri_tech_in_zambia` | `/success-stories/[storyId]` | route-complete prototype | fixture | not implemented | Story detail. |
| `success_stories_hub` | `/success-stories` | route-complete prototype | fixture | not implemented | Success stories hub. |
| `success_stories_hub_mobile` | `/success-stories` | responsive reference | fixture | not implemented | Mobile success stories reference. |
| `success_story_moderation_queue` | `/admin/success-stories` | route-complete prototype | fixture | not implemented | Admin story moderation. |
| `treasurer_dashboard` | `/admin/treasury` | route-complete prototype | fixture | not implemented | Treasurer dashboard. |
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

- Implemented live modules: auth, profile, program affiliation, verification, directory, MWF alumni directory cache, communities, direct messages, notifications, admin overview, admin verification, admin moderation, audit log, notification digests, opportunities, resources, success stories, events, initiatives.
- Missing backend modules: mentorship, contributions/payments/receipts, elections/voter rolls/ballots/audits, chapter analytics, treasury.
- Current route parity status: frontend routes exist for all exported screens; data is live only where the backend already exists.
