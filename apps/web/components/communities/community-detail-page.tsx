"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import {
  ArrowLeft,
  Ban,
  Crown,
  LogIn,
  LogOut,
  MailPlus,
  MapPin,
  MessageSquare,
  Save,
  Send,
  Settings,
  ShieldCheck,
  ShieldMinus,
  ShieldPlus,
  Trash2,
  UserMinus,
  Users,
  X
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  ApiError,
  approveCommunityMember,
  adminRoles,
  cancelCommunityInvitation,
  Community,
  CommunityInvitation,
  CommunityInvitationListResponse,
  CommunityMember,
  CommunityMemberListResponse,
  CommunityPost,
  CommunityPostListResponse,
  createCommunityInvitation,
  createCommunityPost,
  getCommunity,
  joinCommunity,
  leaveCommunity,
  listCommunityInvitations,
  listCommunityMembers,
  listCommunityPosts,
  rejectCommunityMember,
  removeCommunityMember,
  removeCommunityPost,
  transferCommunityOwnership,
  updateCommunity,
  CommunityUpdatePayload,
  updateCommunityMemberRole
} from "@/lib/api";
import { ProtectedRoute } from "@/components/auth/protected-route";

type CommunityDetailPageProps = {
  communityId: string;
};

type DetailState =
  | { status: "loading" }
  | {
      community: Community;
      invitations: CommunityInvitationListResponse | null;
      members: CommunityMemberListResponse;
      posts: CommunityPostListResponse | null;
      status: "ready";
      pendingMembers: CommunityMemberListResponse | null;
    }
  | { status: "error"; message: string };

const rosterPageSize = 12;
const pendingPageSize = 6;
const invitationPageSize = 6;
const postPageSize = 5;
const communityTypeOptions = [
  "COUNTRY_CHAPTER",
  "CITY_CHAPTER",
  "PROGRAM_COHORT",
  "SECTOR_GROUP",
  "WORKING_GROUP"
];
const visibilityOptions = ["MEMBER_ONLY", "PRIVATE"];
const joinPolicyOptions = ["OPEN", "REQUEST"];

type CommunitySettingsForm = {
  city: string;
  cohort_year: string;
  community_type: string;
  country: string;
  description: string;
  join_policy: string;
  name: string;
  program_name: string;
  sector: string;
  visibility: string;
};

export function CommunityDetailPage({ communityId }: CommunityDetailPageProps) {
  return (
    <main className="min-h-screen bg-surface">
      <ProtectedRoute
        description="Community spaces are available to signed-in YALUMNI members."
        title="Community"
      >
        {({ accessToken, user }) => (
          <CommunityDetailContent
            accessToken={accessToken}
            communityId={communityId}
            userId={user.id}
            userRoles={user.roles}
          />
        )}
      </ProtectedRoute>
    </main>
  );
}

function CommunityDetailContent({
  accessToken,
  communityId,
  userId,
  userRoles
}: {
  accessToken: string;
  communityId: string;
  userId: string;
  userRoles: string[];
}) {
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [busyMemberAction, setBusyMemberAction] = useState<
    "ownership" | "remove" | "review" | "role" | null
  >(null);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<CommunitySettingsForm>(
    createEmptySettingsForm
  );
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MANAGER" | "MEMBER">("MEMBER");
  const [latestInvitation, setLatestInvitation] = useState<CommunityInvitation | null>(null);
  const [postBody, setPostBody] = useState("");
  const [isPostSubmitting, setIsPostSubmitting] = useState(false);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    loadDetail(0, 0, 0, 0)
      .then((nextState) => {
        if (isMounted) {
          setState(nextState);
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message:
              caught instanceof ApiError ? caught.message : "Community could not be loaded.",
            status: "error"
          });
        }
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, communityId]);

  async function loadDetail(
    activeOffset: number,
    pendingOffset: number,
    invitationOffset: number,
    postOffset: number
  ): Promise<DetailState> {
    const [community, members] = await Promise.all([
      getCommunity(accessToken, communityId),
      listCommunityMembers(accessToken, communityId, {
        limit: rosterPageSize,
        offset: activeOffset,
        status: "ACTIVE"
      })
    ]);
    const canManage = canManageCommunity(userRoles, community);
    const canReadPosts = canAccessCommunityPosts(userRoles, community);
    const [pendingMembers, invitations, posts] = await Promise.all([
      canManage
        ? listCommunityMembers(accessToken, communityId, {
            limit: pendingPageSize,
            offset: pendingOffset,
            status: "PENDING"
          })
        : Promise.resolve(null),
      canManage
        ? listCommunityInvitations(accessToken, communityId, {
            limit: invitationPageSize,
            offset: invitationOffset,
            status: "PENDING"
          })
        : Promise.resolve(null),
      canReadPosts
        ? listCommunityPosts(accessToken, communityId, {
            limit: postPageSize,
            offset: postOffset,
            status: "ACTIVE"
          })
        : Promise.resolve(null)
    ]);
    return { community, invitations, members, pendingMembers, posts, status: "ready" };
  }

  async function refresh(
    activeOffset = state.status === "ready" ? state.members.offset : 0,
    pendingOffset = state.status === "ready" ? state.pendingMembers?.offset ?? 0 : 0,
    invitationOffset = state.status === "ready" ? state.invitations?.offset ?? 0 : 0,
    postOffset = state.status === "ready" ? state.posts?.offset ?? 0 : 0
  ) {
    setState(await loadDetail(activeOffset, pendingOffset, invitationOffset, postOffset));
  }

  function handleStartSettingsEdit(community: Community) {
    setMessage(null);
    setActionError(null);
    setSettingsForm(createSettingsForm(community));
    setIsEditingSettings(true);
  }

  function handleSettingsChange(field: keyof CommunitySettingsForm, value: string) {
    setSettingsForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== "ready") {
      return;
    }

    const payload = buildCommunitySettingsPayload(settingsForm);
    if (!payload.name) {
      setActionError("Community name is required.");
      return;
    }
    if (settingsForm.cohort_year.trim() && payload.cohort_year === null) {
      setActionError("Cohort year must be a valid number.");
      return;
    }

    setMessage(null);
    setActionError(null);
    setIsSavingSettings(true);
    try {
      const updatedCommunity = await updateCommunity(accessToken, communityId, payload);
      setMessage(`${updatedCommunity.name} settings saved.`);
      setIsEditingSettings(false);
      await refresh();
    } catch (caught) {
      setActionError(
        caught instanceof ApiError ? caught.message : "Community settings could not be saved."
      );
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handleCreateInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setActionError(null);
    setIsSubmitting(true);
    try {
      const invitation = await createCommunityInvitation(accessToken, communityId, {
        email: inviteEmail,
        role:
          state.status === "ready" && canEditCommunitySettings(userRoles, state.community)
            ? inviteRole
            : "MEMBER"
      });
      setInviteEmail("");
      setInviteRole("MEMBER");
      setLatestInvitation(invitation);
      setMessage(`${invitation.invited_email} invited as ${formatLabel(invitation.invited_role)}.`);
      await refresh();
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "Invitation could not be sent.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancelInvitation(invitation: CommunityInvitation) {
    setMessage(null);
    setActionError(null);
    setBusyMemberId(invitation.id);
    setBusyMemberAction("review");
    try {
      const canceledInvitation = await cancelCommunityInvitation(
        accessToken,
        communityId,
        invitation.id
      );
      setMessage(`${canceledInvitation.invited_email} invitation canceled.`);
      if (latestInvitation?.id === invitation.id) {
        setLatestInvitation(null);
      }
      await refresh();
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "Invitation could not be canceled.");
    } finally {
      setBusyMemberId(null);
      setBusyMemberAction(null);
    }
  }

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== "ready") {
      return;
    }

    const body = postBody.trim();
    if (!body) {
      setActionError("Post body is required.");
      return;
    }

    setMessage(null);
    setActionError(null);
    setIsPostSubmitting(true);
    try {
      await createCommunityPost(accessToken, communityId, { body });
      setPostBody("");
      setMessage("Post shared with the community.");
      await refresh(
        state.members.offset,
        state.pendingMembers?.offset ?? 0,
        state.invitations?.offset ?? 0,
        0
      );
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "Post could not be shared.");
    } finally {
      setIsPostSubmitting(false);
    }
  }

  async function handleRemovePost(post: CommunityPost) {
    setMessage(null);
    setActionError(null);
    setBusyPostId(post.id);
    try {
      await removeCommunityPost(accessToken, communityId, post.id);
      setMessage("Post removed from the active feed.");
      await refresh();
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "Post could not be removed.");
    } finally {
      setBusyPostId(null);
    }
  }

  async function handleJoin() {
    setMessage(null);
    setActionError(null);
    setIsSubmitting(true);
    try {
      const community = await joinCommunity(accessToken, communityId);
      setMessage(
        community.membership_status === "PENDING"
          ? `Join request sent for ${community.name}.`
          : `Joined ${community.name}.`
      );
      await refresh();
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "Join request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReview(member: CommunityMember, action: "approve" | "reject") {
    setMessage(null);
    setActionError(null);
    setBusyMemberId(member.id);
    setBusyMemberAction("review");
    try {
      const reviewedMember =
        action === "approve"
          ? await approveCommunityMember(accessToken, communityId, member.id)
          : await rejectCommunityMember(accessToken, communityId, member.id);
      setMessage(
        action === "approve"
          ? `${reviewedMember.display_name} approved.`
          : `${reviewedMember.display_name} rejected.`
      );
      await refresh();
    } catch (caught) {
      setActionError(
        caught instanceof ApiError ? caught.message : "Membership review failed."
      );
    } finally {
      setBusyMemberId(null);
      setBusyMemberAction(null);
    }
  }

  async function handleRoleUpdate(member: CommunityMember, role: "MANAGER" | "MEMBER") {
    setMessage(null);
    setActionError(null);
    setBusyMemberId(member.id);
    setBusyMemberAction("role");
    try {
      const updatedMember = await updateCommunityMemberRole(
        accessToken,
        communityId,
        member.id,
        role
      );
      setMessage(`${updatedMember.display_name} is now ${formatLabel(updatedMember.role)}.`);
      await refresh();
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "Member role update failed.");
    } finally {
      setBusyMemberId(null);
      setBusyMemberAction(null);
    }
  }

  async function handleOwnershipTransfer(member: CommunityMember) {
    setMessage(null);
    setActionError(null);
    setBusyMemberId(member.id);
    setBusyMemberAction("ownership");
    try {
      await transferCommunityOwnership(accessToken, communityId, {
        new_owner_membership_id: member.id
      });
      setMessage(`${member.display_name} is now the community owner.`);
      await refresh();
    } catch (caught) {
      setActionError(
        caught instanceof ApiError ? caught.message : "Ownership transfer failed."
      );
    } finally {
      setBusyMemberId(null);
      setBusyMemberAction(null);
    }
  }

  async function handleRemoveMember(member: CommunityMember) {
    setMessage(null);
    setActionError(null);
    setBusyMemberId(member.id);
    setBusyMemberAction("remove");
    try {
      const removedMember = await removeCommunityMember(accessToken, communityId, member.id);
      setMessage(`${removedMember.display_name} removed from this community.`);
      await refresh();
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "Member removal failed.");
    } finally {
      setBusyMemberId(null);
      setBusyMemberAction(null);
    }
  }

  async function handleLeave() {
    setMessage(null);
    setActionError(null);
    setIsSubmitting(true);
    try {
      const community = await leaveCommunity(accessToken, communityId);
      setMessage(`Left ${community.name}.`);
      await refresh();
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "Leave request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (state.status === "loading") {
    return (
      <CommunityShell>
        <p className="border-y border-border bg-white px-5 py-4 text-sm font-semibold text-muted">
          Loading community...
        </p>
      </CommunityShell>
    );
  }

  if (state.status === "error") {
    return (
      <CommunityShell>
        <div className="border-y border-red-200 bg-red-50 px-5 py-5">
          <p className="text-sm font-semibold text-red-700">{state.message}</p>
          <Link
            className="focus-ring mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#003d7d]"
            href="/dashboard"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
      </CommunityShell>
    );
  }

  const { community, invitations, members, pendingMembers, posts } = state;
  const activeMember = community.membership_status === "ACTIVE";
  const pendingMember = community.membership_status === "PENDING";
  const owner = community.membership_role === "OWNER";
  const location = [community.city, community.country].filter(Boolean).join(", ");
  const canManage = canManageCommunity(userRoles, community);
  const canEditSettings = canEditCommunitySettings(userRoles, community);
  const canInviteManagers = canEditCommunitySettings(userRoles, community);
  const canReadPosts = canAccessCommunityPosts(userRoles, community);

  return (
    <CommunityShell>
      <section className="border-b border-border bg-white pb-8">
        <Link
          className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
          href="/dashboard"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Dashboard
        </Link>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
              {formatLabel(community.community_type)}
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold text-ink sm:text-5xl">
              {community.name}
            </h1>
            {community.description ? (
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
                {community.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {activeMember ? (
              <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-ink">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 text-secondary" />
                {formatLabel(community.membership_role ?? "MEMBER")}
              </span>
            ) : null}
            {canEditSettings ? (
              <button
                className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
                onClick={() => handleStartSettingsEdit(community)}
                type="button"
              >
                <Settings aria-hidden="true" className="h-4 w-4" />
                Edit settings
              </button>
            ) : null}
            {activeMember ? (
              <button
                className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting || owner}
                onClick={handleLeave}
                type="button"
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
                {owner ? "Owner" : isSubmitting ? "Leaving..." : "Leave"}
              </button>
            ) : (
              <button
                className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting || pendingMember}
                onClick={handleJoin}
                type="button"
              >
                <LogIn aria-hidden="true" className="h-4 w-4" />
                {pendingMember ? "Pending" : isSubmitting ? "Joining..." : "Join"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <CommunityMetric
            icon={<Users aria-hidden="true" className="h-5 w-5" />}
            label="Members"
            value={String(community.member_count)}
          />
          <CommunityMetric
            icon={<MapPin aria-hidden="true" className="h-5 w-5" />}
            label="Location"
            value={location || "Network-wide"}
          />
          <CommunityMetric label="Focus" value={community.sector ?? community.program_name ?? "General"} />
          <CommunityMetric label="Join policy" value={formatLabel(community.join_policy)} />
        </div>
      </section>

      {message ? (
        <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {message}
        </p>
      ) : null}
      {actionError ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {actionError}
        </p>
      ) : null}

      {isEditingSettings ? (
        <CommunitySettingsPanel
          form={settingsForm}
          isSaving={isSavingSettings}
          onCancel={() => setIsEditingSettings(false)}
          onChange={handleSettingsChange}
          onSubmit={handleSettingsSubmit}
        />
      ) : null}

      <section className="mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
              Community feed
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
              Member updates
            </h2>
          </div>
          {posts ? (
            <p className="text-sm font-semibold text-muted">{posts.total} active posts</p>
          ) : null}
        </div>

        {canReadPosts && posts ? (
          <>
            <form
              className="mt-5 border-y border-border bg-white px-4 py-4 shadow-soft"
              onSubmit={handleCreatePost}
            >
              <label className="text-sm font-semibold text-ink">
                New post
                <textarea
                  className="focus-ring mt-2 min-h-28 w-full rounded-lg border border-border bg-surface px-3 py-3 text-sm leading-6 text-ink"
                  maxLength={2000}
                  onChange={(event) => setPostBody(event.target.value)}
                  required
                  value={postBody}
                />
              </label>
              <div className="mt-3 flex justify-end">
                <button
                  className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isPostSubmitting}
                  type="submit"
                >
                  <Send aria-hidden="true" className="h-4 w-4" />
                  {isPostSubmitting ? "Sharing..." : "Share post"}
                </button>
              </div>
            </form>

            <div className="mt-5 grid gap-3">
              {posts.posts.length === 0 ? (
                <p className="border-y border-border bg-white px-4 py-6 text-sm font-semibold text-muted">
                  No posts have been shared yet.
                </p>
              ) : null}
              {posts.posts.map((post) => (
                <article className="rounded-lg border border-border bg-white p-4 shadow-soft" key={post.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl font-semibold text-ink">
                        {post.author_display_name}
                      </h3>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                        {formatDate(post.created_at)}
                      </p>
                    </div>
                    <MessageSquare aria-hidden="true" className="h-5 w-5 text-secondary" />
                  </div>
                  <p className="mt-4 whitespace-pre-line text-sm leading-6 text-ink">
                    {post.body}
                  </p>
                  {canRemovePost(userRoles, community, post, userId) ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={busyPostId === post.id}
                        onClick={() => void handleRemovePost(post)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                        {busyPostId === post.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-3 border-y border-border bg-white px-4 py-3 text-sm font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
              <p>
                {posts.total === 0
                  ? "No posts"
                  : `Showing ${posts.offset + 1}-${posts.offset + posts.posts.length} of ${posts.total}`}
              </p>
              <div className="flex gap-2">
                <button
                  className="focus-ring min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={posts.offset === 0}
                  onClick={() =>
                    void refresh(
                      members.offset,
                      pendingMembers?.offset ?? 0,
                      invitations?.offset ?? 0,
                      Math.max(0, posts.offset - posts.limit)
                    )
                  }
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="focus-ring min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!posts.has_more}
                  onClick={() =>
                    void refresh(
                      members.offset,
                      pendingMembers?.offset ?? 0,
                      invitations?.offset ?? 0,
                      posts.offset + posts.limit
                    )
                  }
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-5 border-y border-border bg-white px-4 py-6 shadow-soft">
            <p className="text-sm font-semibold text-muted">
              Join this community to view and share member updates.
            </p>
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
              Member roster
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
              Active community members
            </h2>
          </div>
          <p className="text-sm font-semibold text-muted">{members.total} active members</p>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {members.members.length === 0 ? (
            <p className="border-y border-border bg-white px-4 py-6 text-sm font-semibold text-muted lg:col-span-2">
              No active members are listed yet.
            </p>
          ) : null}
          {members.members.map((member) => (
            <article className="rounded-lg border border-border bg-white p-4 shadow-soft" key={member.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-semibold text-ink">
                    {member.display_name}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-muted">{member.email}</p>
                </div>
                <span className="rounded-md bg-surface px-2.5 py-1 text-xs font-bold text-secondary">
                  {formatLabel(member.role)}
                </span>
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                {member.joined_at ? `Joined ${formatDate(member.joined_at)}` : "Pending join date"}
              </p>
              {canManageMember(userRoles, community, member) ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {canTransferOwnership(userRoles, community, member) ? (
                    <button
                      className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-secondary/40 px-3 text-sm font-semibold text-secondary transition hover:border-secondary hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={busyMemberId === member.id}
                      onClick={() => void handleOwnershipTransfer(member)}
                      type="button"
                    >
                      <Crown aria-hidden="true" className="h-4 w-4" />
                      {busyMemberId === member.id && busyMemberAction === "ownership"
                        ? "Transferring..."
                        : "Make owner"}
                    </button>
                  ) : null}
                  {member.role === "MANAGER" ? (
                    <button
                      className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={busyMemberId === member.id}
                      onClick={() => void handleRoleUpdate(member, "MEMBER")}
                      type="button"
                    >
                      <ShieldMinus aria-hidden="true" className="h-4 w-4" />
                      {busyMemberId === member.id && busyMemberAction === "role"
                        ? "Updating..."
                        : "Demote"}
                    </button>
                  ) : (
                    <button
                      className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={busyMemberId === member.id}
                      onClick={() => void handleRoleUpdate(member, "MANAGER")}
                      type="button"
                    >
                      <ShieldPlus aria-hidden="true" className="h-4 w-4" />
                      {busyMemberId === member.id && busyMemberAction === "role"
                        ? "Updating..."
                        : "Make manager"}
                    </button>
                  )}
                  <button
                    className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={busyMemberId === member.id}
                    onClick={() => void handleRemoveMember(member)}
                    type="button"
                  >
                    <UserMinus aria-hidden="true" className="h-4 w-4" />
                    {busyMemberId === member.id && busyMemberAction === "remove"
                      ? "Removing..."
                      : "Remove"}
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-3 border-y border-border bg-white px-4 py-3 text-sm font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            {members.total === 0
              ? "No members"
              : `Showing ${members.offset + 1}-${members.offset + members.members.length} of ${members.total}`}
          </p>
          <div className="flex gap-2">
            <button
              className="focus-ring min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={members.offset === 0}
              onClick={() => void refresh(Math.max(0, members.offset - members.limit))}
              type="button"
            >
              Previous
            </button>
            <button
              className="focus-ring min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!members.has_more}
              onClick={() => void refresh(members.offset + members.limit)}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {canManage && pendingMembers ? (
        <section className="mt-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
                Join requests
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
                Pending community members
              </h2>
            </div>
            <p className="text-sm font-semibold text-muted">
              {pendingMembers.total} pending requests
            </p>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {pendingMembers.members.length === 0 ? (
              <p className="border-y border-border bg-white px-4 py-6 text-sm font-semibold text-muted lg:col-span-2">
                No pending join requests.
              </p>
            ) : null}
            {pendingMembers.members.map((member) => (
              <article
                className="rounded-lg border border-border bg-white p-4 shadow-soft"
                key={member.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-ink">
                      {member.display_name}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-muted">{member.email}</p>
                  </div>
                  <span className="rounded-md bg-surface px-2.5 py-1 text-xs font-bold text-secondary">
                    Pending
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="focus-ring inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={busyMemberId === member.id}
                    onClick={() => void handleReview(member, "approve")}
                    type="button"
                  >
                    {busyMemberId === member.id && busyMemberAction === "review"
                      ? "Reviewing..."
                      : "Approve"}
                  </button>
                  <button
                    className="focus-ring inline-flex min-h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={busyMemberId === member.id}
                    onClick={() => void handleReview(member, "reject")}
                    type="button"
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3 border-y border-border bg-white px-4 py-3 text-sm font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              {pendingMembers.total === 0
                ? "No requests"
                : `Showing ${pendingMembers.offset + 1}-${pendingMembers.offset + pendingMembers.members.length} of ${pendingMembers.total}`}
            </p>
            <div className="flex gap-2">
              <button
                className="focus-ring min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={pendingMembers.offset === 0}
                onClick={() =>
                  void refresh(members.offset, Math.max(0, pendingMembers.offset - pendingMembers.limit))
                }
                type="button"
              >
                Previous
              </button>
              <button
                className="focus-ring min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!pendingMembers.has_more}
                onClick={() => void refresh(members.offset, pendingMembers.offset + pendingMembers.limit)}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {canManage && invitations ? (
        <section className="mt-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
                Invitations
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
                Invite members
              </h2>
            </div>
            <p className="text-sm font-semibold text-muted">
              {invitations.total} pending invitations
            </p>
          </div>
          <form
            className="mt-5 grid gap-3 border-y border-border bg-white px-4 py-4 shadow-soft md:grid-cols-[1fr_180px_auto]"
            onSubmit={handleCreateInvitation}
          >
            <label className="text-sm font-semibold text-ink">
              Email
              <input
                className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink"
                maxLength={320}
                onChange={(event) => setInviteEmail(event.target.value)}
                required
                type="email"
                value={inviteEmail}
              />
            </label>
            <label className="text-sm font-semibold text-ink">
              Role
              <select
                className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink disabled:opacity-65"
                disabled={!canInviteManagers}
                onChange={(event) => setInviteRole(event.target.value as "MANAGER" | "MEMBER")}
                value={canInviteManagers ? inviteRole : "MEMBER"}
              >
                <option value="MEMBER">Member</option>
                {canInviteManagers ? <option value="MANAGER">Manager</option> : null}
              </select>
            </label>
            <div className="flex items-end">
              <button
                className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                <MailPlus aria-hidden="true" className="h-4 w-4" />
                {isSubmitting ? "Inviting..." : "Invite"}
              </button>
            </div>
          </form>
          {latestInvitation?.dev_invitation_token ? (
            <div className="mt-4 border-y border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-800">
                Local invite link ready for {latestInvitation.invited_email}.
              </p>
              <Link
                className="focus-ring mt-2 inline-flex min-h-10 items-center rounded-lg border border-emerald-300 px-3 text-sm font-semibold text-emerald-800 transition hover:bg-white"
                href={`/communities/invitations/accept?token=${encodeURIComponent(
                  latestInvitation.dev_invitation_token
                )}`}
              >
                Open accept link
              </Link>
            </div>
          ) : null}
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {invitations.invitations.length === 0 ? (
              <p className="border-y border-border bg-white px-4 py-6 text-sm font-semibold text-muted lg:col-span-2">
                No pending invitations.
              </p>
            ) : null}
            {invitations.invitations.map((invitation) => (
              <article
                className="rounded-lg border border-border bg-white p-4 shadow-soft"
                key={invitation.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-ink">
                      {invitation.invited_email}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-muted">
                      Expires {formatDate(invitation.expires_at)}
                    </p>
                  </div>
                  <span className="rounded-md bg-surface px-2.5 py-1 text-xs font-bold text-secondary">
                    {formatLabel(invitation.invited_role)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={busyMemberId === invitation.id}
                    onClick={() => void handleCancelInvitation(invitation)}
                    type="button"
                  >
                    <Ban aria-hidden="true" className="h-4 w-4" />
                    {busyMemberId === invitation.id ? "Canceling..." : "Cancel"}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3 border-y border-border bg-white px-4 py-3 text-sm font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              {invitations.total === 0
                ? "No invitations"
                : `Showing ${invitations.offset + 1}-${invitations.offset + invitations.invitations.length} of ${invitations.total}`}
            </p>
            <div className="flex gap-2">
              <button
                className="focus-ring min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={invitations.offset === 0}
                onClick={() =>
                  void refresh(
                    members.offset,
                    pendingMembers?.offset ?? 0,
                    Math.max(0, invitations.offset - invitations.limit)
                  )
                }
                type="button"
              >
                Previous
              </button>
              <button
                className="focus-ring min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!invitations.has_more}
                onClick={() =>
                  void refresh(
                    members.offset,
                    pendingMembers?.offset ?? 0,
                    invitations.offset + invitations.limit
                  )
                }
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </CommunityShell>
  );
}

function CommunityShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link className="focus-ring rounded-lg" href="/">
            <Image
              alt="YALUMNI"
              className="block h-auto w-[132px] object-contain sm:w-[156px]"
              height={34}
              priority
              src="/brand/yalumni-logo-horizontal.svg"
              width={156}
            />
          </Link>
          <Link
            className="focus-ring rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            href="/dashboard"
          >
            Dashboard
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">{children}</div>
    </>
  );
}

function CommunityMetric({
  icon,
  label,
  value
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border-y border-border bg-white p-4">
      {icon ? <div className="flex items-center gap-2 text-secondary">{icon}</div> : null}
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-ink">{value}</p>
    </div>
  );
}

function CommunitySettingsPanel({
  form,
  isSaving,
  onCancel,
  onChange,
  onSubmit
}: {
  form: CommunitySettingsForm;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (field: keyof CommunitySettingsForm, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="mt-8 border-y border-border bg-white px-4 py-5 shadow-soft sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
            Community settings
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
            Edit chapter details
          </h2>
        </div>
        <button
          className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
          onClick={onCancel}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
          Close
        </button>
      </div>
      <form className="mt-5 grid gap-4 lg:grid-cols-2" onSubmit={onSubmit}>
        <label className="text-sm font-semibold text-ink">
          Name
          <input
            className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink"
            maxLength={140}
            minLength={2}
            onChange={(event) => onChange("name", event.target.value)}
            required
            type="text"
            value={form.name}
          />
        </label>
        <label className="text-sm font-semibold text-ink">
          Type
          <select
            className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink"
            onChange={(event) => onChange("community_type", event.target.value)}
            value={form.community_type}
          >
            {communityTypeOptions.map((option) => (
              <option key={option} value={option}>
                {formatLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-ink lg:col-span-2">
          Description
          <textarea
            className="focus-ring mt-2 min-h-28 w-full rounded-lg border border-border bg-surface px-3 py-3 text-sm leading-6 text-ink"
            maxLength={1200}
            onChange={(event) => onChange("description", event.target.value)}
            value={form.description}
          />
        </label>
        <label className="text-sm font-semibold text-ink">
          Country
          <input
            className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink"
            maxLength={80}
            onChange={(event) => onChange("country", event.target.value)}
            type="text"
            value={form.country}
          />
        </label>
        <label className="text-sm font-semibold text-ink">
          City
          <input
            className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink"
            maxLength={100}
            onChange={(event) => onChange("city", event.target.value)}
            type="text"
            value={form.city}
          />
        </label>
        <label className="text-sm font-semibold text-ink">
          Sector
          <input
            className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink"
            maxLength={120}
            onChange={(event) => onChange("sector", event.target.value)}
            type="text"
            value={form.sector}
          />
        </label>
        <label className="text-sm font-semibold text-ink">
          Program
          <input
            className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink"
            maxLength={120}
            onChange={(event) => onChange("program_name", event.target.value)}
            type="text"
            value={form.program_name}
          />
        </label>
        <label className="text-sm font-semibold text-ink">
          Cohort year
          <input
            className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink"
            max={2100}
            min={2000}
            onChange={(event) => onChange("cohort_year", event.target.value)}
            type="number"
            value={form.cohort_year}
          />
        </label>
        <label className="text-sm font-semibold text-ink">
          Visibility
          <select
            className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink"
            onChange={(event) => onChange("visibility", event.target.value)}
            value={form.visibility}
          >
            {visibilityOptions.map((option) => (
              <option key={option} value={option}>
                {formatLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-ink">
          Join policy
          <select
            className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink"
            onChange={(event) => onChange("join_policy", event.target.value)}
            value={form.join_policy}
          >
            {joinPolicyOptions.map((option) => (
              <option key={option} value={option}>
                {formatLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2 lg:col-span-2">
          <button
            className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save changes"}
          </button>
          <button
            className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function createEmptySettingsForm(): CommunitySettingsForm {
  return {
    city: "",
    cohort_year: "",
    community_type: "COUNTRY_CHAPTER",
    country: "",
    description: "",
    join_policy: "OPEN",
    name: "",
    program_name: "",
    sector: "",
    visibility: "MEMBER_ONLY"
  };
}

function createSettingsForm(community: Community): CommunitySettingsForm {
  return {
    city: community.city ?? "",
    cohort_year: community.cohort_year ? String(community.cohort_year) : "",
    community_type: community.community_type,
    country: community.country ?? "",
    description: community.description ?? "",
    join_policy: community.join_policy,
    name: community.name,
    program_name: community.program_name ?? "",
    sector: community.sector ?? "",
    visibility: community.visibility
  };
}

function buildCommunitySettingsPayload(
  form: CommunitySettingsForm
): CommunityUpdatePayload {
  const cohortYear = form.cohort_year.trim();
  const parsedCohortYear = cohortYear ? Number(cohortYear) : null;
  const validCohortYear =
    parsedCohortYear !== null && Number.isFinite(parsedCohortYear)
      ? parsedCohortYear
      : null;

  return {
    city: nullableText(form.city),
    cohort_year: validCohortYear,
    community_type: form.community_type,
    country: nullableText(form.country),
    description: nullableText(form.description),
    join_policy: form.join_policy,
    name: form.name.trim(),
    program_name: nullableText(form.program_name),
    sector: nullableText(form.sector),
    visibility: form.visibility
  };
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function canManageCommunity(userRoles: string[], community: Community): boolean {
  return (
    community.membership_role === "OWNER" ||
    community.membership_role === "MANAGER" ||
    userRoles.some((role) => adminRoles.includes(role))
  );
}

function canEditCommunitySettings(userRoles: string[], community: Community): boolean {
  return (
    community.membership_role === "OWNER" ||
    userRoles.some((role) => adminRoles.includes(role))
  );
}

function canAccessCommunityPosts(userRoles: string[], community: Community): boolean {
  return (
    community.membership_status === "ACTIVE" ||
    userRoles.some((role) => adminRoles.includes(role))
  );
}

function canManageMember(
  userRoles: string[],
  community: Community,
  member: CommunityMember
): boolean {
  if (member.role === "OWNER") {
    return false;
  }

  const isAdmin = userRoles.some((role) => adminRoles.includes(role));
  if (isAdmin || community.membership_role === "OWNER") {
    return true;
  }

  return community.membership_role === "MANAGER" && member.role === "MEMBER";
}

function canTransferOwnership(
  userRoles: string[],
  community: Community,
  member: CommunityMember
): boolean {
  return (
    member.status === "ACTIVE" &&
    member.role !== "OWNER" &&
    canEditCommunitySettings(userRoles, community)
  );
}

function canRemovePost(
  userRoles: string[],
  community: Community,
  post: CommunityPost,
  userId: string
): boolean {
  return (
    post.author_user_id === userId ||
    community.membership_role === "OWNER" ||
    community.membership_role === "MANAGER" ||
    userRoles.some((role) => adminRoles.includes(role))
  );
}
