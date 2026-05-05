"use client";

import { FormEvent, useEffect, useState } from "react";

import { LogIn, LogOut, Plus, Users } from "lucide-react";

import {
  ApiError,
  Community,
  CommunityCreatePayload,
  CommunityListResponse,
  createCommunity,
  joinCommunity,
  leaveCommunity,
  listCommunities
} from "@/lib/api";

type CommunitiesPanelProps = {
  accessToken: string;
  canCreate: boolean;
};

type CommunityState =
  | { status: "loading" }
  | { status: "ready"; data: CommunityListResponse }
  | { status: "error"; message: string };

type CommunityFilters = {
  communityType: string;
  country: string;
  membership: string;
  q: string;
  sector: string;
};

const pageSize = 6;
const initialFilters: CommunityFilters = {
  communityType: "",
  country: "",
  membership: "all",
  q: "",
  sector: ""
};

export function CommunitiesPanel({ accessToken, canCreate }: CommunitiesPanelProps) {
  const [state, setState] = useState<CommunityState>({ status: "loading" });
  const [filters, setFilters] = useState<CommunityFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<CommunityFilters>(initialFilters);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyCommunityId, setBusyCommunityId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    void loadCommunities(initialFilters, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function loadCommunities(params: CommunityFilters, offset: number) {
    setState({ status: "loading" });
    try {
      const data = await listCommunities(accessToken, {
        communityType: params.communityType,
        country: params.country.trim(),
        limit: pageSize,
        membership: params.membership,
        offset,
        q: params.q.trim(),
        sector: params.sector.trim()
      });
      setState({ data, status: "ready" });
    } catch (caught) {
      setState({
        message:
          caught instanceof ApiError ? caught.message : "Communities could not be loaded.",
        status: "error"
      });
    }
  }

  function updateFilter(key: keyof CommunityFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters(filters);
    setMessage(null);
    setActionError(null);
    void loadCommunities(filters, 0);
  }

  function handleReset() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setMessage(null);
    setActionError(null);
    void loadCommunities(initialFilters, 0);
  }

  function handlePageChange(offset: number) {
    setMessage(null);
    setActionError(null);
    void loadCommunities(appliedFilters, Math.max(0, offset));
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setActionError(null);
    setIsCreating(true);
    const formData = new FormData(event.currentTarget);
    const cohortValue = String(formData.get("cohort_year") ?? "").trim();
    const payload: CommunityCreatePayload = {
      city: cleanOptional(formData.get("city")),
      cohort_year: cohortValue ? Number(cohortValue) : null,
      community_type: String(formData.get("community_type") ?? "COUNTRY_CHAPTER"),
      country: cleanOptional(formData.get("country")),
      description: cleanOptional(formData.get("description")),
      join_policy: String(formData.get("join_policy") ?? "OPEN"),
      name: String(formData.get("name") ?? ""),
      program_name: cleanOptional(formData.get("program_name")),
      sector: cleanOptional(formData.get("sector")),
      visibility: "MEMBER_ONLY"
    };

    try {
      const community = await createCommunity(accessToken, payload);
      setMessage(`${community.name} created.`);
      event.currentTarget.reset();
      await loadCommunities(appliedFilters, 0);
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "Community could not be created.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoin(community: Community) {
    setMessage(null);
    setActionError(null);
    setBusyCommunityId(community.id);
    try {
      const updatedCommunity = await joinCommunity(accessToken, community.id);
      setMessage(
        updatedCommunity.membership_status === "PENDING"
          ? `Join request sent for ${updatedCommunity.name}.`
          : `Joined ${updatedCommunity.name}.`
      );
      await loadCommunities(appliedFilters, state.status === "ready" ? state.data.offset : 0);
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "Join request failed.");
    } finally {
      setBusyCommunityId(null);
    }
  }

  async function handleLeave(community: Community) {
    setMessage(null);
    setActionError(null);
    setBusyCommunityId(community.id);
    try {
      const updatedCommunity = await leaveCommunity(accessToken, community.id);
      setMessage(`Left ${updatedCommunity.name}.`);
      await loadCommunities(appliedFilters, state.status === "ready" ? state.data.offset : 0);
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "Leave request failed.");
    } finally {
      setBusyCommunityId(null);
    }
  }

  return (
    <section className="mt-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
            Communities
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-ink">
            Find chapters, sector groups, and working teams.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Communities are authenticated member spaces for country chapters, program cohorts,
            sector groups, and working teams.
          </p>
        </div>
        {state.status === "ready" ? (
          <p className="rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold text-muted">
            {state.data.total} communities
          </p>
        ) : null}
      </div>

      <form className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5" onSubmit={handleFilterSubmit}>
        <CommunityInput
          label="Search"
          name="q"
          onChange={(value) => updateFilter("q", value)}
          placeholder="Chapter or focus"
          value={filters.q}
        />
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Type
          <select
            className="h-12 rounded-lg border border-border bg-white px-4 text-sm font-normal text-ink outline-none transition focus:border-primary"
            onChange={(event) => updateFilter("communityType", event.target.value)}
            value={filters.communityType}
          >
            <option value="">All types</option>
            <option value="COUNTRY_CHAPTER">Country chapter</option>
            <option value="CITY_CHAPTER">City chapter</option>
            <option value="SECTOR_GROUP">Sector group</option>
            <option value="PROGRAM_COHORT">Program cohort</option>
            <option value="WORKING_GROUP">Working group</option>
          </select>
        </label>
        <CommunityInput
          label="Country"
          name="country"
          onChange={(value) => updateFilter("country", value)}
          placeholder="Ghana"
          value={filters.country}
        />
        <CommunityInput
          label="Sector"
          name="sector"
          onChange={(value) => updateFilter("sector", value)}
          placeholder="Civic technology"
          value={filters.sector}
        />
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Membership
          <select
            className="h-12 rounded-lg border border-border bg-white px-4 text-sm font-normal text-ink outline-none transition focus:border-primary"
            onChange={(event) => updateFilter("membership", event.target.value)}
            value={filters.membership}
          >
            <option value="all">All communities</option>
            <option value="mine">Joined</option>
            <option value="not_joined">Available</option>
          </select>
        </label>
        <div className="flex gap-2 md:col-span-2 xl:col-span-5">
          <button
            className="focus-ring min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#003d7d]"
            type="submit"
          >
            Filter
          </button>
          <button
            className="focus-ring min-h-11 rounded-lg border border-border bg-white px-5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
            onClick={handleReset}
            type="button"
          >
            Reset
          </button>
        </div>
      </form>

      {canCreate ? (
        <form className="mt-6 border-y border-border bg-white py-5" onSubmit={handleCreate}>
          <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Admin community creation
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <CommunityInput label="Name" name="name" placeholder="Ghana Alumni Chapter" required />
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Type
              <select
                className="h-12 rounded-lg border border-border bg-surface px-4 text-sm font-normal text-ink outline-none transition focus:border-primary"
                name="community_type"
              >
                <option value="COUNTRY_CHAPTER">Country chapter</option>
                <option value="CITY_CHAPTER">City chapter</option>
                <option value="SECTOR_GROUP">Sector group</option>
                <option value="PROGRAM_COHORT">Program cohort</option>
                <option value="WORKING_GROUP">Working group</option>
              </select>
            </label>
            <CommunityInput label="Country" name="country" placeholder="Ghana" />
            <CommunityInput label="City" name="city" placeholder="Accra" />
            <CommunityInput label="Sector" name="sector" placeholder="Leadership" />
            <CommunityInput label="Program" name="program_name" placeholder="YALI RLC" />
            <CommunityInput label="Cohort year" name="cohort_year" placeholder="2024" type="number" />
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Join policy
              <select
                className="h-12 rounded-lg border border-border bg-surface px-4 text-sm font-normal text-ink outline-none transition focus:border-primary"
                name="join_policy"
              >
                <option value="OPEN">Open</option>
                <option value="REQUEST">Request</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink md:col-span-2 xl:col-span-4">
              Description
              <textarea
                className="min-h-24 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-normal text-ink outline-none transition focus:border-primary"
                maxLength={1200}
                name="description"
                placeholder="Community purpose, operating focus, and who should join"
              />
            </label>
          </div>
          <button
            className="focus-ring mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCreating}
            type="submit"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            {isCreating ? "Creating..." : "Create community"}
          </button>
        </form>
      ) : null}

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

      {state.status === "loading" ? (
        <p className="mt-5 text-sm font-semibold text-muted">Loading communities...</p>
      ) : null}
      {state.status === "error" ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.message}
        </p>
      ) : null}
      {state.status === "ready" ? (
        <>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {state.data.communities.length === 0 ? (
              <p className="border-y border-border bg-white px-4 py-6 text-sm font-semibold text-muted lg:col-span-2">
                No communities match the current filters.
              </p>
            ) : null}
            {state.data.communities.map((community) => (
              <CommunityCard
                community={community}
                isBusy={busyCommunityId === community.id}
                key={community.id}
                onJoin={() => handleJoin(community)}
                onLeave={() => handleLeave(community)}
              />
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3 border-y border-border bg-white px-4 py-3 text-sm font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              {state.data.total === 0
                ? "No communities"
                : `Showing ${state.data.offset + 1}-${state.data.offset + state.data.communities.length} of ${state.data.total}`}
            </p>
            <div className="flex gap-2">
              <button
                className="focus-ring min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={state.data.offset === 0}
                onClick={() => handlePageChange(state.data.offset - state.data.limit)}
                type="button"
              >
                Previous
              </button>
              <button
                className="focus-ring min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!state.data.has_more}
                onClick={() => handlePageChange(state.data.offset + state.data.limit)}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function CommunityCard({
  community,
  isBusy,
  onJoin,
  onLeave
}: {
  community: Community;
  isBusy: boolean;
  onJoin: () => void;
  onLeave: () => void;
}) {
  const activeMember = community.membership_status === "ACTIVE";
  const pendingMember = community.membership_status === "PENDING";
  const owner = community.membership_role === "OWNER";
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
            {formatCommunityType(community.community_type)}
          </p>
          <h3 className="mt-2 font-display text-xl font-semibold text-ink">{community.name}</h3>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md bg-surface px-2.5 py-1 text-xs font-bold text-muted">
          <Users aria-hidden="true" className="h-4 w-4" />
          {community.member_count}
        </span>
      </div>
      {community.description ? (
        <p className="mt-3 text-sm leading-6 text-muted">{community.description}</p>
      ) : null}
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <CommunityDetail label="Location" value={[community.city, community.country].filter(Boolean).join(", ") || "Network-wide"} />
        <CommunityDetail label="Focus" value={community.sector ?? community.program_name ?? "General"} />
        <CommunityDetail label="Join policy" value={formatCommunityType(community.join_policy)} />
        <CommunityDetail label="Your status" value={community.membership_status ? formatCommunityType(community.membership_status) : "Not joined"} />
      </dl>
      <div className="mt-5">
        {activeMember ? (
          <button
            className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isBusy || owner}
            onClick={onLeave}
            type="button"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            {owner ? "Owner" : isBusy ? "Leaving..." : "Leave"}
          </button>
        ) : (
          <button
            className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy || pendingMember}
            onClick={onJoin}
            type="button"
          >
            <LogIn aria-hidden="true" className="h-4 w-4" />
            {pendingMember ? "Pending" : isBusy ? "Joining..." : "Join"}
          </button>
        )}
      </div>
    </article>
  );
}

function CommunityDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}

function CommunityInput({
  label,
  name,
  onChange,
  placeholder,
  required = false,
  type = "text",
  value
}: {
  label: string;
  name: string;
  onChange?: (value: string) => void;
  placeholder: string;
  required?: boolean;
  type?: string;
  value?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <input
        className="h-12 rounded-lg border border-border bg-white px-4 text-sm font-normal text-ink outline-none transition focus:border-primary"
        max={type === "number" ? 2100 : undefined}
        min={type === "number" ? 2000 : undefined}
        name={name}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function cleanOptional(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const cleaned = value.trim();
  return cleaned || null;
}

function formatCommunityType(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
