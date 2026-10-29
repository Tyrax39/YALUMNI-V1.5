"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { ArrowLeft, CheckCircle, TicketCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { acceptCommunityInvitation, ApiError, Community } from "@/lib/api";

type CommunityInvitationAcceptPageProps = {
  initialToken?: string;
};

export function CommunityInvitationAcceptPage({
  initialToken = ""
}: CommunityInvitationAcceptPageProps) {
  return (
    <main className="min-h-screen bg-surface">
      <ProtectedRoute
        description="Community invitations are available to signed-in YALUMNI members."
        title="Community invitation"
      >
        {({ accessToken }) => (
          <CommunityInvitationAcceptContent
            accessToken={accessToken}
            initialToken={initialToken}
          />
        )}
      </ProtectedRoute>
    </main>
  );
}

function CommunityInvitationAcceptContent({
  accessToken,
  initialToken
}: {
  accessToken: string;
  initialToken: string;
}) {
  const [token, setToken] = useState(initialToken);
  const [acceptedCommunity, setAcceptedCommunity] = useState<Community | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setAcceptedCommunity(null);
    setIsSubmitting(true);
    try {
      setAcceptedCommunity(await acceptCommunityInvitation(accessToken, token.trim()));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Invitation could not be accepted.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
      <section className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <Link
          className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
          href="/dashboard"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Dashboard
        </Link>
        <div className="mt-8 border-y border-border bg-white px-5 py-6 shadow-soft sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
            Community invitation
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold text-ink">
            Accept invitation
          </h1>
          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            <label className="text-sm font-semibold text-ink">
              Invitation token
              <textarea
                className="focus-ring mt-2 min-h-28 w-full rounded-lg border border-border bg-surface px-3 py-3 text-sm leading-6 text-ink"
                onChange={(event) => setToken(event.target.value)}
                required
                value={token}
              />
            </label>
            <button
              className="focus-ring inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              <TicketCheck aria-hidden="true" className="h-4 w-4" />
              {isSubmitting ? "Accepting..." : "Accept invitation"}
            </button>
          </form>
          {error ? (
            <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
          {acceptedCommunity ? (
            <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <CheckCircle aria-hidden="true" className="h-4 w-4" />
                Joined {acceptedCommunity.name}.
              </p>
              <Link
                className="focus-ring mt-3 inline-flex min-h-10 items-center rounded-lg border border-emerald-300 px-3 text-sm font-semibold text-emerald-800 transition hover:bg-white"
                href={`/communities/${acceptedCommunity.id}`}
              >
                Open community
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
