"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  addProgramAffiliation,
  AlumniProfile,
  ApiError,
  deleteProfilePhoto,
  getMyAlumniProfile,
  updateMyAlumniProfile,
  uploadProfilePhoto
} from "@/lib/api";
import { ProfilePhoto } from "@/components/alumni/profile-photo";

type ProfilePanelProps = {
  accessToken: string;
  displayName: string;
};

type ProfileFormState = {
  headline: string;
  bio: string;
  country: string;
  city: string;
  sector: string;
  organization: string;
  job_title: string;
  linkedin_url: string;
  website_url: string;
  skills: string;
};

type ProgramFormState = {
  program_name: string;
  cohort_year: string;
  country: string;
  city: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; profile: AlumniProfile }
  | { status: "error"; message: string };

const emptyProfileForm: ProfileFormState = {
  headline: "",
  bio: "",
  country: "",
  city: "",
  sector: "",
  organization: "",
  job_title: "",
  linkedin_url: "",
  website_url: "",
  skills: ""
};

const emptyProgramForm: ProgramFormState = {
  program_name: "",
  cohort_year: "",
  country: "",
  city: ""
};

export function ProfilePanel({ accessToken, displayName }: ProfilePanelProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm);
  const [programForm, setProgramForm] = useState<ProgramFormState>(emptyProgramForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isAddingProgram, setIsAddingProgram] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getMyAlumniProfile(accessToken)
      .then((profile) => {
        if (!isMounted) {
          return;
        }

        setLoadState({ status: "ready", profile });
        setProfileForm(profileToForm(profile));
      })
      .catch((caught) => {
        if (!isMounted) {
          return;
        }

        setLoadState({
          status: "error",
          message:
            caught instanceof ApiError ? caught.message : "Profile could not be loaded."
        });
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const completion = loadState.status === "ready" ? loadState.profile.completion_percentage : 0;
  const completedItems = useMemo(() => {
    if (loadState.status !== "ready") {
      return [];
    }

    const profile = loadState.profile;
    return [
      ["Headline", Boolean(profile.headline)],
      ["Bio", Boolean(profile.bio)],
      ["Location", Boolean(profile.country)],
      ["Sector", Boolean(profile.sector)],
      ["Organization", Boolean(profile.organization)],
      ["Role", Boolean(profile.job_title)],
      ["Skills", profile.skills.length > 0],
      ["Program", profile.program_affiliations.length > 0]
    ] as const;
  }, [loadState]);

  function updateProfileField(field: keyof ProfileFormState, value: string) {
    setProfileForm((current) => ({ ...current, [field]: value }));
  }

  function updateProgramField(field: keyof ProgramFormState, value: string) {
    setProgramForm((current) => ({ ...current, [field]: value }));
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage(null);
    setIsSavingProfile(true);

    try {
      const profile = await updateMyAlumniProfile(accessToken, {
        bio: valueOrNull(profileForm.bio),
        city: valueOrNull(profileForm.city),
        country: valueOrNull(profileForm.country),
        headline: valueOrNull(profileForm.headline),
        job_title: valueOrNull(profileForm.job_title),
        linkedin_url: valueOrNull(profileForm.linkedin_url),
        organization: valueOrNull(profileForm.organization),
        sector: valueOrNull(profileForm.sector),
        skills: splitSkills(profileForm.skills),
        visibility: {
          email: false,
          location: true,
          organization: true,
          program: true,
          skills: true
        },
        website_url: valueOrNull(profileForm.website_url)
      });
      setLoadState({ status: "ready", profile });
      setProfileForm(profileToForm(profile));
      setSuccessMessage("Profile saved.");
    } catch (caught) {
      setLoadState({
        status: "error",
        message: caught instanceof ApiError ? caught.message : "Profile could not be saved."
      });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePhotoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photoFile) {
      setPhotoMessage("Choose a JPEG, PNG, or WebP photo first.");
      return;
    }

    setPhotoMessage(null);
    setIsUploadingPhoto(true);

    try {
      const profile = await uploadProfilePhoto(accessToken, photoFile);
      setLoadState({ status: "ready", profile });
      setProfileForm(profileToForm(profile));
      setPhotoFile(null);
      setPhotoInputKey((current) => current + 1);
      setPhotoMessage("Profile photo updated.");
    } catch (caught) {
      setPhotoMessage(
        caught instanceof ApiError ? caught.message : "Profile photo could not be uploaded."
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handlePhotoDelete() {
    setPhotoMessage(null);
    setIsDeletingPhoto(true);

    try {
      const profile = await deleteProfilePhoto(accessToken);
      setLoadState({ status: "ready", profile });
      setProfileForm(profileToForm(profile));
      setPhotoFile(null);
      setPhotoInputKey((current) => current + 1);
      setPhotoMessage("Profile photo removed.");
    } catch (caught) {
      setPhotoMessage(
        caught instanceof ApiError ? caught.message : "Profile photo could not be removed."
      );
    } finally {
      setIsDeletingPhoto(false);
    }
  }

  async function handleProgramSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage(null);
    setIsAddingProgram(true);

    try {
      const profile = await addProgramAffiliation(accessToken, {
        city: valueOrNull(programForm.city),
        cohort_year: programForm.cohort_year ? Number(programForm.cohort_year) : null,
        country: valueOrNull(programForm.country),
        program_name: programForm.program_name,
        status: "COMPLETED"
      });
      setLoadState({ status: "ready", profile });
      setProgramForm(emptyProgramForm);
      setSuccessMessage("Program affiliation added.");
    } catch (caught) {
      setLoadState({
        status: "error",
        message:
          caught instanceof ApiError ? caught.message : "Program affiliation could not be added."
      });
    } finally {
      setIsAddingProgram(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="grid gap-6 xl:grid-cols-[0.34fr_0.66fr]">
        <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
            Alumni profile
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-ink">
            Complete your trusted member record.
          </h2>
          <div className="mt-5">
            <div className="flex items-end justify-between gap-4">
              <p className="font-display text-5xl font-bold text-primary">{completion}%</p>
              <p className="pb-2 text-right text-sm font-semibold text-muted">
                {completion === 100 ? "Ready for verification" : "Profile completion"}
              </p>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-secondary transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>

          {loadState.status === "loading" ? (
            <p className="mt-6 text-sm font-semibold text-muted">Loading profile...</p>
          ) : null}

          {loadState.status === "error" ? (
            <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {loadState.message}
            </p>
          ) : null}

          {loadState.status === "ready" ? (
            <>
              <div className="mt-6 flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
                <ProfilePhoto
                  accessToken={accessToken}
                  displayName={displayName}
                  hasPhoto={Boolean(loadState.profile.profile_photo_url)}
                  sizeClassName="h-16 w-16"
                  updatedAt={loadState.profile.profile_photo_updated_at}
                  userId={loadState.profile.user_id}
                />
                <div>
                  <p className="font-semibold text-ink">{displayName}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {loadState.profile.profile_photo_file_name ?? "No profile photo uploaded"}
                  </p>
                </div>
              </div>

              <form className="mt-4 grid gap-3" onSubmit={handlePhotoSubmit}>
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  Profile photo
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-normal text-ink file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                    key={photoInputKey}
                    onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                    type="file"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="focus-ring rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-65"
                    disabled={isUploadingPhoto}
                    type="submit"
                  >
                    {isUploadingPhoto ? "Uploading..." : "Upload photo"}
                  </button>
                  {loadState.profile.profile_photo_url ? (
                    <button
                      className="focus-ring rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isDeletingPhoto}
                      onClick={handlePhotoDelete}
                      type="button"
                    >
                      {isDeletingPhoto ? "Removing..." : "Remove"}
                    </button>
                  ) : null}
                </div>
                {photoMessage ? (
                  <p className="text-sm font-semibold text-muted">{photoMessage}</p>
                ) : null}
              </form>

              <div className="mt-6 grid gap-2">
                {completedItems.map(([label, done]) => (
                  <div className="flex items-center justify-between gap-3 text-sm" key={label}>
                    <span className="font-semibold text-ink">{label}</span>
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                        done ? "bg-emerald-50 text-secondary" : "bg-white text-muted"
                      }`}
                    >
                      {done ? "Done" : "Missing"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </aside>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <form
            className="grid gap-4 rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6"
            onSubmit={handleProfileSubmit}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput
                label="Headline"
                onChange={(value) => updateProfileField("headline", value)}
                placeholder="Civic technology organizer"
                value={profileForm.headline}
              />
              <TextInput
                label="Sector"
                onChange={(value) => updateProfileField("sector", value)}
                placeholder="Civic technology"
                value={profileForm.sector}
              />
              <TextInput
                label="Organization"
                onChange={(value) => updateProfileField("organization", value)}
                placeholder="Open Chapter Lab"
                value={profileForm.organization}
              />
              <TextInput
                label="Role"
                onChange={(value) => updateProfileField("job_title", value)}
                placeholder="Program Lead"
                value={profileForm.job_title}
              />
              <TextInput
                label="Country"
                onChange={(value) => updateProfileField("country", value)}
                placeholder="Ghana"
                value={profileForm.country}
              />
              <TextInput
                label="City"
                onChange={(value) => updateProfileField("city", value)}
                placeholder="Accra"
                value={profileForm.city}
              />
              <TextInput
                label="LinkedIn"
                onChange={(value) => updateProfileField("linkedin_url", value)}
                placeholder="https://linkedin.com/in/..."
                value={profileForm.linkedin_url}
              />
              <TextInput
                label="Website"
                onChange={(value) => updateProfileField("website_url", value)}
                placeholder="https://..."
                value={profileForm.website_url}
              />
            </div>
            <TextInput
              label="Skills"
              onChange={(value) => updateProfileField("skills", value)}
              placeholder="Governance, data, community"
              value={profileForm.skills}
            />
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Bio
              <textarea
                className="min-h-28 rounded-lg border border-border bg-white px-4 py-3 text-sm font-normal leading-6 text-ink outline-none transition focus:border-primary"
                onChange={(event) => updateProfileField("bio", event.target.value)}
                placeholder="Share the kind of leadership work, chapter activity, and impact areas you want other alumni to understand."
                value={profileForm.bio}
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="focus-ring rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-65"
                disabled={isSavingProfile || loadState.status === "loading"}
                type="submit"
              >
                {isSavingProfile ? "Saving..." : "Save profile"}
              </button>
              {successMessage ? (
                <p className="text-sm font-semibold text-secondary">{successMessage}</p>
              ) : null}
            </div>
          </form>

          <div className="rounded-lg border border-border bg-white p-5 shadow-soft">
            <h3 className="font-display text-xl font-semibold text-ink">Program affiliation</h3>
            <form className="mt-4 grid gap-3" onSubmit={handleProgramSubmit}>
              <TextInput
                label="Program"
                onChange={(value) => updateProgramField("program_name", value)}
                placeholder="YALI Regional Leadership Center"
                required
                value={programForm.program_name}
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <TextInput
                  label="Cohort year"
                  onChange={(value) => updateProgramField("cohort_year", value)}
                  placeholder="2024"
                  type="number"
                  value={programForm.cohort_year}
                />
                <TextInput
                  label="Country"
                  onChange={(value) => updateProgramField("country", value)}
                  placeholder="Ghana"
                  value={programForm.country}
                />
                <TextInput
                  label="City"
                  onChange={(value) => updateProgramField("city", value)}
                  placeholder="Accra"
                  value={programForm.city}
                />
              </div>
              <button
                className="focus-ring rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isAddingProgram}
                type="submit"
              >
                {isAddingProgram ? "Adding..." : "Add program"}
              </button>
            </form>

            {loadState.status === "ready" ? (
              <div className="mt-5 divide-y divide-border">
                {loadState.profile.program_affiliations.length === 0 ? (
                  <p className="py-4 text-sm leading-6 text-muted">
                    No program affiliation has been added yet.
                  </p>
                ) : null}
                {loadState.profile.program_affiliations.map((affiliation) => (
                  <article className="py-4" key={affiliation.id}>
                    <p className="font-semibold text-ink">{affiliation.program_name}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {[affiliation.cohort_year, affiliation.city, affiliation.country]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function TextInput({
  label,
  onChange,
  placeholder,
  required = false,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  type?: "number" | "text";
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <input
        className="rounded-lg border border-border bg-white px-4 py-3 text-sm font-normal text-ink outline-none transition focus:border-primary"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function profileToForm(profile: AlumniProfile): ProfileFormState {
  return {
    bio: profile.bio ?? "",
    city: profile.city ?? "",
    country: profile.country ?? "",
    headline: profile.headline ?? "",
    job_title: profile.job_title ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    organization: profile.organization ?? "",
    sector: profile.sector ?? "",
    skills: profile.skills.join(", "),
    website_url: profile.website_url ?? ""
  };
}

function splitSkills(value: string) {
  return value
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function valueOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
