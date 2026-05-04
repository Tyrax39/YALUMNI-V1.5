"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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
                <EvidenceList evidence={latestRequest.evidence} />
              </article>
            ) : null}

            {latestRequest ? (
              <form
                className="grid gap-3 rounded-lg border border-border bg-surface p-4"
                onSubmit={handleEvidenceUpload}
              >
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">
                    Verification evidence
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Add a PDF or image that helps admins confirm your YALI program or chapter
                    record.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-[0.85fr_1fr]">
                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    Evidence label
                    <input
                      className="h-11 rounded-lg border border-border bg-white px-4 text-sm font-normal text-ink outline-none transition focus:border-primary"
                      maxLength={120}
                      onChange={(event) => setEvidenceLabel(event.target.value)}
                      placeholder="Certificate, cohort letter, badge"
                      value={evidenceLabel}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    File
                    <input
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      className="h-11 rounded-lg border border-border bg-white px-3 py-2 text-sm font-normal text-ink file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
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
                  <p className="text-sm font-semibold text-muted">
                    {canUploadEvidence
                      ? "PDF, JPEG, PNG, or WebP up to 5 MB."
                      : "Evidence uploads are closed after final review."}
                  </p>
                  {evidenceMessage ? (
                    <p className="text-sm font-semibold text-secondary">{evidenceMessage}</p>
                  ) : null}
                </div>
              </form>
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

function EvidenceList({ evidence }: { evidence: VerificationRequest["evidence"] }) {
  if (evidence.length === 0) {
    return (
      <p className="mt-3 text-sm font-semibold text-muted">
        No evidence files attached yet.
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        Attached evidence
      </p>
      <div className="mt-2 grid gap-2">
        {evidence.map((item) => (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm" key={item.id}>
            <span className="font-semibold text-ink">{item.label || item.file_name}</span>
            <span className="text-muted">{formatBytes(item.file_size_bytes)}</span>
          </div>
        ))}
      </div>
    </div>
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
