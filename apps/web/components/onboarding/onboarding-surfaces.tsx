"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Circle,
  FileUp,
  HelpCircle,
  Info,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import {
  AlumniProfile,
  VerificationRequest,
  getMyAlumniProfile,
  getMyVerificationRequests
} from "@/lib/api";

const progressSteps = ["Profile", "Regional", "Commitment", "Verification", "Complete"] as const;

type OnboardingLiveSnapshot = {
  error: string | null;
  isLoading: boolean;
  latestRequest: VerificationRequest | null;
  profile: AlumniProfile | null;
};

export function OnboardingFlowPage() {
  return (
    <ProtectedRoute
      description="Continue the member onboarding flow."
      title="Welcome to the network"
    >
      {({ accessToken, user }) => (
        <OnboardingFlowContent accessToken={accessToken} displayName={user.display_name} />
      )}
    </ProtectedRoute>
  );
}

export function VerificationSubmittedPage() {
  return (
    <ProtectedRoute
      description="Review what happens after submitting alumni verification."
      title="Verification submitted"
    >
      {({ accessToken, user }) => (
        <VerificationSubmittedContent accessToken={accessToken} displayName={user.display_name} />
      )}
    </ProtectedRoute>
  );
}

function OnboardingFlowContent({
  accessToken,
  displayName
}: {
  accessToken: string;
  displayName: string;
}) {
  const snapshot = useOnboardingSnapshot(accessToken);
  const statusLabel = snapshot.isLoading
    ? "Loading"
    : formatStatus(snapshot.latestRequest?.status ?? null);

  return (
    <main className="min-h-screen bg-[#f9f9ff] text-[#191c21]">
      <header className="sticky top-0 z-40 border-b border-[#c2c6d3] bg-white">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-6">
          <Link className="focus-ring flex items-center gap-3 rounded-md" href="/dashboard">
            <span className="font-display text-xl font-black tracking-tight text-primary">YALI</span>
            <span className="h-4 w-px bg-[#c2c6d3]" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#424751]">
              Network
            </span>
          </Link>
          <Link
            aria-label="Close onboarding"
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full text-[#424751] transition hover:bg-[#ededf5]"
            href="/dashboard"
          >
            <X aria-hidden="true" className="h-6 w-6" />
          </Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-md overflow-hidden px-6 pb-32 pt-8">
        <div className="pointer-events-none absolute -right-24 top-8 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-24 h-80 w-80 rounded-full bg-secondary/15 blur-3xl" />

        <div className="relative">
          <div className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                Step 2 of 4
              </span>
              <span className="text-xs font-bold tracking-[0.12em] text-[#424751]">
                Verification
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((step) => (
                <span
                  aria-hidden="true"
                  className={`h-1.5 rounded-full ${step < 2 ? "bg-primary" : "bg-[#e2e2e9]"}`}
                  key={step}
                />
              ))}
            </div>
          </div>

          <h1 className="font-display text-[32px] font-semibold leading-tight text-[#191c21]">
            Verify Your Alumni Status
          </h1>
          <p className="mt-3 text-base leading-7 text-[#424751]">
            To maintain the integrity of our network, we require a quick verification of your program completion.
          </p>

          <div className="mt-6 rounded-xl border border-[#d8dce8] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                  Signed in as
                </p>
                <p className="mt-1 font-display text-lg font-semibold text-[#191c21]">
                  {formatDisplayName(displayName)}
                </p>
              </div>
              <span className="rounded-full bg-[#d7e2ff] px-3 py-1 text-xs font-bold text-primary">
                {statusLabel}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <LiveMetric
                label="Profile"
                value={snapshot.isLoading ? "Loading" : formatPercent(snapshot.profile?.completion_percentage)}
              />
              <LiveMetric
                label="Programs"
                value={
                  snapshot.isLoading
                    ? "Loading"
                    : formatCount(snapshot.profile?.program_affiliations.length ?? null)
                }
              />
            </div>
            {snapshot.error ? (
              <p className="mt-4 text-xs font-semibold text-danger">{snapshot.error}</p>
            ) : null}
          </div>

          <div className="mt-8 grid gap-6">
            <Link
              className="focus-ring group flex min-h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c2c6d3] bg-[#f3f3fa] p-8 text-center transition hover:border-primary"
              href="/verification"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#d7e2ff] text-primary transition group-hover:scale-105">
                <FileUp aria-hidden="true" className="h-7 w-7" />
              </span>
              <span className="mt-5 font-display text-xl font-semibold text-[#191c21]">
                Upload Certificate
              </span>
              <span className="mt-2 text-sm text-[#424751]">PDF, JPG, or PNG (Max 5MB)</span>
            </Link>

            <div className="flex items-center gap-5">
              <span className="h-px flex-1 bg-[#c2c6d3]" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#424751]">
                or
              </span>
              <span className="h-px flex-1 bg-[#c2c6d3]" aria-hidden="true" />
            </div>

            <div className="rounded-xl border border-[#c2c6d3] bg-white p-6 shadow-sm">
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-[#191c21]" htmlFor="network-code">
                Network Access Code
              </label>
              <div className="relative mt-3">
                <input
                  className="h-14 w-full rounded-lg border-0 bg-[#e7e8ef] px-4 pr-12 font-mono text-lg tracking-[0.3em] text-[#191c21] placeholder:text-[#a7acba] focus:ring-2 focus:ring-primary"
                  id="network-code"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="Enter 8-digit code"
                  type="text"
                />
                <Info aria-hidden="true" className="absolute right-4 top-4 h-6 w-6 text-primary" />
              </div>
              <p className="mt-4 text-sm italic leading-6 text-[#424751]">
                Verification usually takes less than 24 hours.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-[#e5e7eb] bg-white p-4">
              <ShieldCheck aria-hidden="true" className="h-6 w-6 shrink-0 text-secondary" />
              <p className="text-sm leading-6 text-[#424751]">
                Your data is secured using enterprise-grade encryption and only used for identity verification.
              </p>
            </div>

            <div className="relative mt-10 h-48 overflow-hidden rounded-3xl bg-primary">
              <Image
                alt="YALI alumni leaders"
                className="object-cover opacity-65 mix-blend-overlay"
                fill
                sizes="(max-width: 768px) 100vw, 448px"
                src="/brand/landing-hero.png"
              />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <h2 className="font-display text-lg font-semibold leading-tight">
                  Empowering Africa&apos;s Next Generation of Leaders
                </h2>
                <p className="mt-1 text-xs text-white/80">
                  Join 200,000+ change-makers across the continent.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-[#c2c6d3] bg-white p-6">
        <div className="mx-auto flex max-w-md gap-4">
          <Link
            className="focus-ring inline-flex h-12 flex-1 items-center justify-center rounded-lg border border-primary text-base font-semibold text-primary transition hover:bg-[#d7e2ff]"
            href="/profile/program-affiliation"
          >
            Back
          </Link>
          <Link
            className="focus-ring inline-flex h-12 flex-[2] items-center justify-center rounded-lg bg-primary text-base font-semibold text-white shadow-md transition hover:bg-[#003d7d]"
            href="/verification"
          >
            Continue
          </Link>
        </div>
      </footer>
    </main>
  );
}

function VerificationSubmittedContent({
  accessToken,
  displayName
}: {
  accessToken: string;
  displayName: string;
}) {
  const snapshot = useOnboardingSnapshot(accessToken);
  const requestStatus = snapshot.isLoading
    ? "Loading"
    : formatStatus(snapshot.latestRequest?.status ?? null);
  const submittedDate = snapshot.isLoading
    ? "Loading"
    : formatSubmittedDate(snapshot.latestRequest?.created_at ?? null);
  const evidenceCount = snapshot.isLoading
    ? "Loading"
    : formatCount(snapshot.latestRequest?.evidence.length ?? null);

  return (
    <main className="flex min-h-screen flex-col bg-[#f9f9ff] text-[#191c21]">
      <header className="sticky top-0 z-40 border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link className="focus-ring rounded-md font-display text-xl font-black text-primary" href="/dashboard">
            YALI Alumni
          </Link>
          <span className="hidden text-sm font-semibold text-[#737783] md:inline">Step 5 of 5</span>
          <Link
            aria-label="Help center"
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full text-[#737783] transition hover:bg-[#ededf5]"
            href="/dashboard"
          >
            <HelpCircle aria-hidden="true" className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#8af5be] text-[#00714b]">
            <ShieldCheck aria-hidden="true" className="h-10 w-10" />
          </div>
          <h1 className="mt-8 font-display text-[32px] font-semibold leading-tight text-[#191c21]">
            Verification Submitted
          </h1>
          <p className="mt-4 text-base leading-7 text-[#424751]">
            {snapshot.latestRequest
              ? `Your latest verification request is ${formatStatus(snapshot.latestRequest.status).toLowerCase()}. Welcome to the final stage of your onboarding journey.`
              : "Your application to join the Pan-African Network is now under review. Welcome to the final stage of your onboarding journey."}
          </p>
          {snapshot.error ? (
            <p className="mt-4 text-sm font-semibold text-danger">{snapshot.error}</p>
          ) : null}
        </div>

        <div className="mx-auto mt-12 max-w-3xl">
          <div className="grid grid-cols-[auto_1fr_auto_1fr_auto_1fr_auto_1fr_auto] items-start gap-2">
            {progressSteps.map((step, index) => (
              <ProgressStep isLast={index === progressSteps.length - 1} key={step} label={step} />
            ))}
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
          <LiveMetric
            label="Member"
            value={formatDisplayName(displayName)}
          />
          <LiveMetric
            label="Submitted"
            value={submittedDate}
          />
          <LiveMetric
            label="Evidence"
            value={evidenceCount}
          />
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-12">
          <section className="rounded-xl border border-[#e5e7eb] bg-white p-8 md:col-span-7">
            <h2 className="font-display text-2xl font-semibold text-[#191c21]">
              First Action Checklist
            </h2>
            <p className="mt-6 text-sm leading-6 text-[#424751]">
              While our team verifies your credentials, you can start engaging with the community immediately.
            </p>

            <div className="mt-8 grid gap-4">
              <ChecklistLink
                body="Post a brief bio to connect with local leaders in your region."
                href="/communities"
                title="Introduce yourself in your country chapter"
              />
              <ChecklistLink
                body="Browse the directory for verified alumni who match your professional goals."
                href="/mentorship/find"
                title="Find a mentor"
              />
              <ChecklistLink
                body="Register for virtual networking sessions and regional summits."
                href="/events"
                title="Explore upcoming events"
              />
            </div>

            <Link
              className="focus-ring mt-10 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-lg bg-primary px-5 text-lg font-semibold text-white shadow-lg transition hover:bg-[#003d7d]"
              href="/dashboard"
            >
              Go to Dashboard
              <ArrowRight aria-hidden="true" className="h-6 w-6" />
            </Link>
          </section>

          <aside className="space-y-6 md:col-span-5">
            <div className="relative aspect-video overflow-hidden rounded-xl md:aspect-square">
              <Image
                alt="YALI alumni community"
                className="object-cover"
                fill
                sizes="(max-width: 768px) 100vw, 420px"
                src="/brand/landing-hero.png"
              />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/65 to-transparent p-6 text-white">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                  Community Impact
                </span>
                <h3 className="mt-2 font-display text-2xl font-semibold leading-tight">
                  Join 150,000+ Changemakers
                </h3>
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-[#d7e2ff]/55 p-6">
              <div className="flex items-center gap-3">
                <Info aria-hidden="true" className="h-6 w-6 text-primary" />
                <h2 className="font-display text-lg font-semibold text-primary">
                  What happens next?
                </h2>
              </div>
              <div className="mt-5 rounded-lg border border-primary/20 bg-white/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                  Live request status
                </p>
                <p className="mt-1 font-display text-lg font-semibold text-[#191c21]">{requestStatus}</p>
                <p className="mt-2 text-sm leading-6 text-[#424751]">
                  Profile completion: {formatPercent(snapshot.profile?.completion_percentage)}
                </p>
              </div>
              <ol className="mt-5 grid gap-4 text-sm leading-6 text-[#424751]">
                <NextStep number={1}>
                  Our regional administrators will review your LinkedIn profile and YALI certification.
                </NextStep>
                <NextStep number={2}>
                  You&apos;ll receive an email notification once your verified badge is activated, usually within 24-48 hours.
                </NextStep>
                <NextStep number={3}>
                  Full access to the Initiatives and Communities tabs will be granted upon approval.
                </NextStep>
              </ol>
            </div>
          </aside>
        </div>
      </section>

      <footer className="border-t border-[#e5e7eb] bg-white py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 text-sm text-[#424751] md:flex-row">
          <p>© 2024 YALI Alumni Pan-African Network. All rights reserved.</p>
          <div className="flex gap-6">
            <Link className="focus-ring rounded-md hover:text-primary" href="/dashboard">
              Privacy Policy
            </Link>
            <Link className="focus-ring rounded-md hover:text-primary" href="/dashboard">
              Terms of Service
            </Link>
            <Link className="focus-ring rounded-md hover:text-primary" href="/dashboard">
              Help Center
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function useOnboardingSnapshot(accessToken: string): OnboardingLiveSnapshot {
  const [snapshot, setSnapshot] = useState<OnboardingLiveSnapshot>({
    error: null,
    isLoading: true,
    latestRequest: null,
    profile: null
  });

  useEffect(() => {
    let isMounted = true;

    async function loadSnapshot() {
      const [profileResult, verificationResult] = await Promise.allSettled([
        getMyAlumniProfile(accessToken),
        getMyVerificationRequests(accessToken)
      ]);

      if (!isMounted) {
        return;
      }

      const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
      const latestRequest =
        verificationResult.status === "fulfilled"
          ? verificationResult.value.requests[0] ?? null
          : null;
      const error =
        profileResult.status === "rejected" && verificationResult.status === "rejected"
          ? "Live profile and verification status could not be loaded."
          : null;

      setSnapshot({
        error,
        isLoading: false,
        latestRequest,
        profile
      });
    }

    void loadSnapshot();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  return snapshot;
}

function LiveMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-white/80 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#737783]">{label}</p>
      <p className="mt-1 truncate font-display text-base font-semibold text-[#191c21]">{value}</p>
    </div>
  );
}

function ProgressStep({ isLast, label }: { isLast: boolean; label: string }) {
  return (
    <>
      <div className="flex flex-col items-center">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white ${
            isLast ? "ring-4 ring-[#d7e2ff]" : ""
          }`}
        >
          {isLast ? <Sparkles aria-hidden="true" className="h-4 w-4" /> : <Check aria-hidden="true" className="h-4 w-4" />}
        </span>
        <span className="mt-2 text-center text-xs font-bold tracking-[0.08em] text-primary">{label}</span>
      </div>
      {isLast ? null : <span className="mt-4 h-0.5 bg-primary" aria-hidden="true" />}
    </>
  );
}

function ChecklistLink({ body, href, title }: { body: string; href: string; title: string }) {
  return (
    <Link
      className="focus-ring group flex items-start rounded-lg border border-[#c2c6d3] bg-[#f3f3fa] p-4 transition hover:border-primary"
      href={href}
    >
      <Circle aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-[#737783] transition group-hover:text-primary" />
      <span className="ml-4">
        <span className="block font-display text-lg font-semibold text-[#191c21]">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-[#424751]">{body}</span>
      </span>
    </Link>
  );
}

function NextStep({ children, number }: { children: string; number: number }) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-3">
      <span className="font-bold text-primary">{number}.</span>
      <span>{children}</span>
    </li>
  );
}

function formatCount(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Not started";
  }

  return new Intl.NumberFormat("en").format(value);
}

function formatDisplayName(displayName: string) {
  return displayName.trim() || "YALUMNI member";
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Not started";
  }

  return `${Math.round(value)}%`;
}

function formatStatus(value: string | null) {
  if (!value) {
    return "Not submitted";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatSubmittedDate(value: string | null) {
  if (!value) {
    return "Not submitted";
  }

  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}
