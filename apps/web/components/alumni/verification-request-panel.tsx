"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  CloudUpload,
  FileText,
  Gavel,
  Home,
  Info,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon
} from "lucide-react";

import {
  AlumniProfile,
  ApiError,
  getMyAlumniProfile,
  getMyVerificationRequests,
  submitVerificationRequest,
  uploadVerificationEvidence,
  VerificationRequest
} from "@/lib/api";

type VerificationRequestPanelProps = {
  accessToken: string;
  displayName: string;
  email: string;
};

type VerificationState =
  | { status: "loading" }
  | {
      status: "ready";
      profile: AlumniProfile;
      requests: VerificationRequest[];
    }
  | { status: "error"; message: string };

const verificationNavItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/directory", label: "Directory" },
  { href: "/communities", label: "Communities" },
  { href: "/initiatives", label: "Initiatives" },
  { href: "/events", label: "Events" },
  { href: "/messages", label: "Messages" },
  { href: "/opportunities", label: "Opportunities" }
];

const verificationMobileNavItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/directory", icon: Search, label: "Network" },
  { href: "/communities", icon: Users, label: "Groups" },
  { href: "/events", icon: CalendarDays, label: "Events" },
  { href: "/profile/setup", icon: Settings, label: "Profile" }
];

const trustItems: Array<{ body: string; icon: LucideIcon; title: string }> = [
  {
    body: "Verification ensures you are connecting with real alumni from across the continent.",
    icon: ShieldCheck,
    title: "Authentic Network"
  },
  {
    body: "Verified members get priority access to grants, fellowships, and voting rights.",
    icon: Rocket,
    title: "Exclusive Access"
  },
  {
    body: "Only verified alumni can run for leadership or participate in official elections.",
    icon: Gavel,
    title: "Official Governance"
  }
];

export function VerificationRequestPanel({
  accessToken,
  displayName,
  email
}: VerificationRequestPanelProps) {
  const [state, setState] = useState<VerificationState>({ status: "loading" });
  const [submittedNote, setSubmittedNote] = useState("");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [evidenceMessage, setEvidenceMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getMyAlumniProfile(accessToken), getMyVerificationRequests(accessToken)])
      .then(([profile, response]) => {
        if (isMounted) {
          setState({ status: "ready", profile, requests: response.requests });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            status: "error",
            message:
              caught instanceof ApiError
                ? caught.message
                : "Verification status could not be loaded."
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const latestRequest = useMemo(() => {
    if (state.status !== "ready") {
      return null;
    }

    return state.requests[0] ?? null;
  }, [state]);

  const hasPendingRequest = latestRequest?.status === "PENDING_REVIEW";
  const canUploadEvidence =
    latestRequest?.status === "PENDING_REVIEW" ||
    latestRequest?.status === "MORE_INFO_REQUESTED";
  const canSubmit =
    state.status === "ready" &&
    state.profile.completion_percentage === 100 &&
    !hasPendingRequest;
  const latestAffiliation =
    state.status === "ready" ? state.profile.program_affiliations[0] ?? null : null;
  const profileCompletion =
    state.status === "ready" ? state.profile.completion_percentage : 0;
  const profileInitials = getInitials(displayName, email);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== "ready") {
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);
    try {
      const request = await submitVerificationRequest(accessToken, {
        submitted_note: submittedNote
      });
      setState({
        status: "ready",
        profile: state.profile,
        requests: [request, ...state.requests]
      });
      setSubmittedNote("");
      setSuccessMessage("Verification request submitted.");
    } catch (caught) {
      setState({
        status: "error",
        message:
          caught instanceof ApiError
            ? caught.message
            : "Verification request could not be submitted."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEvidenceUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== "ready" || !latestRequest || !evidenceFile) {
      return;
    }

    setIsUploadingEvidence(true);
    setEvidenceMessage(null);
    try {
      const evidence = await uploadVerificationEvidence(accessToken, latestRequest.id, {
        file: evidenceFile,
        label: evidenceLabel
      });
      setState({
        status: "ready",
        profile: state.profile,
        requests: state.requests.map((request) =>
          request.id === latestRequest.id
            ? { ...request, evidence: [evidence, ...request.evidence] }
            : request
        )
      });
      setEvidenceFile(null);
      setEvidenceLabel("");
      setEvidenceMessage("Evidence uploaded.");
      event.currentTarget.reset();
    } catch (caught) {
      setEvidenceMessage(
        caught instanceof ApiError ? caught.message : "Evidence file could not be uploaded."
      );
    } finally {
      setIsUploadingEvidence(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f9f9ff] pb-24 text-[#191c21] lg:pb-0">
      <header className="sticky top-0 z-40 border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-8">
            <Link className="focus-ring shrink-0 rounded-lg" href="/dashboard">
              <Image
                alt="YALUMNI"
                className="block h-auto w-[132px] object-contain"
                height={34}
                priority
                src="/brand/yalumni-logo-horizontal.svg"
                width={156}
              />
            </Link>
            <nav aria-label="Member navigation" className="hidden items-center gap-6 xl:flex">
              {verificationNavItems.map((item) => (
                <Link
                  className="focus-ring rounded-md text-sm font-bold text-[#424751] transition hover:text-primary"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              aria-label="Notifications"
              className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full text-[#424751] transition hover:bg-[#f3f3fa] hover:text-primary"
              href="/dashboard"
            >
              <Bell aria-hidden="true" className="h-5 w-5" />
            </Link>
            <Link
              aria-label="Settings"
              className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full text-[#424751] transition hover:bg-[#f3f3fa] hover:text-primary"
              href="/profile/setup"
            >
              <Settings aria-hidden="true" className="h-5 w-5" />
            </Link>
            <div className="hidden items-center gap-3 rounded-full border border-border bg-white py-1 pl-1 pr-3 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {profileInitials}
              </div>
              <div className="max-w-40 truncate text-xs font-semibold text-[#424751]">
                {email}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:px-8 lg:grid-cols-12 lg:py-12">
        <section className="lg:col-span-8">
          <div className="mb-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  Verification Process
                </span>
                <h1 className="mt-2 font-display text-3xl font-semibold text-[#191c21] sm:text-4xl">
                  Credentials Submission
                </h1>
              </div>
              <span className="shrink-0 text-sm font-semibold text-[#424751]">
                Step 3 of 5
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#e2e2e9]">
              <div className="h-full w-3/5 rounded-full bg-primary" />
            </div>
          </div>

          {state.status === "loading" ? (
            <p className="rounded-xl border border-border bg-white p-6 text-sm font-semibold text-[#424751]">
              Loading verification status...
            </p>
          ) : null}

          {state.status === "error" ? (
            <p className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
              {state.message}
            </p>
          ) : null}

          {state.status === "ready" ? (
            <div className="grid gap-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatusMetric label="Profile" value={`${profileCompletion}%`} />
                <StatusMetric label="Requests" value={state.requests.length} />
                <StatusMetric label="Latest" value={formatStatus(latestRequest?.status)} />
              </div>

              <section className="rounded-xl border border-border bg-white p-6 shadow-sm md:p-8">
                <form className="grid gap-8" onSubmit={handleSubmit}>
                  <div className="grid gap-6 md:grid-cols-2">
                    <ReadOnlyField
                      label="Regional Leadership Center / Cohort"
                      value={latestAffiliation?.program_name ?? "No program affiliation recorded"}
                    />
                    <ReadOnlyField
                      label="Completion Year"
                      value={
                        latestAffiliation?.cohort_year
                          ? String(latestAffiliation.cohort_year)
                          : "Year not recorded"
                      }
                    />
                  </div>

                  <label className="grid gap-2 text-sm font-semibold text-[#424751]">
                    Submission note
                    <textarea
                      className="min-h-28 rounded-lg border border-[#c2c6d3] bg-white px-4 py-3 text-sm font-normal leading-6 text-[#191c21] outline-none transition focus:border-primary"
                      onChange={(event) => setSubmittedNote(event.target.value)}
                      placeholder="Add context about your YALI program, chapter involvement, or evidence admins should review."
                      value={submittedNote}
                    />
                  </label>

                  <div className="rounded-xl border-2 border-dashed border-[#c2c6d3] bg-[#f3f3fa] p-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#d7e2ff] text-primary">
                      <CloudUpload aria-hidden="true" className="h-8 w-8" />
                    </div>
                    <h2 className="mt-5 font-display text-xl font-semibold text-[#191c21]">
                      Upload Certificate or Invitation Letter
                    </h2>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#424751]">
                      Submit your verification request first, then attach official PDFs, digital
                      badges, or high-quality images for admin review.
                    </p>
                    <div className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-[#424751]">
                      <Info aria-hidden="true" className="h-4 w-4" />
                      PDF, JPEG, PNG, or WebP evidence is supported.
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                      className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg px-5 text-sm font-bold text-[#424751] transition hover:bg-[#f3f3fa] hover:text-primary"
                      href="/profile/program-affiliation"
                    >
                      Back to Step 2
                    </Link>
                    <button
                      className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-8 text-sm font-bold text-white shadow-md transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!canSubmit || isSubmitting}
                      type="submit"
                    >
                      {isSubmitting ? "Submitting..." : "Verify and Continue"}
                    </button>
                  </div>

                  {successMessage ? (
                    <p className="flex items-center gap-2 text-sm font-semibold text-secondary">
                      <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                      {successMessage}
                    </p>
                  ) : null}
                  {!canSubmit ? (
                    <p className="text-sm font-semibold text-[#424751]">
                      {hasPendingRequest
                        ? "A request is already waiting for review."
                        : "Complete your profile to 100% before submitting."}
                    </p>
                  ) : null}
                </form>
              </section>

              {latestRequest ? (
                <section className="grid gap-5 rounded-xl border border-border bg-white p-6 shadow-sm md:p-8">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                        Latest request
                      </p>
                      <h2 className="mt-2 font-display text-2xl font-semibold text-[#191c21]">
                        {formatStatus(latestRequest.status)}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-[#424751]">
                        Submitted {new Date(latestRequest.created_at).toLocaleString()}
                      </p>
                    </div>
                    {latestRequest.reviewed_at ? (
                      <time
                        className="text-sm font-semibold text-[#424751]"
                        dateTime={latestRequest.reviewed_at}
                      >
                        Reviewed {new Date(latestRequest.reviewed_at).toLocaleString()}
                      </time>
                    ) : null}
                  </div>

                  {latestRequest.reviewer_note ? (
                    <p className="rounded-lg border border-border bg-[#f3f3fa] px-4 py-3 text-sm leading-6 text-[#424751]">
                      {latestRequest.reviewer_note}
                    </p>
                  ) : null}

                  <EvidenceList evidence={latestRequest.evidence} />

                  <form className="grid gap-4 border-t border-border pt-5" onSubmit={handleEvidenceUpload}>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-[#191c21]">
                        Verification evidence
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-[#424751]">
                        Add a PDF or image that helps admins confirm your YALI program or chapter
                        record.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[0.85fr_1fr]">
                      <label className="grid gap-2 text-sm font-semibold text-[#424751]">
                        Evidence label
                        <input
                          className="h-11 rounded-lg border border-[#c2c6d3] bg-white px-4 text-sm font-normal text-[#191c21] outline-none transition focus:border-primary"
                          maxLength={120}
                          onChange={(event) => setEvidenceLabel(event.target.value)}
                          placeholder="Certificate, cohort letter, badge"
                          value={evidenceLabel}
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-[#424751]">
                        File
                        <input
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          className="h-11 rounded-lg border border-[#c2c6d3] bg-white px-3 py-2 text-sm font-normal text-[#191c21] file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                          onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
                          type="file"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        className="focus-ring rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!canUploadEvidence || !evidenceFile || isUploadingEvidence}
                        type="submit"
                      >
                        {isUploadingEvidence ? "Uploading..." : "Upload evidence"}
                      </button>
                      <p className="text-sm font-semibold text-[#424751]">
                        {canUploadEvidence
                          ? "PDF, JPEG, PNG, or WebP up to 5 MB."
                          : "Evidence uploads are closed after final review."}
                      </p>
                      {evidenceMessage ? (
                        <p className="text-sm font-semibold text-secondary">{evidenceMessage}</p>
                      ) : null}
                    </div>
                  </form>
                </section>
              ) : null}
            </div>
          ) : null}
        </section>

        <aside className="space-y-6 lg:col-span-4">
          <section className="rounded-xl border border-secondary bg-[#eafff3] p-6 text-[#005235]">
            <div className="mb-5 flex items-center gap-3">
              <ShieldCheck aria-hidden="true" className="h-7 w-7 text-primary" />
              <h2 className="font-display text-xl font-semibold text-primary">
                Why Verify?
              </h2>
            </div>
            <div className="grid gap-4">
              {trustItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div className="flex gap-4" key={item.title}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/70 text-secondary">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 opacity-85">{item.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="relative h-72 overflow-hidden rounded-xl border border-border lg:h-80">
            <Image
              alt="YALI alumni community workshop"
              className="object-cover transition duration-700 hover:scale-105"
              fill
              sizes="(max-width: 1024px) 100vw, 420px"
              src="/brand/landing-gathering.png"
            />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-primary/85 to-transparent p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-85">
                Pan-African Network
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold leading-tight">
                Join verified change-makers
              </h3>
            </div>
          </section>

          <section className="rounded-lg border-l-4 border-accent bg-[#e7e8ef] p-4">
            <p className="text-sm italic leading-6 text-[#424751]">
              Verification protects the credibility of the network and the opportunities shared
              inside it.
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[#191c21]">
              YALUMNI Trust Desk
            </p>
          </section>
        </aside>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-white px-2 py-2 lg:hidden"
      >
        {verificationMobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/profile/setup";
          return (
            <Link
              className={`focus-ring flex min-h-12 flex-col items-center justify-center rounded-lg text-[10px] font-bold uppercase transition ${
                isActive ? "text-primary" : "text-[#737783]"
              }`}
              href={item.href}
              key={item.href}
            >
              <Icon aria-hidden="true" className="mb-1 h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </main>
  );
}

function EvidenceList({ evidence }: { evidence: VerificationRequest["evidence"] }) {
  if (evidence.length === 0) {
    return (
      <p className="text-sm font-semibold text-[#424751]">
        No evidence files attached yet.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-[#f9f9ff] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#424751]">
        Attached evidence
      </p>
      <div className="mt-2 grid gap-2">
        {evidence.map((item) => (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm" key={item.id}>
            <span className="inline-flex items-center gap-2 font-semibold text-[#191c21]">
              <FileText aria-hidden="true" className="h-4 w-4 text-primary" />
              {item.label || item.file_name}
            </span>
            <span className="text-[#424751]">{formatBytes(item.file_size_bytes)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#424751]">
      {label}
      <span className="min-h-12 rounded-lg border border-[#c2c6d3] bg-[#f9f9ff] px-4 py-3 text-sm font-semibold text-[#191c21]">
        {value}
      </span>
    </label>
  );
}

function StatusMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#424751]">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold text-primary">{value}</p>
    </div>
  );
}

function getInitials(displayName: string, email: string) {
  const source = displayName.trim() || email;
  const initials = source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "YA";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatStatus(status?: string) {
  if (!status) {
    return "Not submitted";
  }

  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
