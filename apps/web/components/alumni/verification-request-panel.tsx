"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  AlumniProfile,
  ApiError,
  getMyAlumniProfile,
  getMyVerificationRequests,
  submitVerificationRequest,
  VerificationRequest
} from "@/lib/api";

type VerificationRequestPanelProps = {
  accessToken: string;
};

type VerificationState =
  | { status: "loading" }
  | {
      status: "ready";
      profile: AlumniProfile;
      requests: VerificationRequest[];
    }
  | { status: "error"; message: string };

export function VerificationRequestPanel({ accessToken }: VerificationRequestPanelProps) {
  const [state, setState] = useState<VerificationState>({ status: "loading" });
  const [submittedNote, setSubmittedNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
  const canSubmit =
    state.status === "ready" &&
    state.profile.completion_percentage === 100 &&
    !hasPendingRequest;

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

  return (
    <section className="mt-10 rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[0.38fr_0.62fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
            Verification
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-ink">
            Submit your profile for alumni verification.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Completed profile and program details are captured as a review snapshot for the admin
            queue.
          </p>
        </div>

        {state.status === "loading" ? (
          <p className="text-sm font-semibold text-muted">Loading verification status...</p>
        ) : null}

        {state.status === "error" ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {state.message}
          </p>
        ) : null}

        {state.status === "ready" ? (
          <div className="grid gap-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatusMetric
                label="Profile"
                value={`${state.profile.completion_percentage}%`}
              />
              <StatusMetric label="Requests" value={state.requests.length} />
              <StatusMetric label="Latest" value={formatStatus(latestRequest?.status)} />
            </div>

            {latestRequest ? (
              <article className="rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink">
                      {formatStatus(latestRequest.status)}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      Submitted {new Date(latestRequest.created_at).toLocaleString()}
                    </p>
                  </div>
                  {latestRequest.reviewed_at ? (
                    <time className="text-sm font-semibold text-muted" dateTime={latestRequest.reviewed_at}>
                      Reviewed {new Date(latestRequest.reviewed_at).toLocaleString()}
                    </time>
                  ) : null}
                </div>
                {latestRequest.reviewer_note ? (
                  <p className="mt-3 rounded-lg border border-border bg-white px-4 py-3 text-sm leading-6 text-muted">
                    {latestRequest.reviewer_note}
                  </p>
                ) : null}
              </article>
            ) : null}

            <form className="grid gap-3" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Submission note
                <textarea
                  className="min-h-24 rounded-lg border border-border bg-white px-4 py-3 text-sm font-normal leading-6 text-ink outline-none transition focus:border-primary"
                  onChange={(event) => setSubmittedNote(event.target.value)}
                  placeholder="Add context about your YALI program, chapter involvement, or evidence admins should review."
                  value={submittedNote}
                />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="focus-ring rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!canSubmit || isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "Submitting..." : "Submit for verification"}
                </button>
                {successMessage ? (
                  <p className="text-sm font-semibold text-secondary">{successMessage}</p>
                ) : null}
                {!canSubmit ? (
                  <p className="text-sm font-semibold text-muted">
                    {hasPendingRequest
                      ? "A request is already waiting for review."
                      : "Complete your profile to 100% before submitting."}
                  </p>
                ) : null}
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function StatusMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-primary">{value}</p>
    </div>
  );
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
