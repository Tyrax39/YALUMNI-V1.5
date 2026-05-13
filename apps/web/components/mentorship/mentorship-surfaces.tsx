"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  ArrowUpRight,
  CheckCircle2,
  Filter,
  Handshake,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Send,
  Settings,
  UserRoundCheck,
  UsersRound,
  XCircle
} from "lucide-react";
import {
  MEMBER_ACCESS_ROLES,
  type MentorFilters,
  type MentorProfile,
  type MentorProfilePayload,
  type MentorshipRequest,
  type MentorshipSummary,
  acceptMentorshipRequest,
  cancelMentorshipRequest,
  createMentorshipRequest,
  declineMentorshipRequest,
  fetchMentors,
  fetchMentorshipSummary,
  fetchMyMentorProfile,
  upsertMyMentorProfile
} from "@yalumni/frontend-shared";

import { AppShell } from "@/components/platform/app-shell";

type SummaryState =
  | { status: "loading" }
  | { status: "ready"; summary: MentorshipSummary }
  | { message: string; status: "error" };

type MentorListState =
  | { status: "loading" }
  | { mentors: MentorProfile[]; status: "ready"; total: number }
  | { message: string; status: "error" };

type MentorSettingsState =
  | { status: "loading" }
  | { profile: MentorProfile | null; status: "ready" }
  | { message: string; status: "error" };

type MentorFormState = {
  availability_status: string;
  bio: string;
  countries: string;
  expertise_areas: string;
  headline: string;
  is_accepting_requests: boolean;
  is_active: boolean;
  max_active_mentees: string;
  preferred_meeting_format: string;
  sectors: string;
  years_experience: string;
};

type RequestFormState = {
  focus_area: string;
  goals: string;
  mentor_profile_id: string;
  message: string;
};

const INITIAL_MENTOR_FORM: MentorFormState = {
  availability_status: "AVAILABLE",
  bio: "",
  countries: "",
  expertise_areas: "",
  headline: "",
  is_accepting_requests: true,
  is_active: true,
  max_active_mentees: "3",
  preferred_meeting_format: "VIRTUAL",
  sectors: "",
  years_experience: ""
};

const AVAILABILITY_OPTIONS: [string, string][] = [
  ["", "All availability"],
  ["AVAILABLE", "Available"],
  ["LIMITED", "Limited"],
  ["PAUSED", "Paused"]
];

const MEETING_OPTIONS: [string, string][] = [
  ["VIRTUAL", "Virtual"],
  ["HYBRID", "Hybrid"],
  ["IN_PERSON", "In person"],
  ["PHONE", "Phone"]
];

export function MentorshipHub() {
  const [state, setState] = useState<SummaryState>({ status: "loading" });
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    fetchMentorshipSummary()
      .then((summary) => {
        if (isMounted) {
          setState({ status: "ready", summary });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Mentorship workspace could not load.",
            status: "error"
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  async function reviewRequest(requestId: string, action: "accept" | "decline") {
    setActionMessage(null);
    try {
      if (action === "accept") {
        await acceptMentorshipRequest(requestId, "Accepted from the mentor dashboard.");
      } else {
        await declineMentorshipRequest(requestId, "Declined from the mentor dashboard.");
      }
      setActionMessage(`Request ${action === "accept" ? "accepted" : "declined"}.`);
      setReloadKey((current) => current + 1);
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Request review failed.");
    }
  }

  async function cancelOutgoingRequest(requestId: string) {
    setActionMessage(null);
    try {
      await cancelMentorshipRequest(requestId);
      setActionMessage("Request cancelled.");
      setReloadKey((current) => current + 1);
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Request cancellation failed.");
    }
  }

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
            href="/mentorship/find"
          >
            <UsersRound aria-hidden="true" className="h-4 w-4" />
            Find mentor
          </Link>
        </>
      }
      description="Find alumni mentors, publish your mentor availability, and manage mentorship requests."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Mentorship"
    >
      {() => (
        <div className="grid gap-6">
          {state.status === "loading" ? <LoadingPanel label="Loading mentorship workspace." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
          {actionMessage ? <NoticePanel message={actionMessage} /> : null}

          {state.status === "ready" ? (
            <>
              <section className="grid gap-4 md:grid-cols-3">
                <MetricCard
                  label="Mentor profile"
                  value={state.summary.mentor_profile ? "Active" : "Not set"}
                />
                <MetricCard label="Outgoing requests" value={String(state.summary.outgoing_requests.length)} />
                <MetricCard label="Incoming requests" value={String(state.summary.incoming_requests.length)} />
              </section>

              <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
                <div className="grid gap-5">
                  <PanelHeader
                    actionHref="/mentorship/find"
                    actionLabel="Browse mentors"
                    description="Recommended mentors are drawn from live mentor profiles accepting requests."
                    icon={<Handshake aria-hidden="true" className="h-5 w-5" />}
                    title="Recommended mentors"
                  />
                  {state.summary.recommended_mentors.length ? (
                    state.summary.recommended_mentors.map((mentor) => (
                      <MentorCard key={mentor.id} mentor={mentor} />
                    ))
                  ) : (
                    <EmptyPanel label="No mentors are accepting requests yet." />
                  )}

                  <PanelHeader
                    description="Recent requests you have sent to alumni mentors."
                    icon={<MessageSquare aria-hidden="true" className="h-5 w-5" />}
                    title="My requests"
                  />
                  {state.summary.outgoing_requests.length ? (
                    state.summary.outgoing_requests.map((request) => (
                      <div className="grid gap-2" key={request.id}>
                        <RequestCard request={request} />
                        {request.status === "PENDING" ? (
                          <button
                            className="focus-ring inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
                            onClick={() => cancelOutgoingRequest(request.id)}
                            type="button"
                          >
                            <XCircle aria-hidden="true" className="h-4 w-4" />
                            Cancel request
                          </button>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <EmptyPanel label="No outgoing mentorship requests yet." />
                  )}
                </div>

                <aside className="grid gap-5">
                  <section className="rounded-lg border border-border bg-white p-5 shadow-soft">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white">
                      <UserRoundCheck aria-hidden="true" className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 font-display text-xl font-semibold text-ink">
                      Mentor availability
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {state.summary.mentor_profile
                        ? state.summary.mentor_profile.headline
                        : "Publish a mentor profile so alumni can request your guidance."}
                    </p>
                    <Link
                      className="focus-ring mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
                      href="/mentorship/settings"
                    >
                      <Settings aria-hidden="true" className="h-4 w-4" />
                      Mentor settings
                    </Link>
                  </section>

                  <section className="rounded-lg border border-border bg-white p-5 shadow-soft">
                    <h2 className="font-display text-xl font-semibold text-ink">Incoming requests</h2>
                    <div className="mt-4 grid gap-3">
                      {state.summary.incoming_requests.length ? (
                        state.summary.incoming_requests.map((request) => (
                          <div className="rounded-lg border border-border bg-surface p-4" key={request.id}>
                            <RequestCard request={request} />
                            {request.status === "PENDING" ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-bold text-white"
                                  onClick={() => reviewRequest(request.id, "accept")}
                                  type="button"
                                >
                                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                                  Accept
                                </button>
                                <button
                                  className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-bold text-ink"
                                  onClick={() => reviewRequest(request.id, "decline")}
                                  type="button"
                                >
                                  <XCircle aria-hidden="true" className="h-4 w-4" />
                                  Decline
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <EmptyPanel label="No incoming requests yet." />
                      )}
                    </div>
                  </section>
                </aside>
              </section>
            </>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

export function MentorDiscovery() {
  const [state, setState] = useState<MentorListState>({ status: "loading" });
  const [filters, setFilters] = useState({
    availabilityStatus: "",
    country: "",
    expertise: "",
    q: "",
    sector: ""
  });

  const apiFilters = useMemo<MentorFilters>(
    () => ({
      availabilityStatus: filters.availabilityStatus || undefined,
      country: filters.country.trim() || undefined,
      expertise: filters.expertise.trim() || undefined,
      q: filters.q.trim() || undefined,
      sector: filters.sector.trim() || undefined
    }),
    [filters]
  );

  useEffect(() => {
    let isMounted = true;
    fetchMentors(apiFilters)
      .then((response) => {
        if (isMounted) {
          setState({ mentors: response.mentors, status: "ready", total: response.total });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Mentors could not be loaded.",
            status: "error"
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [apiFilters]);

  function updateFilter(patch: Partial<typeof filters>) {
    setState({ status: "loading" });
    setFilters((current) => ({ ...current, ...patch }));
  }

  return (
    <AppShell
      description="Search alumni mentors by expertise, sector, country, and availability."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Find a mentor"
    >
      {() => (
        <div className="grid gap-6">
          <section className="rounded-lg border border-border bg-white p-4 shadow-soft sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                <Filter aria-hidden="true" className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink">Search mentors</h2>
                <p className="text-sm leading-6 text-muted">
                  Results come from live mentor availability profiles.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-5">
              <TextInput
                label="Search"
                onChange={(value) => updateFilter({ q: value })}
                placeholder="Strategy, finance, climate"
                value={filters.q}
              />
              <TextInput
                label="Country"
                onChange={(value) => updateFilter({ country: value })}
                placeholder="Rwanda"
                value={filters.country}
              />
              <TextInput
                label="Expertise"
                onChange={(value) => updateFilter({ expertise: value })}
                placeholder="Program design"
                value={filters.expertise}
              />
              <TextInput
                label="Sector"
                onChange={(value) => updateFilter({ sector: value })}
                placeholder="Technology"
                value={filters.sector}
              />
              <SelectInput
                label="Availability"
                onChange={(value) => updateFilter({ availabilityStatus: value })}
                options={AVAILABILITY_OPTIONS}
                value={filters.availabilityStatus}
              />
            </div>
          </section>

          {state.status === "loading" ? <LoadingPanel label="Loading mentors." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
          {state.status === "ready" ? (
            <section className="grid gap-4">
              <p className="text-sm font-semibold text-muted">
                {state.total} mentor{state.total === 1 ? "" : "s"} found
              </p>
              {state.mentors.length ? (
                state.mentors.map((mentor) => <MentorCard key={mentor.id} mentor={mentor} />)
              ) : (
                <EmptyPanel label="No mentors match the current filters." />
              )}
            </section>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

export function MentorshipRequestCreate() {
  const searchParams = useSearchParams();
  const initialMentorId = searchParams.get("mentor") ?? "";
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [form, setForm] = useState<RequestFormState>({
    focus_area: "",
    goals: "",
    mentor_profile_id: initialMentorId,
    message: ""
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<MentorshipRequest | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchMentors({ limit: 50 })
      .then((response) => {
        if (isMounted) {
          setMentors(response.mentors);
          if (!initialMentorId && response.mentors[0]) {
            setForm((current) => ({ ...current, mentor_profile_id: response.mentors[0].id }));
          }
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setMessage(caught instanceof Error ? caught.message : "Mentor list could not be loaded.");
        }
      });
    return () => {
      isMounted = false;
    };
  }, [initialMentorId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await createMentorshipRequest({
        focus_area: form.focus_area,
        goals: form.goals,
        mentor_profile_id: form.mentor_profile_id,
        message: form.message.trim() || null
      });
      setCreated(response);
      setMessage("Mentorship request sent.");
      setForm({ focus_area: "", goals: "", mentor_profile_id: form.mentor_profile_id, message: "" });
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Mentorship request failed.");
    } finally {
      setBusy(false);
    }
  }

  function updateField(field: keyof RequestFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <AppShell
      description="Send a focused mentorship request to an alumni mentor who is accepting requests."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Request mentorship"
    >
      {() => (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <form className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6" onSubmit={handleSubmit}>
            <SelectInput
              label="Mentor"
              onChange={(value) => updateField("mentor_profile_id", value)}
              options={mentors.map((mentor) => [mentor.id, mentor.display_name])}
              value={form.mentor_profile_id}
            />
            <TextInput
              label="Focus area"
              onChange={(value) => updateField("focus_area", value)}
              placeholder="Program design"
              required
              value={form.focus_area}
            />
            <label className="mt-4 block text-sm font-bold text-ink">
              Goals
              <textarea
                className="mt-2 min-h-36 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => updateField("goals", event.target.value)}
                placeholder="What do you want to learn or accomplish through this mentorship?"
                required
                value={form.goals}
              />
            </label>
            <label className="mt-4 block text-sm font-bold text-ink">
              Message
              <textarea
                className="mt-2 min-h-28 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => updateField("message", event.target.value)}
                placeholder="Share context, availability, and why this mentor is a good fit."
                value={form.message}
              />
            </label>
            {message ? <NoticePanel message={message} /> : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busy || !form.mentor_profile_id}
                type="submit"
              >
                {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Send aria-hidden="true" className="h-4 w-4" />}
                {busy ? "Sending" : "Send request"}
              </button>
              <Link className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary" href="/mentorship/find">
                Back to mentors
              </Link>
            </div>
          </form>

          <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
            <h2 className="font-display text-xl font-semibold text-ink">Request status</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Requests start as pending. Mentors can accept or decline from their mentorship dashboard.
            </p>
            {created ? <RequestCard request={created} /> : null}
          </aside>
        </div>
      )}
    </AppShell>
  );
}

export function MentorSettings() {
  const [state, setState] = useState<MentorSettingsState>({ status: "loading" });
  const [form, setForm] = useState<MentorFormState>(INITIAL_MENTOR_FORM);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchMyMentorProfile()
      .then((profile) => {
        if (!isMounted) {
          return;
        }
        setState({ profile, status: "ready" });
        if (profile) {
          setForm(profileToForm(profile));
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Mentor settings could not load.",
            status: "error"
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const profile = await upsertMyMentorProfile(formToPayload(form));
      setState({ profile, status: "ready" });
      setForm(profileToForm(profile));
      setMessage("Mentor settings saved.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Mentor settings could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  function updateField(field: keyof MentorFormState, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <AppShell
      description="Publish your mentor availability, areas of expertise, and preferred engagement style."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Mentor settings"
    >
      {() => (
        <>
          {state.status === "loading" ? <LoadingPanel label="Loading mentor settings." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
          {state.status === "ready" ? (
            <form className="grid gap-6 xl:grid-cols-[1fr_360px]" onSubmit={handleSubmit}>
              <section className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Headline"
                    onChange={(value) => updateField("headline", value)}
                    placeholder="Civic technology mentor"
                    required
                    value={form.headline}
                  />
                  <SelectInput
                    label="Availability"
                    onChange={(value) => updateField("availability_status", value)}
                    options={AVAILABILITY_OPTIONS.slice(1)}
                    value={form.availability_status}
                  />
                  <SelectInput
                    label="Meeting format"
                    onChange={(value) => updateField("preferred_meeting_format", value)}
                    options={MEETING_OPTIONS}
                    value={form.preferred_meeting_format}
                  />
                  <TextInput
                    label="Max active mentees"
                    onChange={(value) => updateField("max_active_mentees", value)}
                    type="number"
                    value={form.max_active_mentees}
                  />
                  <TextInput
                    label="Years experience"
                    onChange={(value) => updateField("years_experience", value)}
                    type="number"
                    value={form.years_experience}
                  />
                  <TextInput
                    label="Countries"
                    onChange={(value) => updateField("countries", value)}
                    placeholder="Rwanda, Kenya"
                    value={form.countries}
                  />
                  <TextInput
                    label="Expertise"
                    onChange={(value) => updateField("expertise_areas", value)}
                    placeholder="Civic technology, Strategy"
                    value={form.expertise_areas}
                  />
                  <TextInput
                    label="Sectors"
                    onChange={(value) => updateField("sectors", value)}
                    placeholder="Technology, Education"
                    value={form.sectors}
                  />
                </div>
                <label className="mt-4 block text-sm font-bold text-ink">
                  Bio
                  <textarea
                    className="mt-2 min-h-40 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    onChange={(event) => updateField("bio", event.target.value)}
                    placeholder="Describe your mentoring style, strengths, and best-fit mentees."
                    required
                    value={form.bio}
                  />
                </label>
              </section>

              <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
                <h2 className="font-display text-xl font-semibold text-ink">Visibility</h2>
                <label className="mt-4 flex items-center gap-3 text-sm font-bold text-ink">
                  <input
                    checked={form.is_active}
                    className="h-4 w-4 accent-primary"
                    onChange={(event) => updateField("is_active", event.target.checked)}
                    type="checkbox"
                  />
                  Show mentor profile
                </label>
                <label className="mt-3 flex items-center gap-3 text-sm font-bold text-ink">
                  <input
                    checked={form.is_accepting_requests}
                    className="h-4 w-4 accent-primary"
                    onChange={(event) => updateField("is_accepting_requests", event.target.checked)}
                    type="checkbox"
                  />
                  Accept new requests
                </label>
                {message ? <NoticePanel message={message} /> : null}
                <button
                  className="focus-ring mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={busy}
                  type="submit"
                >
                  {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Settings aria-hidden="true" className="h-4 w-4" />}
                  {busy ? "Saving" : "Save settings"}
                </button>
              </aside>
            </form>
          ) : null}
        </>
      )}
    </AppShell>
  );
}

function MentorCard({ mentor }: { mentor: MentorProfile }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-ink">{mentor.display_name}</h3>
            <Pill label={formatStatus(mentor.availability_status)} />
            <Pill label={formatStatus(mentor.preferred_meeting_format)} />
          </div>
          <p className="mt-2 text-base font-semibold text-primary">{mentor.headline}</p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{mentor.bio}</p>
          <TagList values={[...mentor.expertise_areas, ...mentor.sectors, ...mentor.countries]} />
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.1em] text-muted">
            {mentor.active_request_count}/{mentor.max_active_mentees} active request capacity
          </p>
        </div>
        <Link
          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
          href={`/mentorship/request?mentor=${mentor.id}`}
        >
          Request
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function RequestCard({ request }: { request: MentorshipRequest }) {
  return (
    <article className="rounded-lg border border-border bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill label={formatStatus(request.status)} />
        <p className="text-sm font-bold text-ink">{request.focus_area}</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted">{request.goals}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.1em] text-muted">
        Mentor: {request.mentor_display_name} · Requester: {request.requester_display_name}
      </p>
      {request.reviewer_note ? (
        <p className="mt-2 text-sm font-semibold text-primary">{request.reviewer_note}</p>
      ) : null}
    </article>
  );
}

function PanelHeader({
  actionHref,
  actionLabel,
  description,
  icon,
  title
}: {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">{icon}</div>
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        </div>
      </div>
      {actionHref && actionLabel ? (
        <Link
          className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-white px-3 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
          href={actionHref}
        >
          {actionLabel}
        </Link>
      ) : null}
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
        required
        value={value}
      >
        {options.length ? (
          options.map(([optionValue, labelText]) => (
            <option key={optionValue} value={optionValue}>
              {labelText}
            </option>
          ))
        ) : (
          <option value="">No options available</option>
        )}
      </select>
    </label>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-3 font-display text-3xl font-bold text-primary">{value}</p>
    </article>
  );
}

function TagList({ values }: { values: string[] }) {
  const tags = values.filter(Boolean).slice(0, 8);
  if (!tags.length) {
    return null;
  }
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Pill key={tag} label={tag} />
      ))}
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

function LoadingPanel({ label }: { label: string }) {
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

function profileToForm(profile: MentorProfile): MentorFormState {
  return {
    availability_status: profile.availability_status,
    bio: profile.bio,
    countries: profile.countries.join(", "),
    expertise_areas: profile.expertise_areas.join(", "),
    headline: profile.headline,
    is_accepting_requests: profile.is_accepting_requests,
    is_active: profile.is_active,
    max_active_mentees: String(profile.max_active_mentees),
    preferred_meeting_format: profile.preferred_meeting_format,
    sectors: profile.sectors.join(", "),
    years_experience: typeof profile.years_experience === "number" ? String(profile.years_experience) : ""
  };
}

function formToPayload(form: MentorFormState): MentorProfilePayload {
  return {
    availability_status: form.availability_status,
    bio: form.bio,
    countries: splitCsv(form.countries),
    expertise_areas: splitCsv(form.expertise_areas),
    headline: form.headline,
    is_accepting_requests: form.is_accepting_requests,
    is_active: form.is_active,
    max_active_mentees: optionalInteger(form.max_active_mentees) ?? 3,
    preferred_meeting_format: form.preferred_meeting_format,
    sectors: splitCsv(form.sectors),
    years_experience: optionalInteger(form.years_experience)
  };
}

function splitCsv(value: string) {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function optionalInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}
