"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  CheckCircle2,
  Download,
  Loader2,
  Plus,
  RefreshCcw,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
  Vote,
  XCircle
} from "lucide-react";
import {
  type ElectionCandidate,
  type ElectionItem,
  type ElectionVoterRollResponse,
  addElectionCandidate,
  closeElection,
  createElection,
  electionAuditExportUrl,
  fetchAdminElections,
  fetchElectionCandidates,
  fetchElectionVoterRoll,
  openElection,
  updateElectionCandidateStatus,
  upsertElectionVoterRoll
} from "@yalumni/frontend-shared";

type ElectionAdminState =
  | { status: "loading" }
  | { elections: ElectionItem[]; status: "ready"; total: number }
  | { message: string; status: "error" };

type ElectionForm = {
  description: string;
  ends_at: string;
  quorum_count: string;
  results_visibility: string;
  scope_label: string;
  starts_at: string;
  summary: string;
  title: string;
};

type CandidateForm = {
  display_name: string;
  headline: string;
  statement: string;
};

const INITIAL_ELECTION_FORM: ElectionForm = {
  description: "",
  ends_at: "",
  quorum_count: "0",
  results_visibility: "AFTER_CLOSE",
  scope_label: "",
  starts_at: "",
  summary: "",
  title: ""
};

const INITIAL_CANDIDATE_FORM: CandidateForm = {
  display_name: "",
  headline: "",
  statement: ""
};

export function LiveElectionAdmin() {
  const [state, setState] = useState<ElectionAdminState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [electionForm, setElectionForm] = useState<ElectionForm>(INITIAL_ELECTION_FORM);
  const [candidateForm, setCandidateForm] = useState<CandidateForm>(INITIAL_CANDIDATE_FORM);
  const [voterEmails, setVoterEmails] = useState("");
  const [candidates, setCandidates] = useState<ElectionCandidate[]>([]);
  const [voterRoll, setVoterRoll] = useState<ElectionVoterRollResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchAdminElections({ status: "ALL" })
      .then((response) => {
        if (!isMounted) {
          return;
        }
        setState({ elections: response.elections, status: "ready", total: response.total });
        if (!selectedElectionId && response.elections[0]) {
          setSelectedElectionId(response.elections[0].id);
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Election admin queue could not load.",
            status: "error"
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [reloadKey, selectedElectionId]);

  useEffect(() => {
    let isMounted = true;
    if (!selectedElectionId) {
      return;
    }
    Promise.allSettled([
      fetchElectionCandidates(selectedElectionId),
      fetchElectionVoterRoll(selectedElectionId)
    ]).then(([candidateResult, voterRollResult]) => {
      if (!isMounted) {
        return;
      }
      setCandidates(candidateResult.status === "fulfilled" ? candidateResult.value : []);
      setVoterRoll(voterRollResult.status === "fulfilled" ? voterRollResult.value : null);
    });
    return () => {
      isMounted = false;
    };
  }, [selectedElectionId, reloadKey]);

  const selectedElection = useMemo(() => {
    return state.status === "ready"
      ? state.elections.find((election) => election.id === selectedElectionId) ?? null
      : null;
  }, [selectedElectionId, state]);

  async function handleCreateElection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("create");
    setMessage(null);
    try {
      const election = await createElection({
        description: electionForm.description,
        ends_at: dateTimeLocalToIso(electionForm.ends_at),
        quorum_count: Number.parseInt(electionForm.quorum_count, 10) || 0,
        results_visibility: electionForm.results_visibility,
        scope_label: electionForm.scope_label.trim() || null,
        scope_type: "PLATFORM",
        starts_at: dateTimeLocalToIso(electionForm.starts_at),
        summary: electionForm.summary,
        title: electionForm.title
      });
      setSelectedElectionId(election.id);
      setElectionForm(INITIAL_ELECTION_FORM);
      setMessage("Election draft created.");
      setReloadKey((current) => current + 1);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Election draft could not be created.");
    } finally {
      setBusy(null);
    }
  }

  async function handleAddCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedElectionId) {
      return;
    }
    setBusy("candidate");
    setMessage(null);
    try {
      await addElectionCandidate(selectedElectionId, {
        display_name: candidateForm.display_name,
        headline: candidateForm.headline.trim() || null,
        statement: candidateForm.statement
      });
      setCandidateForm(INITIAL_CANDIDATE_FORM);
      setMessage("Candidate added.");
      setReloadKey((current) => current + 1);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Candidate could not be added.");
    } finally {
      setBusy(null);
    }
  }

  async function handleCandidateStatus(candidateId: string, status: "ACTIVE" | "REJECTED") {
    if (!selectedElectionId) {
      return;
    }
    setBusy(`candidate:${candidateId}:${status}`);
    setMessage(null);
    try {
      await updateElectionCandidateStatus(selectedElectionId, candidateId, {
        note: `Marked ${status.toLowerCase()} from admin console.`,
        status
      });
      setMessage(`Candidate ${status === "ACTIVE" ? "approved" : "rejected"}.`);
      setReloadKey((current) => current + 1);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Candidate status could not be updated.");
    } finally {
      setBusy(null);
    }
  }

  async function handleVoterRoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedElectionId) {
      return;
    }
    setBusy("voters");
    setMessage(null);
    try {
      const emails = voterEmails
        .split(/[\n,]/)
        .map((email) => email.trim())
        .filter(Boolean);
      const response = await upsertElectionVoterRoll(selectedElectionId, emails);
      setVoterRoll(response);
      setVoterEmails("");
      setMessage(`Voter roll updated: ${response.added_count} added.`);
      setReloadKey((current) => current + 1);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Voter roll could not be updated.");
    } finally {
      setBusy(null);
    }
  }

  async function updateStatus(action: "close" | "open") {
    if (!selectedElectionId) {
      return;
    }
    setBusy(action);
    setMessage(null);
    try {
      if (action === "open") {
        await openElection(selectedElectionId, "Opened from admin console.");
      } else {
        await closeElection(selectedElectionId, "Closed from admin console.");
      }
      setMessage(`Election ${action === "open" ? "opened" : "closed"}.`);
      setReloadKey((current) => current + 1);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Election status could not be updated.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">Live election lifecycle</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Create election drafts, add candidates, update voter rolls, and control open/close status.
            </p>
          </div>
          <button
            className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-bold text-ink"
            onClick={() => {
              setState({ status: "loading" });
              setReloadKey((current) => current + 1);
            }}
            type="button"
          >
            <RefreshCcw aria-hidden="true" className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {state.status === "loading" ? <PanelMessage label="Loading elections." /> : null}
        {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
        {message ? <NoticePanel message={message} /> : null}

        {state.status === "ready" ? (
          <div className="mt-5 grid gap-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <select
                className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-bold text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setSelectedElectionId(event.target.value)}
                value={selectedElectionId}
              >
                <option value="">Select election</option>
                {state.elections.map((election) => (
                  <option key={election.id} value={election.id}>
                    {election.title} · {formatStatus(election.status)}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                <button
                  className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!selectedElection || selectedElection.status !== "DRAFT" || busy === "open"}
                  onClick={() => updateStatus("open")}
                  type="button"
                >
                  {busy === "open" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Vote className="h-4 w-4" />}
                  Open
                </button>
                <button
                  className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!selectedElection || selectedElection.status !== "OPEN" || busy === "close"}
                  onClick={() => updateStatus("close")}
                  type="button"
                >
                  {busy === "close" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Close
                </button>
                {selectedElection ? (
                  <a
                    className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink"
                    download
                    href={electionAuditExportUrl(selectedElection.id)}
                  >
                    <Download aria-hidden="true" className="h-4 w-4" />
                    Audit CSV
                  </a>
                ) : null}
              </div>
            </div>

            {selectedElection ? (
              <section className="grid gap-4 md:grid-cols-4">
                <MetricCard label="Status" value={formatStatus(selectedElection.status)} />
                <MetricCard label="Candidates" value={String(selectedElection.candidate_count)} />
                <MetricCard label="Voters" value={String(selectedElection.voter_count)} />
                <MetricCard label="Votes" value={String(selectedElection.vote_count)} />
              </section>
            ) : (
              <EmptyPanel label="Create or select an election to manage candidates and voters." />
            )}
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 2xl:grid-cols-3">
        <form className="rounded-lg border border-border bg-white p-5 shadow-soft" onSubmit={handleCreateElection}>
          <h3 className="font-display text-xl font-semibold text-ink">Create draft</h3>
          <TextInput
            label="Title"
            onChange={(value) => setElectionForm((current) => ({ ...current, title: value }))}
            placeholder="YALUMNI Council 2026"
            required
            value={electionForm.title}
          />
          <TextInput
            label="Starts at"
            onChange={(value) => setElectionForm((current) => ({ ...current, starts_at: value }))}
            required
            type="datetime-local"
            value={electionForm.starts_at}
          />
          <TextInput
            label="Ends at"
            onChange={(value) => setElectionForm((current) => ({ ...current, ends_at: value }))}
            required
            type="datetime-local"
            value={electionForm.ends_at}
          />
          <TextInput
            label="Quorum"
            onChange={(value) => setElectionForm((current) => ({ ...current, quorum_count: value }))}
            type="number"
            value={electionForm.quorum_count}
          />
          <TextInput
            label="Scope label"
            onChange={(value) => setElectionForm((current) => ({ ...current, scope_label: value }))}
            placeholder="Platform pilot"
            value={electionForm.scope_label}
          />
          <TextAreaInput
            label="Summary"
            onChange={(value) => setElectionForm((current) => ({ ...current, summary: value }))}
            required
            value={electionForm.summary}
          />
          <TextAreaInput
            label="Description"
            onChange={(value) => setElectionForm((current) => ({ ...current, description: value }))}
            required
            value={electionForm.description}
          />
          <button
            className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy === "create"}
            type="submit"
          >
            {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create draft
          </button>
        </form>

        <form className="rounded-lg border border-border bg-white p-5 shadow-soft" onSubmit={handleAddCandidate}>
          <h3 className="font-display text-xl font-semibold text-ink">Candidates</h3>
          <div className="mt-3 grid gap-2">
            {candidates.length ? (
              candidates.map((candidate) => (
                <div className="rounded-lg border border-border bg-surface p-3" key={candidate.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-ink">{candidate.display_name}</p>
                      <p className="mt-1 text-xs font-semibold text-muted">{candidate.headline ?? "Candidate"}</p>
                    </div>
                    <span className="rounded-md border border-border bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                      {formatStatus(candidate.status)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-bold text-ink disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={
                        !selectedElection ||
                        selectedElection.status !== "DRAFT" ||
                        candidate.status === "ACTIVE" ||
                        busy === `candidate:${candidate.id}:ACTIVE`
                      }
                      onClick={() => {
                        void handleCandidateStatus(candidate.id, "ACTIVE");
                      }}
                      type="button"
                    >
                      {busy === `candidate:${candidate.id}:ACTIVE` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Approve
                    </button>
                    <button
                      className="focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-bold text-ink disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={
                        !selectedElection ||
                        selectedElection.status !== "DRAFT" ||
                        candidate.status === "REJECTED" ||
                        busy === `candidate:${candidate.id}:REJECTED`
                      }
                      onClick={() => {
                        void handleCandidateStatus(candidate.id, "REJECTED");
                      }}
                      type="button"
                    >
                      {busy === `candidate:${candidate.id}:REJECTED` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      Reject
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyPanel label="No candidates added yet." />
            )}
          </div>
          <TextInput
            label="Candidate name"
            onChange={(value) => setCandidateForm((current) => ({ ...current, display_name: value }))}
            required
            value={candidateForm.display_name}
          />
          <TextInput
            label="Headline"
            onChange={(value) => setCandidateForm((current) => ({ ...current, headline: value }))}
            value={candidateForm.headline}
          />
          <TextAreaInput
            label="Statement"
            onChange={(value) => setCandidateForm((current) => ({ ...current, statement: value }))}
            required
            value={candidateForm.statement}
          />
          <button
            className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedElectionId || selectedElection?.status !== "DRAFT" || busy === "candidate"}
            type="submit"
          >
            {busy === "candidate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundPlus className="h-4 w-4" />}
            Add candidate
          </button>
        </form>

        <form className="rounded-lg border border-border bg-white p-5 shadow-soft" onSubmit={handleVoterRoll}>
          <h3 className="font-display text-xl font-semibold text-ink">Voter roll</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Add existing platform users by email, separated by commas or new lines.
          </p>
          <textarea
            className="mt-4 min-h-36 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            onChange={(event) => setVoterEmails(event.target.value)}
            placeholder="member@example.org"
            value={voterEmails}
          />
          <div className="mt-3 rounded-lg border border-border bg-surface p-3">
            <div className="flex items-center gap-2 text-sm font-bold text-ink">
              <UsersRound aria-hidden="true" className="h-4 w-4 text-primary" />
              {voterRoll?.voters.length ?? 0} voters on roll
            </div>
            {voterRoll?.not_found.length ? (
              <p className="mt-2 text-xs font-semibold text-muted">
                Missing: {voterRoll.not_found.join(", ")}
              </p>
            ) : null}
          </div>
          <button
            className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedElectionId || selectedElection?.status !== "DRAFT" || busy === "voters"}
            type="submit"
          >
            {busy === "voters" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UsersRound className="h-4 w-4" />}
            Update voter roll
          </button>
        </form>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-white p-4">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-primary">{value}</p>
    </article>
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
  placeholder?: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="mt-4 block text-sm font-bold text-ink">
      {label}
      <input
        className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function TextAreaInput({
  label,
  onChange,
  required = false,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="mt-4 block text-sm font-bold text-ink">
      {label}
      <textarea
        className="mt-2 min-h-24 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      />
    </label>
  );
}

function PanelMessage({ label }: { label: string }) {
  return (
    <div className="mt-4 rounded-lg border border-border bg-surface p-4 text-sm font-semibold text-muted">
      {label}
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-lg border border-[#ffb7a8] bg-[#fff2ed] p-4 text-sm font-semibold text-[#b82716]">
      {message}
    </div>
  );
}

function NoticePanel({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-ink">
      {message}
    </div>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface p-3 text-sm font-semibold text-muted">
      {label}
    </div>
  );
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

function dateTimeLocalToIso(value: string) {
  const date = new Date(value);
  return date.toISOString();
}
