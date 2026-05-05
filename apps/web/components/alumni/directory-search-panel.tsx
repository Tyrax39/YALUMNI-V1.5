"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  AlumniDirectoryProfile,
  ApiError,
  searchAlumniDirectory
} from "@/lib/api";
import { ProfilePhoto } from "@/components/alumni/profile-photo";

type DirectorySearchPanelProps = {
  accessToken: string;
};

type DirectoryState =
  | { status: "loading" }
  | {
      hasMore: boolean;
      limit: number;
      offset: number;
      profiles: AlumniDirectoryProfile[];
      status: "ready";
      total: number;
    }
  | { status: "error"; message: string };

type DirectoryFilters = {
  city: string;
  cohortYear: string;
  country: string;
  programName: string;
  q: string;
  sector: string;
  skill: string;
  sort: string;
};

const pageSize = 6;
const initialFilters: DirectoryFilters = {
  city: "",
  cohortYear: "",
  country: "",
  programName: "",
  q: "",
  sector: "",
  skill: "",
  sort: "name"
};

export function DirectorySearchPanel({ accessToken }: DirectorySearchPanelProps) {
  const [state, setState] = useState<DirectoryState>({ status: "loading" });
  const [filters, setFilters] = useState<DirectoryFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<DirectoryFilters>(initialFilters);

  useEffect(() => {
    void loadDirectory(initialFilters, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function loadDirectory(params: DirectoryFilters, offset: number) {
    setState({ status: "loading" });
    try {
      const response = await searchAlumniDirectory(accessToken, {
        city: params.city.trim(),
        cohortYear: params.cohortYear ? Number(params.cohortYear) : null,
        country: params.country.trim(),
        limit: pageSize,
        offset,
        programName: params.programName.trim(),
        q: params.q.trim(),
        sector: params.sector.trim(),
        skill: params.skill.trim(),
        sort: params.sort
      });
      setState({
        hasMore: response.has_more,
        limit: response.limit,
        offset: response.offset,
        status: "ready",
        profiles: response.profiles,
        total: response.total
      });
    } catch (caught) {
      setState({
        status: "error",
        message:
          caught instanceof ApiError ? caught.message : "Alumni directory could not be loaded."
      });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters(filters);
    void loadDirectory(filters, 0);
  }

  function updateFilter(key: keyof DirectoryFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleReset() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    void loadDirectory(initialFilters, 0);
  }

  function handlePageChange(nextOffset: number) {
    void loadDirectory(appliedFilters, Math.max(0, nextOffset));
  }

  return (
    <section className="mt-10 rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[0.34fr_0.66fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
            Directory
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-ink">
            Find verified alumni by focus, country, and sector.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Only verified alumni profiles appear here, and profile visibility settings control
            which contact and affiliation fields are shared.
          </p>
        </div>

        <div className="grid gap-5">
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleSubmit}>
            <DirectoryInput
              label="Search"
              onChange={(value) => updateFilter("q", value)}
              placeholder="Name, headline, organization"
              value={filters.q}
            />
            <DirectoryInput
              label="Country"
              onChange={(value) => updateFilter("country", value)}
              placeholder="Ghana"
              value={filters.country}
            />
            <DirectoryInput
              label="City"
              onChange={(value) => updateFilter("city", value)}
              placeholder="Accra"
              value={filters.city}
            />
            <DirectoryInput
              label="Sector"
              onChange={(value) => updateFilter("sector", value)}
              placeholder="Civic technology"
              value={filters.sector}
            />
            <DirectoryInput
              label="Program"
              onChange={(value) => updateFilter("programName", value)}
              placeholder="Mandela Washington Fellowship"
              value={filters.programName}
            />
            <DirectoryInput
              label="Cohort year"
              onChange={(value) => updateFilter("cohortYear", value)}
              placeholder="2024"
              type="number"
              value={filters.cohortYear}
            />
            <DirectoryInput
              label="Skill"
              onChange={(value) => updateFilter("skill", value)}
              placeholder="Governance"
              value={filters.skill}
            />
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Sort
              <select
                className="h-12 rounded-lg border border-border bg-white px-4 text-sm font-normal text-ink outline-none transition focus:border-primary"
                onChange={(event) => updateFilter("sort", event.target.value)}
                value={filters.sort}
              >
                <option value="name">Name</option>
                <option value="recent">Recently verified</option>
                <option value="country">Country</option>
                <option value="sector">Sector</option>
              </select>
            </label>
            <div className="flex gap-2 md:col-span-2 xl:col-span-4">
              <button
                className="focus-ring min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#003d7d]"
                type="submit"
              >
                Search
              </button>
              <button
                className="focus-ring min-h-11 rounded-lg border border-border px-5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
                onClick={handleReset}
                type="button"
              >
                Reset
              </button>
            </div>
          </form>

          {state.status === "ready" ? (
            <div className="grid gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-muted sm:grid-cols-[1fr_auto] sm:items-center">
              <p>
                {state.total === 0
                  ? "No verified alumni profiles found"
                  : `Showing ${state.offset + 1}-${state.offset + state.profiles.length} of ${state.total}`}
              </p>
              <div className="flex gap-2">
                <button
                  className="focus-ring min-h-10 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={state.offset === 0}
                  onClick={() => handlePageChange(state.offset - state.limit)}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="focus-ring min-h-10 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!state.hasMore}
                  onClick={() => handlePageChange(state.offset + state.limit)}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}

          {state.status === "loading" ? (
            <p className="text-sm font-semibold text-muted">Loading verified alumni...</p>
          ) : null}

          {state.status === "error" ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {state.message}
            </p>
          ) : null}

          {state.status === "ready" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {state.profiles.length === 0 ? (
                <p className="rounded-lg border border-border bg-surface px-4 py-6 text-sm font-semibold text-muted lg:col-span-2">
                  No verified alumni match the current filters.
                </p>
              ) : null}
              {state.profiles.map((profile) => (
                <DirectoryResultCard
                  accessToken={accessToken}
                  key={profile.user_id}
                  profile={profile}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function DirectoryInput({
  label,
  onChange,
  placeholder,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <input
        className="h-12 rounded-lg border border-border bg-white px-4 text-sm font-normal text-ink outline-none transition focus:border-primary"
        min={type === "number" ? 2000 : undefined}
        max={type === "number" ? 2100 : undefined}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function DirectoryResultCard({
  accessToken,
  profile
}: {
  accessToken: string;
  profile: AlumniDirectoryProfile;
}) {
  const location = [profile.city, profile.country].filter(Boolean).join(", ");
  const primaryProgram = profile.program_affiliations[0];

  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <ProfilePhoto
          accessToken={accessToken}
          displayName={profile.display_name}
          hasPhoto={Boolean(profile.profile_photo_url)}
          sizeClassName="h-12 w-12"
          userId={profile.user_id}
        />
        <div className="min-w-0">
          <h3 className="font-display text-xl font-semibold text-ink">{profile.display_name}</h3>
          {profile.headline ? (
            <p className="mt-2 text-sm font-semibold text-primary">{profile.headline}</p>
          ) : null}
        </div>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <DirectoryDetail label="Sector" value={profile.sector ?? "Not shared"} />
        <DirectoryDetail label="Location" value={location || "Not shared"} />
        <DirectoryDetail label="Organization" value={profile.organization ?? "Not shared"} />
        <DirectoryDetail label="Role" value={profile.job_title ?? "Not shared"} />
      </dl>
      {profile.skills.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.skills.slice(0, 6).map((skill) => (
            <span
              className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-muted"
              key={skill}
            >
              {skill}
            </span>
          ))}
        </div>
      ) : null}
      {primaryProgram ? (
        <p className="mt-4 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-ink">
          {[primaryProgram.program_name, primaryProgram.cohort_year]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
    </article>
  );
}

function DirectoryDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}
