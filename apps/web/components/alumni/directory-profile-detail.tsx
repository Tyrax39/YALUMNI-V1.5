"use client";

import { useEffect, useState } from "react";

import { ArrowLeft, BriefcaseBusiness, GraduationCap, MapPin, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  AlumniDirectoryProfile,
  ApiError,
  getAlumniDirectoryProfile
} from "@/lib/api";
import { ProfilePhoto } from "@/components/alumni/profile-photo";
import { ProtectedRoute } from "@/components/auth/protected-route";

type DirectoryProfileDetailProps = {
  userId: string;
};

type ProfileState =
  | { status: "loading" }
  | { status: "ready"; profile: AlumniDirectoryProfile }
  | { status: "error"; message: string };

export function DirectoryProfileDetail({ userId }: DirectoryProfileDetailProps) {
  return (
    <main className="min-h-screen bg-surface">
      <ProtectedRoute
        description="Directory profiles are available to signed-in YALUMNI members."
        title="Directory profile"
      >
        {({ accessToken }) => (
          <DirectoryProfileContent accessToken={accessToken} userId={userId} />
        )}
      </ProtectedRoute>
    </main>
  );
}

function DirectoryProfileContent({
  accessToken,
  userId
}: {
  accessToken: string;
  userId: string;
}) {
  const [state, setState] = useState<ProfileState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;
    getAlumniDirectoryProfile(accessToken, userId)
      .then((profile) => {
        if (isMounted) {
          setState({ profile, status: "ready" });
        }
      })
      .catch((caught) => {
        if (!isMounted) {
          return;
        }
        setState({
          status: "error",
          message:
            caught instanceof ApiError
              ? caught.message
              : "This directory profile could not be loaded."
        });
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, userId]);

  if (state.status === "loading") {
    return (
      <ProfileShell>
        <p className="rounded-lg border border-border bg-white px-5 py-4 text-sm font-semibold text-muted shadow-soft">
          Loading directory profile...
        </p>
      </ProfileShell>
    );
  }

  if (state.status === "error") {
    return (
      <ProfileShell>
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 shadow-soft">
          <p className="text-sm font-semibold text-red-700">{state.message}</p>
          <Link
            className="focus-ring mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#003d7d]"
            href="/dashboard"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
      </ProfileShell>
    );
  }

  const { profile } = state;
  const location = [profile.city, profile.country].filter(Boolean).join(", ");
  const organization = [profile.job_title, profile.organization].filter(Boolean).join(" at ");

  return (
    <ProfileShell>
      <section className="border-b border-border bg-white pb-8">
        <Link
          className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
          href="/dashboard"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Dashboard
        </Link>

        <div className="mt-8 grid gap-6 lg:grid-cols-[auto_1fr_auto] lg:items-start">
          <ProfilePhoto
            accessToken={accessToken}
            displayName={profile.display_name}
            hasPhoto={Boolean(profile.profile_photo_url)}
            sizeClassName="h-24 w-24"
            userId={profile.user_id}
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
              Verified directory profile
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold text-ink sm:text-5xl">
              {profile.display_name}
            </h1>
            {profile.headline ? (
              <p className="mt-4 max-w-3xl text-lg font-semibold leading-8 text-primary">
                {profile.headline}
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-ink">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 text-secondary" />
              Verified alumni
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <ProfileMetric
            icon={<MapPin aria-hidden="true" className="h-5 w-5" />}
            label="Location"
            value={location || "Not shared"}
          />
          <ProfileMetric
            icon={<BriefcaseBusiness aria-hidden="true" className="h-5 w-5" />}
            label="Current work"
            value={organization || "Not shared"}
          />
          <ProfileMetric
            icon={<GraduationCap aria-hidden="true" className="h-5 w-5" />}
            label="Programs"
            value={`${profile.program_affiliations.length} shared`}
          />
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.62fr_0.38fr]">
        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">Program history</h2>
          {profile.program_affiliations.length ? (
            <div className="mt-5 grid gap-3">
              {profile.program_affiliations.map((program) => (
                <article
                  className="rounded-lg border border-border bg-surface p-4"
                  key={`${program.program_name}-${program.cohort_year ?? "na"}-${program.city ?? "na"}`}
                >
                  <h3 className="font-display text-xl font-semibold text-ink">
                    {program.program_name}
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-muted">
                    {[program.cohort_year, program.city, program.country]
                      .filter(Boolean)
                      .join(" · ") || "Cohort details not shared"}
                  </p>
                  <p className="mt-3 inline-flex rounded-md bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-secondary">
                    {program.status}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 border-y border-border bg-white px-4 py-5 text-sm font-semibold text-muted">
              Program affiliations are not shared for this profile.
            </p>
          )}
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">Skills and focus</h2>
          {profile.sector ? (
            <p className="mt-4 border-y border-border bg-white px-4 py-3 text-sm font-semibold text-ink">
              {profile.sector}
            </p>
          ) : null}
          {profile.skills.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  className="rounded-md bg-surface px-3 py-1.5 text-sm font-bold text-muted"
                  key={skill}
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-4 border-y border-border bg-white px-4 py-5 text-sm font-semibold text-muted">
              Skills are not shared for this profile.
            </p>
          )}
          {profile.email ? (
            <div className="mt-6 border-y border-border bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Shared email
              </p>
              <a
                className="focus-ring mt-2 inline-flex rounded-md text-sm font-semibold text-primary"
                href={`mailto:${profile.email}`}
              >
                {profile.email}
              </a>
            </div>
          ) : null}
        </section>
      </div>
    </ProfileShell>
  );
}

function ProfileShell({ children }: { children: React.ReactNode }) {
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

function ProfileMetric({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border-y border-border bg-white p-4">
      <div className="flex items-center gap-2 text-secondary">{icon}</div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-ink">{value}</p>
    </div>
  );
}
