"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  const onboardingState = useMemo(() => buildOnboardingState(snapshot), [snapshot]);
  const statusLabel = snapshot.isLoading ? "Loading" : onboardingState.verificationStatusLabel;
  const readinessSignals = useMemo(() => buildOnboardingSignals(snapshot), [snapshot]);
  const readinessPriorities = useMemo(() => buildOnboardingPriorities(snapshot), [snapshot]);

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
                Step {onboardingState.currentStep} of 4
              </span>
              <span className="text-xs font-bold tracking-[0.12em] text-[#424751]">
                {onboardingState.currentStepLabel}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((step) => (
                <span
                  aria-hidden="true"
                  className={`h-1.5 rounded-full ${step < onboardingState.currentStep ? "bg-primary" : "bg-[#e2e2e9]"}`}
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
            <div className="mt-4 grid gap-3">
              {onboardingState.items.map((item) => (
                <OnboardingChecklistRow item={item} key={item.label} />
              ))}
            </div>
            {snapshot.error ? (
              <p className="mt-4 text-xs font-semibold text-danger">{snapshot.error}</p>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4">
            <div className="rounded-xl border border-[#d8dce8] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                    Readiness signals
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#424751]">
                    Live onboarding state from your current profile and verification records.
                  </p>
                </div>
                <span className="rounded-full bg-[#eef0f5] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#5c6470]">
                  Live
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {readinessSignals.map((signal) => (
                  <OnboardingSignalRow key={signal.label} label={signal.label} value={signal.value} />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#d8dce8] bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                Current blockers
              </p>
              <div className="mt-4 grid gap-3">
                {readinessPriorities.map((item) => (
                  <OnboardingPriorityRow item={item} key={item.title} />
                ))}
              </div>
            </div>
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
            href={onboardingState.secondaryAction.href}
          >
            {onboardingState.secondaryAction.label}
          </Link>
          <Link
            className="focus-ring inline-flex h-12 flex-[2] items-center justify-center rounded-lg bg-primary text-base font-semibold text-white shadow-md transition hover:bg-[#003d7d]"
            href={onboardingState.primaryAction.href}
          >
            {onboardingState.primaryAction.label}
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

type OnboardingChecklistItem = {
  detail: string;
  href: string;
  label: string;
  status: "complete" | "in-progress" | "todo";
};

type OnboardingPriorityItem = {
  detail: string;
  href: string;
  label: string;
  title: string;
  tone: "complete" | "in-progress" | "todo";
};

function OnboardingChecklistRow({ item }: { item: OnboardingChecklistItem }) {
  const toneClass =
    item.status === "complete"
      ? "bg-[#dff8ea] text-[#00714b]"
      : item.status === "in-progress"
        ? "bg-[#fff1d6] text-[#9a5c00]"
        : "bg-[#eef0f5] text-[#5c6470]";
  const statusLabel =
    item.status === "complete"
      ? "Complete"
      : item.status === "in-progress"
        ? "In progress"
        : "Next";

  return (
    <Link
      className="focus-ring flex items-center justify-between gap-3 rounded-lg border border-[#e5e7eb] bg-[#f8f8fc] px-4 py-3 transition hover:border-primary"
      href={item.href}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#191c21]">{item.label}</p>
        <p className="mt-1 text-xs leading-5 text-[#5c6470]">{item.detail}</p>
      </div>
      <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${toneClass}`}>
        {statusLabel}
      </span>
    </Link>
  );
}

function OnboardingSignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[#e5e7eb] bg-[#f8f8fc] px-4 py-3">
      <span className="text-sm font-semibold text-[#5c6470]">{label}</span>
      <span className="text-sm font-bold text-[#191c21]">{value}</span>
    </div>
  );
}

function OnboardingPriorityRow({ item }: { item: OnboardingPriorityItem }) {
  const toneClass =
    item.tone === "complete"
      ? "bg-[#dff8ea] text-[#00714b]"
      : item.tone === "in-progress"
        ? "bg-[#fff1d6] text-[#9a5c00]"
        : "bg-[#eef0f5] text-[#5c6470]";

  return (
    <Link
      className="focus-ring flex items-center justify-between gap-3 rounded-lg border border-[#e5e7eb] bg-[#f8f8fc] px-4 py-3 transition hover:border-primary"
      href={item.href}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#191c21]">{item.title}</p>
        <p className="mt-1 text-xs leading-5 text-[#5c6470]">{item.detail}</p>
      </div>
      <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${toneClass}`}>
        {item.label}
      </span>
    </Link>
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

function formatRequestAge(value: string | null) {
  if (!value) {
    return "Not submitted";
  }

  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) {
    return "Date pending";
  }

  const diffMs = Date.now() - createdAt.getTime();
  if (diffMs < 1000 * 60 * 60 * 24) {
    return "<1 day";
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
}

function getNextMilestone(request: VerificationRequest | null) {
  if (!request) {
    return "Submit verification";
  }

  if (request.status === "APPROVED") {
    return "Open member network";
  }

  if (request.status === "PENDING") {
    return "Await trust-team decision";
  }

  if (request.status === "REJECTED") {
    return "Refresh evidence";
  }

  return "Review latest request update";
}

function buildOnboardingState(snapshot: OnboardingLiveSnapshot) {
  const completionPercentage = snapshot.profile?.completion_percentage ?? 0;
  const programCount = snapshot.profile?.program_affiliations.length ?? 0;
  const verificationStatus = snapshot.latestRequest?.status ?? null;

  const profileComplete =
    Boolean(snapshot.profile?.profile_completed_at) || completionPercentage >= 80;
  const programComplete = programCount > 0;
  const verificationSubmitted = Boolean(snapshot.latestRequest);
  const verificationApproved = verificationStatus === "APPROVED";

  const items: OnboardingChecklistItem[] = [
    {
      detail: profileComplete
        ? `Profile completion is at ${formatPercent(completionPercentage)}.`
        : completionPercentage > 0
          ? `Profile completion is at ${formatPercent(completionPercentage)}.`
          : "Add your career details, sector, skills, and profile photo.",
      href: "/profile/setup",
      label: "Complete profile",
      status: profileComplete ? "complete" : completionPercentage > 0 ? "in-progress" : "todo"
    },
    {
      detail: programComplete
        ? `${formatCount(programCount)} program record${programCount === 1 ? "" : "s"} added.`
        : "Add your YALI or partner-program affiliation before verification review.",
      href: "/profile/program-affiliation",
      label: "Add program affiliation",
      status: programComplete ? "complete" : "todo"
    },
    {
      detail: verificationSubmitted
        ? `Latest request status: ${formatStatus(verificationStatus)}.`
        : "Submit your certificate or other evidence so the trust team can review it.",
      href: "/verification",
      label: "Submit verification",
      status: verificationApproved
        ? "complete"
        : verificationSubmitted
          ? "in-progress"
          : "todo"
    },
    {
      detail: verificationSubmitted
        ? "Browse next steps while the verification queue is in progress."
        : "Unlock your first member actions after verification is underway.",
      href: verificationSubmitted ? "/verification/submitted" : "/dashboard",
      label: "Review first actions",
      status: verificationSubmitted ? "in-progress" : "todo"
    }
  ];

  if (!profileComplete) {
    return {
      currentStep: 1,
      currentStepLabel: "Profile",
      items,
      primaryAction: { href: "/profile/setup", label: "Complete profile" },
      secondaryAction: { href: "/dashboard", label: "Exit" },
      verificationStatusLabel: formatStatus(verificationStatus)
    };
  }

  if (!programComplete) {
    return {
      currentStep: 2,
      currentStepLabel: "Program",
      items,
      primaryAction: { href: "/profile/program-affiliation", label: "Add program" },
      secondaryAction: { href: "/profile/setup", label: "Back" },
      verificationStatusLabel: formatStatus(verificationStatus)
    };
  }

  if (!verificationSubmitted) {
    return {
      currentStep: 3,
      currentStepLabel: "Verification",
      items,
      primaryAction: { href: "/verification", label: "Start verification" },
      secondaryAction: { href: "/profile/program-affiliation", label: "Back" },
      verificationStatusLabel: formatStatus(verificationStatus)
    };
  }

  return {
    currentStep: 4,
    currentStepLabel: "First action",
    items,
    primaryAction: {
      href: verificationApproved ? "/directory" : "/verification/submitted",
      label: verificationApproved ? "Open directory" : "Review submission"
    },
    secondaryAction: { href: "/verification", label: "Back" },
    verificationStatusLabel: formatStatus(verificationStatus)
  };
}

function buildOnboardingSignals(snapshot: OnboardingLiveSnapshot) {
  const completionPercentage = snapshot.profile?.completion_percentage ?? 0;
  const programCount = snapshot.profile?.program_affiliations.length ?? 0;
  const evidenceCount = snapshot.latestRequest?.evidence.length ?? 0;
  const verificationStatus = snapshot.latestRequest?.status ?? null;
  const requestAge = formatRequestAge(snapshot.latestRequest?.created_at ?? null);
  const nextMilestone = getNextMilestone(snapshot.latestRequest);

  return [
    { label: "Profile completion", value: snapshot.isLoading ? "Loading" : formatPercent(completionPercentage) },
    { label: "Program records", value: snapshot.isLoading ? "Loading" : formatCount(programCount) },
    { label: "Verification status", value: snapshot.isLoading ? "Loading" : formatStatus(verificationStatus) },
    { label: "Evidence files", value: snapshot.isLoading ? "Loading" : formatCount(evidenceCount) },
    { label: "Request age", value: snapshot.isLoading ? "Loading" : requestAge },
    { label: "Next milestone", value: snapshot.isLoading ? "Loading" : nextMilestone },
    {
      label: "Readiness state",
      value: snapshot.isLoading
        ? "Loading"
        : completionPercentage >= 80 && programCount > 0
          ? verificationStatus === "APPROVED"
            ? "Network ready"
            : verificationStatus
              ? "Awaiting decision"
              : "Ready to submit"
          : "Needs setup"
    }
  ];
}

function buildOnboardingPriorities(snapshot: OnboardingLiveSnapshot): OnboardingPriorityItem[] {
  const completionPercentage = snapshot.profile?.completion_percentage ?? 0;
  const programCount = snapshot.profile?.program_affiliations.length ?? 0;
  const evidenceCount = snapshot.latestRequest?.evidence.length ?? 0;
  const verificationStatus = snapshot.latestRequest?.status ?? null;
  const requestAge = formatRequestAge(snapshot.latestRequest?.created_at ?? null);
  const items: OnboardingPriorityItem[] = [];

  if (completionPercentage < 80) {
    items.push({
      detail: `Profile completion is ${formatPercent(completionPercentage)}. Add missing career and identity details first.`,
      href: "/profile/setup",
      label: "Profile",
      title: "Finish profile setup",
      tone: completionPercentage > 0 ? "in-progress" : "todo"
    });
  }

  if (programCount === 0) {
    items.push({
      detail: "No program affiliation is on file yet for this member record.",
      href: "/profile/program-affiliation",
      label: "Program",
      title: "Add program affiliation",
      tone: "todo"
    });
  }

  if (!snapshot.latestRequest) {
    items.push({
      detail: "Verification has not been submitted yet. Upload certificate evidence to start review.",
      href: "/verification",
      label: "Verify",
      title: "Submit verification evidence",
      tone: "todo"
    });
  } else if (verificationStatus !== "APPROVED") {
    items.push({
      detail:
        evidenceCount > 0
          ? `${formatCount(evidenceCount)} evidence file${evidenceCount === 1 ? "" : "s"} uploaded. Current review age: ${requestAge}.`
          : "A verification request exists, but no evidence files are attached yet.",
      href: "/verification/submitted",
      label: verificationStatus === "PENDING" ? "Review" : "Action",
      title: verificationStatus === "PENDING" ? "Track verification review" : "Review verification status",
      tone: evidenceCount > 0 ? "in-progress" : "todo"
    });
  }

  if (!items.length) {
    items.push({
      detail: "Your current onboarding records indicate that the member account is ready for normal network use.",
      href: "/directory",
      label: "Ready",
      title: "Open the alumni network",
      tone: "complete"
    });
  }

  return items.slice(0, 4);
}
