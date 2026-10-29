"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Filter,
  Globe2,
  ListChecks,
  Loader2,
  MapPin,
  Plus,
  RefreshCcw,
  Send,
  Sparkles,
  TicketCheck,
  Users
} from "lucide-react";
import {
  MEMBER_ACCESS_ROLES,
  type EventAgendaItem,
  type EventAttendee,
  type EventFilters,
  type EventItem,
  createEvent,
  fetchEvent,
  fetchEventAgenda,
  fetchEventAttendees,
  fetchEvents,
  rsvpEvent
} from "@yalumni/frontend-shared";

import { AppShell } from "@/components/platform/app-shell";

type EventListState =
  | { status: "loading" }
  | { events: EventItem[]; mine: EventItem[]; status: "ready"; total: number }
  | { message: string; status: "error" };

type EventDetailState =
  | { status: "loading" }
  | { event: EventItem; status: "ready" }
  | { message: string; status: "error" };

type AgendaState =
  | { status: "loading" }
  | { agenda: EventAgendaItem[]; event: EventItem; status: "ready" }
  | { message: string; status: "error" };

type AttendeesState =
  | { status: "loading" }
  | { attendees: EventAttendee[]; event: EventItem; status: "ready" }
  | { message: string; status: "error" };

type EventFormState = {
  agenda_description: string;
  agenda_ends_at: string;
  agenda_speaker_name: string;
  agenda_starts_at: string;
  agenda_title: string;
  capacity: string;
  city: string;
  country: string;
  description: string;
  ends_at: string;
  event_type: string;
  location: string;
  mode: string;
  registration_url: string;
  starts_at: string;
  summary: string;
  timezone: string;
  title: string;
};

const INITIAL_FORM: EventFormState = {
  agenda_description: "",
  agenda_ends_at: "",
  agenda_speaker_name: "",
  agenda_starts_at: "",
  agenda_title: "",
  capacity: "",
  city: "",
  country: "",
  description: "",
  ends_at: "",
  event_type: "NETWORKING",
  location: "",
  mode: "HYBRID",
  registration_url: "",
  starts_at: "",
  summary: "",
  timezone: "Africa/Cairo",
  title: ""
};

const EVENT_TYPE_OPTIONS: [string, string][] = [
  ["", "All types"],
  ["NETWORKING", "Networking"],
  ["TRAINING", "Training"],
  ["WEBINAR", "Webinar"],
  ["CONFERENCE", "Conference"],
  ["CHAPTER_MEETUP", "Chapter meetup"],
  ["COMMUNITY_FORUM", "Community forum"],
  ["OTHER", "Other"]
];

const EVENT_MODE_OPTIONS: [string, string][] = [
  ["", "All modes"],
  ["HYBRID", "Hybrid"],
  ["IN_PERSON", "In person"],
  ["ONLINE", "Online"]
];

export function EventsHub() {
  const [state, setState] = useState<EventListState>({ status: "loading" });
  const [filters, setFilters] = useState({
    country: "",
    eventType: "",
    mode: "",
    q: ""
  });
  const [reloadKey, setReloadKey] = useState(0);

  const apiFilters = useMemo<EventFilters>(
    () => ({
      country: filters.country.trim() || undefined,
      eventType: filters.eventType || undefined,
      mode: filters.mode || undefined,
      q: filters.q.trim() || undefined
    }),
    [filters]
  );

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetchEvents({ ...apiFilters, limit: 12 }),
      fetchEvents({ limit: 6, mine: true })
    ])
      .then(([published, mine]) => {
        if (!isMounted) {
          return;
        }
        setState({
          events: published.events,
          mine: mine.events,
          status: "ready",
          total: published.total
        });
      })
      .catch((caught) => {
        if (!isMounted) {
          return;
        }
        setState({
          message: caught instanceof Error ? caught.message : "Events could not be loaded.",
          status: "error"
        });
      });

    return () => {
      isMounted = false;
    };
  }, [apiFilters, reloadKey]);

  function updateFilter(patch: Partial<typeof filters>) {
    setState({ status: "loading" });
    setFilters((current) => ({ ...current, ...patch }));
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
            href="/events/new"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Create event
          </Link>
        </>
      }
      description="Discover chapter meetups, trainings, webinars, and member-led convenings."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Events"
    >
      {() => (
        <div className="grid gap-6">
          <section className="rounded-lg border border-border bg-white p-4 shadow-soft sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                <Filter aria-hidden="true" className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink">Search member events</h2>
                <p className="text-sm leading-6 text-muted">
                  Results come from the live FastAPI event workspace.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <TextInput
                label="Search"
                onChange={(value) => updateFilter({ q: value })}
                placeholder="Leadership, forum, webinar"
                value={filters.q}
              />
              <TextInput
                label="Country"
                onChange={(value) => updateFilter({ country: value })}
                placeholder="Rwanda"
                value={filters.country}
              />
              <SelectInput
                label="Type"
                onChange={(value) => updateFilter({ eventType: value })}
                options={EVENT_TYPE_OPTIONS}
                value={filters.eventType}
              />
              <SelectInput
                label="Mode"
                onChange={(value) => updateFilter({ mode: value })}
                options={EVENT_MODE_OPTIONS}
                value={filters.mode}
              />
            </div>
          </section>

          {state.status === "loading" ? <LoadingPanel label="Loading events." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}

          {state.status === "ready" ? (
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <section className="grid gap-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-ink">Upcoming events</h2>
                  <p className="mt-1 text-sm font-semibold text-muted">
                    {state.total} event{state.total === 1 ? "" : "s"} available
                  </p>
                </div>
                {state.events.length ? (
                  state.events.map((event) => <EventCard event={event} key={event.id} />)
                ) : (
                  <EmptyPanel label="No events match the current filters." />
                )}
              </section>

              <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
                <h2 className="font-display text-xl font-semibold text-ink">My events</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Events you create publish into the member event workspace.
                </p>
                <div className="mt-4 grid gap-3">
                  {state.mine.length ? (
                    state.mine.map((event) => (
                      <Link
                        className="focus-ring rounded-lg border border-border bg-surface p-3 transition hover:border-primary"
                        href={`/events/${event.id}`}
                        key={event.id}
                      >
                        <p className="text-sm font-bold text-ink">{event.title}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                          {formatEventDate(event.starts_at)}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <EmptyPanel label="No event submissions yet." />
                  )}
                </div>
              </aside>
            </div>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

export function EventCreate() {
  const [form, setForm] = useState<EventFormState>(INITIAL_FORM);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<EventItem | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const agendaItems = form.agenda_title.trim()
      ? [
          {
            description: form.agenda_description.trim() || null,
            ends_at: optionalIso(form.agenda_ends_at),
            speaker_name: form.agenda_speaker_name.trim() || null,
            starts_at: optionalIso(form.agenda_starts_at),
            title: form.agenda_title
          }
        ]
      : [];

    try {
      const eventRecord = await createEvent({
        agenda_items: agendaItems,
        capacity: optionalInteger(form.capacity),
        city: form.city.trim() || null,
        country: form.country.trim() || null,
        description: form.description,
        ends_at: datetimeLocalToIso(form.ends_at),
        event_type: form.event_type,
        location: form.location.trim() || null,
        mode: form.mode,
        registration_url: form.registration_url.trim() || null,
        starts_at: datetimeLocalToIso(form.starts_at),
        summary: form.summary,
        timezone: form.timezone.trim() || "Africa/Cairo",
        title: form.title
      });
      setCreated(eventRecord);
      setMessage("Event published to the member workspace.");
      setForm(INITIAL_FORM);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Event creation failed.");
    } finally {
      setBusy(false);
    }
  }

  function updateField(field: keyof EventFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <AppShell
      description="Create member-only events with agenda metadata and attendee registration tracking."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Create event"
    >
      {() => (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <form
            className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput
                label="Title"
                onChange={(value) => updateField("title", value)}
                placeholder="Kigali alumni leadership lab"
                required
                value={form.title}
              />
              <TextInput
                label="Country"
                onChange={(value) => updateField("country", value)}
                placeholder="Rwanda"
                value={form.country}
              />
              <SelectInput
                label="Type"
                onChange={(value) => updateField("event_type", value)}
                options={EVENT_TYPE_OPTIONS.slice(1)}
                value={form.event_type}
              />
              <SelectInput
                label="Mode"
                onChange={(value) => updateField("mode", value)}
                options={EVENT_MODE_OPTIONS.slice(1)}
                value={form.mode}
              />
              <TextInput
                label="City"
                onChange={(value) => updateField("city", value)}
                placeholder="Kigali"
                value={form.city}
              />
              <TextInput
                label="Location"
                onChange={(value) => updateField("location", value)}
                placeholder="Kigali Innovation Hub"
                value={form.location}
              />
              <TextInput
                label="Starts"
                onChange={(value) => updateField("starts_at", value)}
                required
                type="datetime-local"
                value={form.starts_at}
              />
              <TextInput
                label="Ends"
                onChange={(value) => updateField("ends_at", value)}
                required
                type="datetime-local"
                value={form.ends_at}
              />
              <TextInput
                label="Timezone"
                onChange={(value) => updateField("timezone", value)}
                placeholder="Africa/Kigali"
                value={form.timezone}
              />
              <TextInput
                label="Capacity"
                onChange={(value) => updateField("capacity", value)}
                placeholder="120"
                type="number"
                value={form.capacity}
              />
              <div className="md:col-span-2">
                <TextInput
                  label="Registration URL"
                  onChange={(value) => updateField("registration_url", value)}
                  placeholder="https://example.org/events/kigali-lab"
                  type="url"
                  value={form.registration_url}
                />
              </div>
            </div>

            <label className="mt-4 block text-sm font-bold text-ink">
              Summary
              <textarea
                className="mt-2 min-h-28 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => updateField("summary", event.target.value)}
                placeholder="A short member-facing summary for the event list."
                required
                value={form.summary}
              />
            </label>
            <label className="mt-4 block text-sm font-bold text-ink">
              Description
              <textarea
                className="mt-2 min-h-40 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="What members should expect, who should attend, and how the session will run."
                required
                value={form.description}
              />
            </label>

            <section className="mt-5 rounded-lg border border-border bg-surface p-4">
              <h2 className="text-base font-bold text-ink">Optional first agenda item</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <TextInput
                  label="Agenda title"
                  onChange={(value) => updateField("agenda_title", value)}
                  placeholder="Opening circle"
                  value={form.agenda_title}
                />
                <TextInput
                  label="Speaker"
                  onChange={(value) => updateField("agenda_speaker_name", value)}
                  placeholder="Chapter lead"
                  value={form.agenda_speaker_name}
                />
                <TextInput
                  label="Agenda starts"
                  onChange={(value) => updateField("agenda_starts_at", value)}
                  type="datetime-local"
                  value={form.agenda_starts_at}
                />
                <TextInput
                  label="Agenda ends"
                  onChange={(value) => updateField("agenda_ends_at", value)}
                  type="datetime-local"
                  value={form.agenda_ends_at}
                />
              </div>
              <label className="mt-4 block text-sm font-bold text-ink">
                Agenda description
                <textarea
                  className="mt-2 min-h-24 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) => updateField("agenda_description", event.target.value)}
                  placeholder="Session goals and format."
                  value={form.agenda_description}
                />
              </label>
            </section>

            {message ? (
              <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-ink">
                {message}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busy}
                type="submit"
              >
                {busy ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <Send aria-hidden="true" className="h-4 w-4" />
                )}
                {busy ? "Publishing" : "Publish event"}
              </button>
              <Link
                className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
                href="/events"
              >
                Back to events
              </Link>
            </div>
          </form>

          <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-white">
              <Sparkles aria-hidden="true" className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold text-ink">Event workflow</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Events are member-only and publish immediately in this slice. Agenda and attendee
              records are stored in the backend.
            </p>
            {created ? (
              <Link
                className="focus-ring mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
                href={`/events/${created.id}`}
              >
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                View event
              </Link>
            ) : null}
          </aside>
        </div>
      )}
    </AppShell>
  );
}

export function EventDetail({ eventId }: { eventId: string }) {
  const [state, setState] = useState<EventDetailState>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchEvent(eventId)
      .then((event) => {
        if (isMounted) {
          setState({ event, status: "ready" });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Event could not be loaded.",
            status: "error"
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  async function handleRsvp(event: EventItem) {
    setBusy(true);
    setMessage(null);
    try {
      const updated = await rsvpEvent(event.id);
      setState({ event: updated, status: "ready" });
      setMessage("You are registered for this event.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Event registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      description="Review event details, RSVP status, agenda, and attendee list."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Event detail"
    >
      {() => (
        <>
          {state.status === "loading" ? <LoadingPanel label="Loading event." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
          {state.status === "ready" ? (
            <EventDetailBody
              busy={busy}
              event={state.event}
              message={message}
              onRsvp={() => handleRsvp(state.event)}
            />
          ) : null}
        </>
      )}
    </AppShell>
  );
}

export function EventAgenda({ eventId }: { eventId: string }) {
  const [state, setState] = useState<AgendaState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    Promise.all([fetchEvent(eventId), fetchEventAgenda(eventId)])
      .then(([event, agenda]) => {
        if (isMounted) {
          setState({ agenda, event, status: "ready" });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Event agenda could not be loaded.",
            status: "error"
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  return (
    <AppShell
      description="Review the scheduled sessions for this event."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Event agenda"
    >
      {() => (
        <>
          {state.status === "loading" ? <LoadingPanel label="Loading event agenda." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
          {state.status === "ready" ? (
            <section className="grid gap-4">
              <EventMiniHeader event={state.event} />
              {state.agenda.length ? (
                state.agenda.map((item) => <AgendaItemCard item={item} key={item.id} />)
              ) : (
                <EmptyPanel label="No agenda items have been added for this event yet." />
              )}
            </section>
          ) : null}
        </>
      )}
    </AppShell>
  );
}

export function EventAttendees({ eventId }: { eventId: string }) {
  const [state, setState] = useState<AttendeesState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    Promise.all([fetchEvent(eventId), fetchEventAttendees(eventId)])
      .then(([event, attendees]) => {
        if (isMounted) {
          setState({ attendees, event, status: "ready" });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Event attendees could not be loaded.",
            status: "error"
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  return (
    <AppShell
      description="Review registered members for this event."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Event attendees"
    >
      {() => (
        <>
          {state.status === "loading" ? <LoadingPanel label="Loading event attendees." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
          {state.status === "ready" ? (
            <section className="grid gap-4">
              <EventMiniHeader event={state.event} />
              {state.attendees.length ? (
                <div className="overflow-hidden rounded-lg border border-border bg-white shadow-soft">
                  <div className="hidden bg-surface px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-muted md:grid md:grid-cols-3">
                    <span>Member</span>
                    <span>Status</span>
                    <span>Registered</span>
                  </div>
                  <div className="divide-y divide-border">
                    {state.attendees.map((attendee) => (
                      <div className="grid gap-2 px-4 py-4 text-sm md:grid-cols-3" key={attendee.id}>
                        <p className="font-bold text-ink">{attendee.display_name}</p>
                        <p className="font-semibold text-muted">{formatStatus(attendee.status)}</p>
                        <p className="font-semibold text-muted">
                          {formatEventDate(attendee.registered_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyPanel label="No attendees have registered for this event yet." />
              )}
            </section>
          ) : null}
        </>
      )}
    </AppShell>
  );
}

function EventCard({ event }: { event: EventItem }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-ink">{event.title}</h3>
            <Pill label={formatStatus(event.event_type)} />
            <Pill label={formatStatus(event.mode)} />
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{event.summary}</p>
          <EventMeta event={event} />
        </div>
        <div className="flex items-start">
          <Link
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
            href={`/events/${event.id}`}
          >
            View
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function EventDetailBody({
  busy,
  event,
  message,
  onRsvp
}: {
  busy: boolean;
  event: EventItem;
  message: string | null;
  onRsvp: () => void;
}) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill label={formatStatus(event.status)} />
            <Pill label={formatStatus(event.event_type)} />
            <Pill label={formatStatus(event.mode)} />
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold text-ink">{event.title}</h2>
          <p className="mt-4 text-lg leading-8 text-ink">{event.summary}</p>
          <EventMeta event={event} />
          <p className="mt-6 whitespace-pre-line text-base leading-8 text-muted">
            {event.description}
          </p>
          {message ? (
            <div className="mt-5 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-ink">
              {message}
            </div>
          ) : null}
        </div>
        <aside className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted">Event</h3>
          <div className="mt-4 grid gap-3">
            <Fact label="Starts" value={formatEventDate(event.starts_at)} />
            <Fact label="Ends" value={formatEventDate(event.ends_at)} />
            <Fact label="Attendees" value={`${event.attendee_count.toLocaleString()} registered`} />
            <Fact label="Capacity" value={event.capacity ? event.capacity.toLocaleString() : "Open"} />
          </div>
          <button
            className="focus-ring mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy || event.is_registered}
            onClick={onRsvp}
            type="button"
          >
            {busy ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <TicketCheck aria-hidden="true" className="h-4 w-4" />
            )}
            {event.is_registered ? "Registered" : busy ? "Registering" : "RSVP"}
          </button>
          <div className="mt-3 grid gap-2">
            <Link
              className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
              href={`/events/${event.id}/agenda`}
            >
              <ListChecks aria-hidden="true" className="h-4 w-4" />
              Agenda
            </Link>
            <Link
              className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
              href={`/events/${event.id}/attendees`}
            >
              <Users aria-hidden="true" className="h-4 w-4" />
              Attendees
            </Link>
            {event.registration_url ? (
              <a
                className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
                href={event.registration_url}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
                External link
              </a>
            ) : null}
          </div>
        </aside>
      </div>
    </article>
  );
}

function EventMiniHeader({ event }: { event: EventItem }) {
  return (
    <div className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">
        {formatStatus(event.event_type)}
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-ink">{event.title}</h2>
      <EventMeta event={event} />
    </div>
  );
}

function AgendaItemCard({ item }: { item: EventAgendaItem }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">Session time</p>
          <p className="mt-2 text-sm font-bold text-ink">
            {formatTimeRange(item.starts_at, item.ends_at)}
          </p>
        </div>
        <div>
          <h3 className="text-lg font-bold text-ink">{item.title}</h3>
          {item.speaker_name ? (
            <p className="mt-1 text-sm font-semibold text-primary">{item.speaker_name}</p>
          ) : null}
          {item.description ? (
            <p className="mt-3 text-sm leading-6 text-muted">{item.description}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function EventMeta({ event }: { event: EventItem }) {
  return (
    <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-muted">
      <span className="inline-flex items-center gap-2">
        <CalendarDays aria-hidden="true" className="h-4 w-4 text-primary" />
        {formatEventDate(event.starts_at)}
      </span>
      <span className="inline-flex items-center gap-2">
        <MapPin aria-hidden="true" className="h-4 w-4 text-primary" />
        {[event.city, event.country].filter(Boolean).join(", ") || "Location not set"}
      </span>
      <span className="inline-flex items-center gap-2">
        <Globe2 aria-hidden="true" className="h-4 w-4 text-primary" />
        {formatStatus(event.mode)}
      </span>
      <span className="inline-flex items-center gap-2">
        <Users aria-hidden="true" className="h-4 w-4 text-primary" />
        {event.attendee_count.toLocaleString()} registered
      </span>
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
        onInput={(event) => onChange(event.currentTarget.value)}
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
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

function optionalInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function optionalIso(value: string): string | null {
  return value.trim() ? datetimeLocalToIso(value) : null;
}

function datetimeLocalToIso(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function formatEventDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      });
}

function formatTimeRange(startsAt?: string | null, endsAt?: string | null) {
  if (!startsAt && !endsAt) {
    return "Time not set";
  }
  const start = startsAt ? formatEventDate(startsAt) : "Start not set";
  const end = endsAt ? formatEventDate(endsAt) : "End not set";
  return `${start} - ${end}`;
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}
