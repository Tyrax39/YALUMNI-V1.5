"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Globe2,
  GraduationCap,
  ShieldCheck,
  Users,
  type LucideIcon
} from "lucide-react";

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

type ProgramChoiceId = "BOTH" | "MWF" | "RLC";

type ProgramChoice = {
  body: string;
  icon: LucideIcon;
  iconClassName: string;
  id: ProgramChoiceId;
  programNames: string[];
  selectedClassName: string;
  title: string;
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

const programChoices: ProgramChoice[] = [
  {
    body: "Graduates of the Regional Leadership Centers across Africa, focused on business, civic leadership, or public management.",
    icon: GraduationCap,
    iconClassName: "bg-[#d7e2ff] text-primary",
    id: "RLC",
    programNames: ["YALI Regional Leadership Center"],
    selectedClassName: "border-primary bg-[#f0f7ff]",
    title: "RLC Alumnus"
  },
  {
    body: "Participants of the flagship exchange program who completed academic and leadership training at U.S. higher education institutions.",
    icon: Globe2,
    iconClassName: "bg-[#dff8ec] text-secondary",
    id: "MWF",
    programNames: ["Mandela Washington Fellowship"],
    selectedClassName: "border-secondary bg-[#f1fff8]",
    title: "Mandela Washington Fellow"
  },
  {
    body: "Distinguished leaders who have successfully completed both the Regional Leadership Center training and the Mandela Washington Fellowship.",
    icon: Users,
    iconClassName: "bg-[#fff2db] text-accent",
    id: "BOTH",
    programNames: ["YALI Regional Leadership Center", "Mandela Washington Fellowship"],
    selectedClassName: "border-accent bg-[#fff8ed]",
    title: "Both Programs"
  }
];

const availabilityOptions = [
  {
    body: "Available to guide emerging alumni leaders.",
    checked: true,
    label: "Open to mentorship"
  },
  {
    body: "Interested in chapter and sector collaborations.",
    checked: true,
    label: "Open to collaboration"
  },
  {
    body: "Can support events, panels, and community sessions.",
    checked: false,
    label: "Open to speaking"
  }
];

export function ProfileSetupPanel({ accessToken, displayName }: ProfilePanelProps) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
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
  const skillChips = splitSkills(profileForm.skills).slice(0, 8);
  const completionItems = useMemo(() => {
    if (loadState.status !== "ready") {
      return [];
    }

    const profile = loadState.profile;
    return [
      ["Professional title", Boolean(profile.job_title)],
      ["Organization", Boolean(profile.organization)],
      ["Bio", Boolean(profile.bio)],
      ["Skills", profile.skills.length > 0],
      ["Program affiliation", profile.program_affiliations.length > 0]
    ] as const;
  }, [loadState]);

  function updateProfileField(field: keyof ProfileFormState, value: string) {
    setProfileForm((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile() {
    if (loadState.status !== "ready") {
      return false;
    }

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
      return true;
    } catch (caught) {
      setLoadState({
        status: "error",
        message: caught instanceof ApiError ? caught.message : "Profile could not be saved."
      });
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveProfile();
  }

  async function handleContinue() {
    const saved = await saveProfile();

    if (saved) {
      router.push("/verification");
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

  return (
    <main className="min-h-screen bg-[#f9f9ff] px-5 py-10 text-[#191c21] sm:px-8 lg:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col">
        <header className="text-center">
          <Link className="focus-ring inline-block rounded-lg" href="/dashboard">
            <span className="font-display text-4xl font-black tracking-tight text-primary">
              YALI Alumni
            </span>
            <span className="mt-3 block text-sm font-bold uppercase tracking-[0.22em] text-[#737783]">
              Civic Leadership Network
            </span>
          </Link>
        </header>

        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Step 4 of 5
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#737783]">
              Profile details
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#e2e2e9]">
            <div className="h-full w-4/5 rounded-full bg-primary" />
          </div>
        </section>

        <section className="mt-12 text-center">
          <h1 className="font-display text-3xl font-semibold text-[#191c21]">
            Complete Your Profile
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-[#424751]">
            Add the professional details, skills, and photo that help verified alumni find
            the right collaborators across the network.
          </p>
        </section>

        {loadState.status === "loading" ? (
          <p className="mt-10 rounded-xl border border-[#c2c6d3] bg-white p-6 text-center text-sm font-semibold text-[#424751]">
            Loading your profile...
          </p>
        ) : null}

        {loadState.status === "error" ? (
          <p className="mt-10 rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm font-semibold text-red-700">
            {loadState.message}
          </p>
        ) : null}

        {loadState.status === "ready" ? (
          <>
            <section className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <form
                className="grid gap-6 rounded-xl border border-[#c2c6d3] bg-white p-5 shadow-sm sm:p-7"
                id="profile-setup-form"
                onSubmit={handleProfileSubmit}
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    Profile basics
                  </p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <TextInput
                      label="Professional title"
                      onChange={(value) => updateProfileField("job_title", value)}
                      placeholder="Program Lead"
                      value={profileForm.job_title}
                    />
                    <TextInput
                      label="Organization"
                      onChange={(value) => updateProfileField("organization", value)}
                      placeholder="Open Chapter Lab"
                      value={profileForm.organization}
                    />
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
                  </div>
                  <label className="mt-4 grid gap-2 text-sm font-semibold text-ink">
                    Bio
                    <textarea
                      className="min-h-32 rounded-lg border border-border bg-white px-4 py-3 text-sm font-normal leading-6 text-ink outline-none transition focus:border-primary"
                      onChange={(event) => updateProfileField("bio", event.target.value)}
                      placeholder="Share your leadership focus, chapter work, impact areas, and the kinds of collaborations you are open to."
                      value={profileForm.bio}
                    />
                  </label>
                </div>

                <div className="border-t border-[#e1e3ea] pt-6">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    Top skills
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {skillChips.length ? (
                      skillChips.map((skill) => (
                        <span
                          className="rounded-full bg-[#edf6ff] px-3 py-1.5 text-sm font-semibold text-primary"
                          key={skill}
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full bg-[#f1f2f7] px-3 py-1.5 text-sm font-semibold text-[#737783]">
                        Add skills to improve discovery
                      </span>
                    )}
                  </div>
                  <div className="mt-4">
                    <TextInput
                      label="Skills"
                      onChange={(value) => updateProfileField("skills", value)}
                      placeholder="Governance, data, community"
                      value={profileForm.skills}
                    />
                  </div>
                </div>

                <div className="border-t border-[#e1e3ea] pt-6">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    Links
                  </p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                </div>
              </form>

              <aside className="grid gap-6">
                <section className="overflow-hidden rounded-xl border border-[#c2c6d3] bg-white shadow-sm">
                  <div className="relative h-32 bg-[#d9d9e1]">
                    <Image
                      alt="YALI alumni leadership cohort"
                      className="object-cover opacity-45 grayscale"
                      fill
                      sizes="360px"
                      src="/brand/landing-hero.png"
                    />
                  </div>
                  <div className="px-6 pb-6">
                    <div className="-mt-10 flex justify-center">
                      <ProfilePhoto
                        accessToken={accessToken}
                        displayName={displayName}
                        hasPhoto={Boolean(loadState.profile.profile_photo_url)}
                        sizeClassName="h-20 w-20"
                        updatedAt={loadState.profile.profile_photo_updated_at}
                        userId={loadState.profile.user_id}
                      />
                    </div>
                    <div className="mt-4 text-center">
                      <h2 className="font-display text-xl font-semibold text-[#191c21]">
                        {displayName}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-[#424751]">
                        {profileForm.job_title || "Professional title"} at{" "}
                        {profileForm.organization || "Organization"}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-primary">
                        {profileForm.country || "Country"}
                      </p>
                    </div>

                    <form className="mt-5 grid gap-3" onSubmit={handlePhotoSubmit}>
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
                      <div className="flex flex-wrap justify-center gap-2">
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
                        <p className="text-center text-sm font-semibold text-muted">
                          {photoMessage}
                        </p>
                      ) : null}
                    </form>
                  </div>
                </section>

                <section className="rounded-xl border border-[#c2c6d3] bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                      Completion
                    </p>
                    <p className="font-display text-3xl font-semibold text-primary">
                      {completion}%
                    </p>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e2e2e9]">
                    <div
                      className="h-full rounded-full bg-secondary transition-all"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                  <div className="mt-5 grid gap-2">
                    {completionItems.map(([label, done]) => (
                      <div className="flex items-center justify-between gap-3 text-sm" key={label}>
                        <span className="font-semibold text-[#424751]">{label}</span>
                        <span
                          className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                            done ? "bg-emerald-50 text-secondary" : "bg-[#f1f2f7] text-[#737783]"
                          }`}
                        >
                          {done ? "Done" : "Missing"}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl border border-[#c2c6d3] bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    Interests & availability
                  </p>
                  <div className="mt-4 grid gap-3">
                    {availabilityOptions.map((option) => (
                      <label
                        className="flex gap-3 rounded-lg border border-[#e1e3ea] p-3"
                        key={option.label}
                      >
                        <input
                          className="mt-1 h-4 w-4 accent-primary"
                          defaultChecked={option.checked}
                          disabled
                          type="checkbox"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-[#191c21]">
                            {option.label}
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-[#424751]">
                            {option.body}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              </aside>
            </section>

            {successMessage ? (
              <p className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-secondary">
                <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                {successMessage}
              </p>
            ) : null}
          </>
        ) : null}

        <footer className="mt-14 border-t border-[#c2c6d3] py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold uppercase tracking-[0.12em] text-[#424751] transition hover:bg-white hover:text-primary"
              href="/profile/program-affiliation"
            >
              <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              Previous step
            </Link>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg border border-[#c2c6d3] bg-white px-6 text-sm font-bold uppercase tracking-[0.12em] text-[#424751] transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSavingProfile || loadState.status !== "ready"}
                form="profile-setup-form"
                type="submit"
              >
                {isSavingProfile ? "Saving..." : "Save draft"}
              </button>
              <button
                className="focus-ring inline-flex min-h-14 items-center justify-center gap-3 rounded-lg bg-primary px-8 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-md transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:bg-[#7da5d2]"
                disabled={isSavingProfile || loadState.status !== "ready"}
                onClick={handleContinue}
                type="button"
              >
                {isSavingProfile ? "Saving..." : "Continue to verification"}
                <ChevronRight aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

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

export function ProgramAffiliationPanel({ accessToken, displayName }: ProfilePanelProps) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [selectedChoiceId, setSelectedChoiceId] = useState<ProgramChoiceId | null>(null);
  const [programForm, setProgramForm] = useState<ProgramFormState>(emptyProgramForm);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getMyAlumniProfile(accessToken)
      .then((profile) => {
        if (!isMounted) {
          return;
        }

        setLoadState({ status: "ready", profile });
        setProgramForm((current) => ({
          ...current,
          city: current.city || profile.city || "",
          country: current.country || profile.country || ""
        }));
      })
      .catch((caught) => {
        if (!isMounted) {
          return;
        }

        setLoadState({
          status: "error",
          message:
            caught instanceof ApiError
              ? caught.message
              : "Program affiliation could not be loaded."
        });
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const selectedChoice = useMemo(
    () => programChoices.find((choice) => choice.id === selectedChoiceId) ?? null,
    [selectedChoiceId]
  );
  const existingProgramNames = useMemo(() => {
    if (loadState.status !== "ready") {
      return new Set<string>();
    }

    return new Set(
      loadState.profile.program_affiliations.map((affiliation) =>
        affiliation.program_name.toLowerCase()
      )
    );
  }, [loadState]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loadState.status !== "ready" || !selectedChoice) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      let profile = loadState.profile;
      const missingPrograms = selectedChoice.programNames.filter(
        (programName) => !existingProgramNames.has(programName.toLowerCase())
      );

      for (const programName of missingPrograms) {
        profile = await addProgramAffiliation(accessToken, {
          city: valueOrNull(programForm.city),
          cohort_year: programForm.cohort_year ? Number(programForm.cohort_year) : null,
          country: valueOrNull(programForm.country),
          program_name: programName,
          status: "COMPLETED"
        });
      }

      setLoadState({ status: "ready", profile });
      setMessage(
        missingPrograms.length
          ? "Program affiliation recorded."
          : "That program affiliation is already recorded."
      );
      router.push("/verification");
    } catch (caught) {
      setLoadState({
        status: "error",
        message:
          caught instanceof ApiError
            ? caught.message
            : "Program affiliation could not be saved."
      });
    } finally {
      setIsSaving(false);
    }
  }

  function updateProgramField(field: keyof ProgramFormState, value: string) {
    setProgramForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="min-h-screen bg-[#f9f9ff] px-5 py-10 text-[#191c21] sm:px-8 lg:py-12">
      <form className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col" onSubmit={handleSubmit}>
        <header className="text-center">
          <Link className="focus-ring inline-block rounded-lg" href="/dashboard">
            <span className="font-display text-4xl font-black tracking-tight text-primary">
              YALI Alumni
            </span>
            <span className="mt-3 block text-sm font-bold uppercase tracking-[0.22em] text-[#737783]">
              Civic Leadership Network
            </span>
          </Link>
        </header>

        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Step 2 of 5
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#737783]">
              Program affiliation
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#e2e2e9]">
            <div className="h-full w-2/5 rounded-full bg-primary" />
          </div>
        </section>

        <section className="mt-14 text-center">
          <h1 className="font-display text-3xl font-semibold text-[#191c21]">
            Select Your Program Affiliation
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-[#424751]">
            To provide the most relevant opportunities and community access, please confirm which YALI program(s) you have successfully completed.
          </p>
        </section>

        {loadState.status === "loading" ? (
          <p className="mt-10 rounded-xl border border-[#c2c6d3] bg-white p-6 text-center text-sm font-semibold text-[#424751]">
            Loading your current program affiliations...
          </p>
        ) : null}

        {loadState.status === "error" ? (
          <p className="mt-10 rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm font-semibold text-red-700">
            {loadState.message}
          </p>
        ) : null}

        {loadState.status === "ready" ? (
          <>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {programChoices.map((choice) => (
                <ProgramChoiceCard
                  choice={choice}
                  isRecorded={choice.programNames.every((programName) =>
                    existingProgramNames.has(programName.toLowerCase())
                  )}
                  isSelected={choice.id === selectedChoiceId}
                  key={choice.id}
                  onSelect={() => setSelectedChoiceId(choice.id)}
                />
              ))}
            </div>

            <div className="mt-8 grid gap-4 rounded-xl border border-[#c2c6d3] bg-white p-5 shadow-sm md:grid-cols-3">
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

            <div className="mt-8 flex flex-col gap-3 rounded-xl border border-[#d9d9e1] bg-[#f3f3fa] p-6 sm:flex-row sm:items-start">
              <ShieldCheck aria-hidden="true" className="h-7 w-7 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#191c21]">
                  Secure verification
                </p>
                <p className="mt-2 text-sm leading-6 text-[#424751]">
                  Your affiliation will be cross-referenced with the official YALI database. Verified members receive a <span className="font-bold text-primary">Verification Badge</span> on their profile, unlocking exclusive mentorship and funding opportunities.
                </p>
                <p className="mt-2 text-sm font-semibold text-secondary">
                  Signed in as {displayName}
                </p>
              </div>
            </div>

            {message ? (
              <p className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-secondary">
                <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                {message}
              </p>
            ) : null}
          </>
        ) : null}

        <footer className="mt-14 border-t border-[#c2c6d3] py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold uppercase tracking-[0.12em] text-[#424751] transition hover:bg-white hover:text-primary"
              href="/profile/setup"
            >
              <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              Go back
            </Link>
            <button
              className="focus-ring inline-flex min-h-14 items-center justify-center gap-3 rounded-lg bg-primary px-8 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-md transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:bg-[#7da5d2]"
              disabled={loadState.status !== "ready" || !selectedChoice || isSaving}
              type="submit"
            >
              {isSaving ? "Recording..." : "Continue to step 3"}
              <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </footer>

        <div className="relative mt-auto h-48 overflow-hidden rounded-2xl bg-[#d9d9e1] md:h-56">
          <Image
            alt="YALI alumni leadership cohort"
            className="object-cover opacity-55 grayscale"
            fill
            sizes="(max-width: 768px) 100vw, 1080px"
            src="/brand/landing-hero.png"
          />
        </div>
      </form>
    </main>
  );
}

function ProgramChoiceCard({
  choice,
  isRecorded,
  isSelected,
  onSelect
}: {
  choice: ProgramChoice;
  isRecorded: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const Icon = choice.icon;

  return (
    <button
      className={`focus-ring group flex min-h-80 flex-col rounded-xl border bg-white p-8 text-left transition hover:border-primary ${
        isSelected ? choice.selectedClassName : "border-[#c2c6d3]"
      }`}
      onClick={onSelect}
      type="button"
    >
      <span className={`flex h-12 w-12 items-center justify-center rounded-lg ${choice.iconClassName}`}>
        <Icon aria-hidden="true" className="h-7 w-7" />
      </span>
      <span className="mt-8 block font-display text-2xl font-semibold leading-tight text-[#191c21]">
        {choice.title}
      </span>
      <span className="mt-5 block text-base leading-7 text-[#424751]">{choice.body}</span>
      <span className="mt-auto flex items-center gap-2 pt-8 text-xs font-bold uppercase tracking-[0.14em] text-primary">
        {isRecorded ? "Already recorded" : isSelected ? "Selected" : "Select program"}
        {isRecorded || isSelected ? <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> : null}
      </span>
    </button>
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
