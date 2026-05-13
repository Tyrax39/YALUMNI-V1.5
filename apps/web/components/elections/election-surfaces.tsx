"use client";

import { FormEvent, useEffect, useState } from "react";

import Link from "next/link";

import {
  BarChart3,
  Loader2,
  Plus,
  RefreshCcw,
  Send,
  Vote
} from "lucide-react";
import {
  ADMIN_ROLES,
  MEMBER_ACCESS_ROLES,
  type ElectionCandidate,
  type ElectionItem,
  type ElectionResultsResponse,
  castElectionVote,
  createElection,
  fetchElection,
  fetchElectionCandidates,
  fetchElectionResults,
  fetchElections
} from "@yalumni/frontend-shared";

import { AppShell } from "@/components/platform/app-shell";

type ElectionListState =
  | { status: "loading" }
  | { elections: ElectionItem[]; status: "ready"; total: number }
  | { message: string; status: "error" };

type ElectionDetailState =
  | { status: "loading" }
  | {
      candidates: ElectionCandidate[];
      election: ElectionItem;
      status: "ready";
    }
  | { message: string; status: "error" };

type ElectionResultsState =
  | { status: "loading" }
  | { results: ElectionResultsResponse; status: "ready" }
  | { message: string; status: "error" };

type ElectionForm = {
  description: string;
  ends_at: string;
  quorum_count: string;
  results_visibility: string;
  scope_label: string;
  scope_type: string;
  starts_at: string;
  summary: string;
  title: string;
};

const INITIAL_ELECTION_FORM: ElectionForm = {
  description: "",
  ends_at: "",
  quorum_count: "0",
  results_visibility: "AFTER_CLOSE",
  scope_label: "",
  scope_type: "PLATFORM",
  starts_at: "",
  summary: "",
  title: ""
};

export function ElectionsHub() {
  const [state, setState] = useState<ElectionListState>({ status: "loading" });
  const [statusFilter, setStatusFilter] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    fetchElections({ status: statusFilter || undefined })
      .then((response) => {
        if (isMounted) {
          setState({ elections: response.elections, status: "ready", total: response.total });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Elections could not be loaded.",
            status: "error"
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [reloadKey, statusFilter]);

  return (
    <AppShell
      actions={
        <>
          <button
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
            onClick={() => {
              setState({ status: "loading" });
              setReloadKey((current) => current + 1);
            }}
            type="button"
          >
            <RefreshCcw aria-hidden="true" className="h-4 w-4" />
            Refresh
          </button>
          <Link
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-[#003d7d]"
            href="/elections/new"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            New election
          </Link>
        </>
      }
      description="Review open and closed alumni elections, confirm voting eligibility, and inspect published results."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Elections"
    >
      {() => (
        <div className="grid gap-6">
          <section className="rounded-lg border border-border bg-white p-4 shadow-soft sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink">Election directory</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Draft setup stays in the admin console; member views show vote-ready or closed elections.
                </p>
              </div>
              <select
                className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-bold text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => {
                  setState({ status: "loading" });
                  setStatusFilter(event.target.value);
                }}
                value={statusFilter}
              >
                <option value="">All visible</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </section>

          {state.status === "loading" ? <PanelMessage label="Loading elections." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
          {state.status === "ready" ? (
            <section className="grid gap-4">
              <p className="text-sm font-semibold text-muted">
                {state.total} election{state.total === 1 ? "" : "s"} found
              </p>
              {state.elections.length ? (
                state.elections.map((election) => <ElectionCard election={election} key={election.id} />)
              ) : (
                <EmptyPanel label="No elections are visible yet." />
              )}
            </section>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

export function ElectionDetail({ electionId }: { electionId: string }) {
  const [state, setState] = useState<ElectionDetailState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchElection(electionId), fetchElectionCandidates(electionId)])
      .then(([election, candidates]) => {
        if (isMounted) {
          setState({ candidates, election, status: "ready" });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Election could not be loaded.",
            status: "error"
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [electionId]);

  return (
    <AppShell
      description="Inspect candidate statements, voter-roll readiness, voting window, and result visibility."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Election detail"
    >
      {() => (
        <>
          {state.status === "loading" ? <PanelMessage label="Loading election detail." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
          {state.status === "ready" ? (
            <div className="grid gap-6">
              <ElectionOverview election={state.election} />
              <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
                <div className="grid gap-4">
                  <PanelHeader
                    description="Candidate statements are sourced from the election admin setup."
                    icon={<Vote aria-hidden="true" className="h-5 w-5" />}
                    title="Candidates"
                  />
                  {state.candidates.length ? (
                    state.candidates.map((candidate) => (
                      <CandidateCard candidate={candidate} key={candidate.id} />
                    ))
                  ) : (
                    <EmptyPanel label="No candidates have been published for this election." />
                  )}
                </div>
                <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
                  <h2 className="font-display text-xl font-semibold text-ink">Voting actions</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{state.election.summary}</p>
                  <div className="mt-5 grid gap-3">
                    <Link
                      className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white"
                      href={`/elections/${state.election.id}/vote`}
                    >
                      <Vote aria-hidden="true" className="h-4 w-4" />
                      Vote
                    </Link>
                    <Link
                      className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink"
                      href={`/elections/${state.election.id}/results`}
                    >
                      <BarChart3 aria-hidden="true" className="h-4 w-4" />
                      Results
                    </Link>
                  </div>
                </aside>
              </section>
            </div>
          ) : null}
        </>
      )}
    </AppShell>
  );
}

export function ElectionVoteSurface({ electionId }: { electionId: string }) {
  const [state, setState] = useState<ElectionDetailState>({ status: "loading" });
  const [candidateId, setCandidateId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchElection(electionId), fetchElectionCandidates(electionId)])
      .then(([election, candidates]) => {
        if (isMounted) {
          setState({ candidates, election, status: "ready" });
          setCandidateId(candidates[0]?.id ?? "");
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Voting screen could not be loaded.",
            status: "error"
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [electionId]);

  async function submitVote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!candidateId) {
      setMessage("Select a candidate before casting your vote.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const election = await castElectionVote(electionId, candidateId);
      setMessage("Vote recorded.");
      if (state.status === "ready") {
        setState({ ...state, election });
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Vote could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      description="Cast one auditable vote for an election where you are on the eligible voter roll."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Vote"
    >
      {() => (
        <>
          {state.status === "loading" ? <PanelMessage label="Loading ballot." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
          {state.status === "ready" ? (
            <form className="grid gap-6 xl:grid-cols-[1fr_360px]" onSubmit={submitVote}>
              <section className="rounded-lg border border-border bg-white p-5 shadow-soft">
                <h2 className="font-display text-2xl font-semibold text-ink">{state.election.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{state.election.description}</p>
                <div className="mt-5 grid gap-3">
                  {state.candidates.map((candidate) => (
                    <label
                      className="flex cursor-pointer gap-3 rounded-lg border border-border bg-surface p-4"
                      key={candidate.id}
                    >
                      <input
                        checked={candidateId === candidate.id}
                        className="mt-1 h-4 w-4 accent-primary"
                        onChange={() => setCandidateId(candidate.id)}
                        type="radio"
                      />
                      <span>
                        <span className="block font-bold text-ink">{candidate.display_name}</span>
                        {candidate.headline ? (
                          <span className="mt-1 block text-sm font-semibold text-primary">
                            {candidate.headline}
                          </span>
                        ) : null}
                        <span className="mt-2 block text-sm leading-6 text-muted">
                          {candidate.statement}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
              <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
                <h2 className="font-display text-xl font-semibold text-ink">Ballot status</h2>
                <div className="mt-4 grid gap-3">
                  <StatusLine label="Election" value={formatStatus(state.election.status)} />
                  <StatusLine label="Eligibility" value={state.election.can_vote ? "eligible" : "not eligible"} />
                  <StatusLine label="Vote" value={state.election.has_voted ? "recorded" : "not cast"} />
                </div>
                {message ? <NoticePanel message={message} /> : null}
                <button
                  className="focus-ring mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={busy || !state.election.can_vote || state.election.has_voted}
                  type="submit"
                >
                  {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Send aria-hidden="true" className="h-4 w-4" />}
                  {busy ? "Recording" : "Cast vote"}
                </button>
              </aside>
            </form>
          ) : null}
        </>
      )}
    </AppShell>
  );
}

export function ElectionResultsSurface({ electionId }: { electionId: string }) {
  const [state, setState] = useState<ElectionResultsState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;
    fetchElectionResults(electionId)
      .then((results) => {
        if (isMounted) {
          setState({ results, status: "ready" });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Results are not available yet.",
            status: "error"
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [electionId]);

  return (
    <AppShell
      description="Review published election results and quorum status."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Election results"
    >
      {() => (
        <>
          {state.status === "loading" ? <PanelMessage label="Loading results." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
          {state.status === "ready" ? (
            <div className="grid gap-6">
              <ElectionOverview election={state.results.election} />
              <section className="grid gap-4 md:grid-cols-3">
                <MetricCard label="Votes cast" value={String(state.results.total_votes)} />
                <MetricCard label="Eligible voters" value={String(state.results.eligible_voters)} />
                <MetricCard label="Quorum" value={state.results.quorum_met ? "Met" : "Not met"} />
              </section>
              <section className="rounded-lg border border-border bg-white p-5 shadow-soft">
                <h2 className="font-display text-2xl font-semibold text-ink">Candidate results</h2>
                <div className="mt-5 grid gap-4">
                  {state.results.candidates.map((candidate) => (
                    <div className="rounded-lg border border-border bg-surface p-4" key={candidate.candidate_id}>
                      <div className="flex flex-wrap justify-between gap-3">
                        <div>
                          <p className="font-bold text-ink">{candidate.display_name}</p>
                          {candidate.headline ? (
                            <p className="mt-1 text-sm font-semibold text-muted">{candidate.headline}</p>
                          ) : null}
                        </div>
                        <p className="font-display text-2xl font-bold text-primary">
                          {candidate.vote_count} vote{candidate.vote_count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(100, candidate.percentage)}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                        {candidate.percentage}% of counted votes
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}
        </>
      )}
    </AppShell>
  );
}

export function ElectionCreateSurface() {
  const [form, setForm] = useState<ElectionForm>(INITIAL_ELECTION_FORM);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<ElectionItem | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const election = await createElection({
        description: form.description,
        ends_at: dateTimeLocalToIso(form.ends_at),
        quorum_count: Number.parseInt(form.quorum_count, 10) || 0,
        results_visibility: form.results_visibility,
        scope_label: form.scope_label.trim() || null,
        scope_type: form.scope_type,
        starts_at: dateTimeLocalToIso(form.starts_at),
        summary: form.summary,
        title: form.title
      });
      setCreated(election);
      setMessage("Election draft created. Add candidates and voter roll in the admin console.");
      setForm(INITIAL_ELECTION_FORM);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Election could not be created.");
    } finally {
      setBusy(false);
    }
  }

  function updateField(field: keyof ElectionForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <AppShell
      description="Create a draft election for admin setup, voter-roll validation, and candidate review."
      requiredRoles={ADMIN_ROLES}
      title="New election"
    >
      {() => (
        <form className="grid gap-6 xl:grid-cols-[1fr_360px]" onSubmit={handleSubmit}>
          <section className="rounded-lg border border-border bg-white p-5 shadow-soft">
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput
                label="Title"
                onChange={(value) => updateField("title", value)}
                placeholder="YALUMNI Council 2026"
                required
                value={form.title}
              />
              <TextInput
                label="Scope label"
                onChange={(value) => updateField("scope_label", value)}
                placeholder="Platform pilot"
                value={form.scope_label}
              />
              <TextInput
                label="Starts at"
                onChange={(value) => updateField("starts_at", value)}
                required
                type="datetime-local"
                value={form.starts_at}
              />
              <TextInput
                label="Ends at"
                onChange={(value) => updateField("ends_at", value)}
                required
                type="datetime-local"
                value={form.ends_at}
              />
              <TextInput
                label="Quorum count"
                onChange={(value) => updateField("quorum_count", value)}
                type="number"
                value={form.quorum_count}
              />
              <SelectInput
                label="Result visibility"
                onChange={(value) => updateField("results_visibility", value)}
                options={[
                  ["AFTER_CLOSE", "After close"],
                  ["LIVE", "Live"]
                ]}
                value={form.results_visibility}
              />
            </div>
            <TextAreaInput
              label="Summary"
              onChange={(value) => updateField("summary", value)}
              placeholder="Short election purpose and eligibility note."
              required
              value={form.summary}
            />
            <TextAreaInput
              label="Description"
              onChange={(value) => updateField("description", value)}
              placeholder="Governance context, expectations, and voting rules."
              required
              value={form.description}
            />
          </section>
          <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
            <h2 className="font-display text-xl font-semibold text-ink">Admin setup</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Drafts are not visible to members until candidates and voter roll are ready and an election
              admin opens the vote.
            </p>
            {message ? <NoticePanel message={message} /> : null}
            {created ? (
              <Link
                className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink"
                href="http://127.0.0.1:3011/elections"
              >
                Open admin elections
              </Link>
            ) : null}
            <button
              className="focus-ring mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              type="submit"
            >
              {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Plus aria-hidden="true" className="h-4 w-4" />}
              {busy ? "Creating" : "Create draft"}
            </button>
          </aside>
        </form>
      )}
    </AppShell>
  );
}

function ElectionCard({ election }: { election: ElectionItem }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-ink">{election.title}</h3>
            <Pill label={formatStatus(election.status)} />
            <Pill label={formatStatus(election.scope_type)} />
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">{election.summary}</p>
          <div className="mt-3 grid gap-2 text-sm font-semibold text-muted sm:grid-cols-3">
            <span>{formatDateRange(election.starts_at, election.ends_at)}</span>
            <span>{election.candidate_count} candidates</span>
            <span>{election.vote_count}/{election.voter_count} votes</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Link
            className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-white px-3 text-sm font-bold text-ink"
            href={`/elections/${election.id}`}
          >
            Detail
          </Link>
          <Link
            className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-3 text-sm font-bold text-white"
            href={election.can_vote ? `/elections/${election.id}/vote` : `/elections/${election.id}/results`}
          >
            {election.can_vote ? "Vote" : "Results"}
          </Link>
        </div>
      </div>
    </article>
  );
}

function ElectionOverview({ election }: { election: ElectionItem }) {
  return (
    <section className="grid gap-4 md:grid-cols-4">
      <MetricCard label="Status" value={formatStatus(election.status)} />
      <MetricCard label="Candidates" value={String(election.candidate_count)} />
      <MetricCard label="Votes" value={`${election.vote_count}/${election.voter_count}`} />
      <MetricCard label="Eligibility" value={election.can_vote ? "Can vote" : "Locked"} />
    </section>
  );
}

function CandidateCard({ candidate }: { candidate: ElectionCandidate }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <h3 className="text-lg font-bold text-ink">{candidate.display_name}</h3>
      {candidate.headline ? (
        <p className="mt-1 text-sm font-semibold text-primary">{candidate.headline}</p>
      ) : null}
      <p className="mt-3 text-sm leading-6 text-muted">{candidate.statement}</p>
    </article>
  );
}

function PanelHeader({
  description,
  icon,
  title
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">{icon}</div>
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-3 font-display text-2xl font-bold text-primary">{value}</p>
    </article>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
      <span className="text-sm font-bold text-muted">{label}</span>
      <span className="text-sm font-bold text-ink">{value}</span>
    </div>
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
    <label className="block text-sm font-bold text-ink">
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
  placeholder,
  required = false,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="mt-4 block text-sm font-bold text-ink">
      {label}
      <textarea
        className="mt-2 min-h-32 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        value={value}
      />
    </label>
  );
}

function SelectInput({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: [string, string][];
  value: string;
}) {
  return (
    <label className="block text-sm font-bold text-ink">
      {label}
      <select
        className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function PanelMessage({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-5 text-sm font-semibold text-muted shadow-soft">
      {label}
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-[#ffb7a8] bg-[#fff2ed] p-5 text-sm font-semibold text-[#b82716]">
      {message}
    </div>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-white p-5 text-sm font-semibold text-muted">
      {label}
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

function Pill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
      {label}
    </span>
  );
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatDateRange(start: string, end: string) {
  return `${formatDate(start)} to ${formatDate(end)}`;
}

function dateTimeLocalToIso(value: string) {
  const date = new Date(value);
  return date.toISOString();
}
