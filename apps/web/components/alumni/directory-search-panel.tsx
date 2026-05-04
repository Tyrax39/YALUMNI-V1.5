"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  AlumniDirectoryProfile,
  ApiError,
  searchAlumniDirectory
} from "@/lib/api";

type DirectorySearchPanelProps = {
  accessToken: string;
};

type DirectoryState =
  | { status: "loading" }
  | { status: "ready"; profiles: AlumniDirectoryProfile[]; total: number }
  | { status: "error"; message: string };

export function DirectorySearchPanel({ accessToken }: DirectorySearchPanelProps) {
  const [state, setState] = useState<DirectoryState>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [sector, setSector] = useState("");

  useEffect(() => {
    loadDirectory({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function loadDirectory(params: { country?: string; q?: string; sector?: string }) {
    setState({ status: "loading" });
    try {
      const response = await searchAlumniDirectory(accessToken, params);
      setState({
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
    void loadDirectory({
      country: country.trim(),
      q: query.trim(),
      sector: sector.trim()
    });
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
          <form className="grid gap-3 md:grid-cols-[1fr_0.7fr_0.7fr_auto]" onSubmit={handleSubmit}>
            <DirectoryInput
              label="Search"
              onChange={setQuery}
              placeholder="Name, headline, organization"
              value={query}
            />
            <DirectoryInput
              label="Country"
              onChange={setCountry}
              placeholder="Ghana"
              value={country}
            />
            <DirectoryInput
              label="Sector"
              onChange={setSector}
              placeholder="Civic technology"
              value={sector}
            />
            <button
              className="focus-ring h-12 self-end rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#003d7d]"
              type="submit"
            >
              Search
            </button>
          </form>

          {state.status === "loading" ? (
            <p className="text-sm font-semibold text-muted">Loading verified alumni...</p>
          ) : null}

          {state.status === "error" ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {state.message}
            </p>
          ) : null}

          {state.status === "ready" ? (
            <>
              <p className="text-sm font-semibold text-muted">
                {state.total} verified alumni profile{state.total === 1 ? "" : "s"} found
              </p>
              <div className="grid gap-4 lg:grid-cols-2">
                {state.profiles.length === 0 ? (
                  <p className="rounded-lg border border-border bg-surface px-4 py-6 text-sm font-semibold text-muted lg:col-span-2">
                    No verified alumni match the current filters.
                  </p>
                ) : null}
                {state.profiles.map((profile) => (
                  <DirectoryResultCard key={profile.user_id} profile={profile} />
                ))}
              </div>
            </>
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
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <input
        className="h-12 rounded-lg border border-border bg-white px-4 text-sm font-normal text-ink outline-none transition focus:border-primary"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function DirectoryResultCard({ profile }: { profile: AlumniDirectoryProfile }) {
  const location = [profile.city, profile.country].filter(Boolean).join(", ");
  const primaryProgram = profile.program_affiliations[0];

  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <h3 className="font-display text-xl font-semibold text-ink">{profile.display_name}</h3>
      {profile.headline ? (
        <p className="mt-2 text-sm font-semibold text-primary">{profile.headline}</p>
      ) : null}
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
