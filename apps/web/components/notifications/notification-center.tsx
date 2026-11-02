"use client";

import { useEffect, useRef, useState } from "react";

import { Bell, Check, CheckCheck, Inbox, Radio, Save, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import {
  ApiError,
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationListResponse,
  NotificationPreference,
  NotificationPreferenceUpdate,
  streamNotificationSnapshots,
  updateNotificationPreferences
} from "@/lib/api";

type NotificationCenterProps = {
  accessToken: string;
};

type NotificationState =
  | { status: "loading" }
  | { data: NotificationListResponse; status: "ready" }
  | { message: string; status: "error" };

type NotificationPreferenceState =
  | { status: "loading" }
  | { data: NotificationPreference; status: "ready" }
  | { message: string; status: "error" };

const pageSize = 6;
const notificationEventOptions = [
  { eventType: "community.join_requested", label: "Join requests" },
  { eventType: "community.member_approved", label: "Membership approvals" },
  { eventType: "community.member_rejected", label: "Membership rejections" },
  { eventType: "community.member_role_updated", label: "Role updates" },
  { eventType: "community.invitation_created", label: "Invitations" },
  { eventType: "community.invitation_accepted", label: "Accepted invitations" },
  { eventType: "community.post_comment_created", label: "Post comments" },
  { eventType: "community.post_report_created", label: "Post reports" },
  { eventType: "community.post_report_resolved", label: "Resolved reports" },
  { eventType: "community.post_removed", label: "Removed posts" },
  { eventType: "community.post_restored", label: "Restored posts" },
  { eventType: "community.post_comment_removed", label: "Removed comments" },
  { eventType: "community.post_comment_restored", label: "Restored comments" },
  { eventType: "community.moderation_escalated", label: "Moderation escalations" }
] as const;

export function NotificationCenter({ accessToken }: NotificationCenterProps) {
  const [state, setState] = useState<NotificationState>({ status: "loading" });
  const [preferenceState, setPreferenceState] = useState<NotificationPreferenceState>({
    status: "loading"
  });
  const [preferenceForm, setPreferenceForm] = useState<NotificationPreferenceUpdate>({
    email_digest_frequency: "NONE",
    in_app_enabled: true,
    muted_event_types: []
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<"connected" | "connecting" | "offline">(
    "connecting"
  );
  const latestNotificationIdRef = useRef<string | null>(null);
  const unreadCountRef = useRef<number | null>(null);

  useEffect(() => {
    void loadNotifications();
    void loadPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    const abortController = new AbortController();

    async function connectStream() {
      setStreamStatus("connecting");
      try {
        await streamNotificationSnapshots(accessToken, {
          onSnapshot: (snapshot) => {
            setStreamStatus("connected");
            const latestId = snapshot.latest_notification?.id ?? null;
            const latestChanged = latestId !== latestNotificationIdRef.current;
            const countChanged = snapshot.unread_count !== unreadCountRef.current;
            latestNotificationIdRef.current = latestId;
            unreadCountRef.current = snapshot.unread_count;

            setState((current) => {
              if (current.status !== "ready") {
                return current;
              }

              return {
                data: {
                  ...current.data,
                  unread_count: snapshot.unread_count
                },
                status: "ready"
              };
            });

            if (latestChanged || countChanged) {
              void loadNotifications(0, { silent: true });
            }
          },
          signal: abortController.signal
        });
      } catch {
        if (!abortController.signal.aborted) {
          setStreamStatus("offline");
        }
      }
    }

    void connectStream();

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function loadNotifications(offset = 0, options: { silent?: boolean } = {}) {
    if (!options.silent) {
      setState({ status: "loading" });
      setMessage(null);
    }
    try {
      const data = await listNotifications(accessToken, {
        limit: pageSize,
        offset,
        status: "UNREAD"
      });
      latestNotificationIdRef.current = data.notifications[0]?.id ?? null;
      unreadCountRef.current = data.unread_count;
      setState({ data, status: "ready" });
    } catch (caught) {
      if (options.silent) {
        return;
      }
      setState({
        message:
          caught instanceof ApiError
            ? caught.message
            : "Notifications could not be loaded.",
        status: "error"
      });
    }
  }

  async function loadPreferences() {
    setPreferenceState({ status: "loading" });
    try {
      const data = await getNotificationPreferences(accessToken);
      setPreferenceState({ data, status: "ready" });
      setPreferenceForm({
        email_digest_frequency: data.email_digest_frequency,
        in_app_enabled: data.in_app_enabled,
        muted_event_types: data.muted_event_types
      });
    } catch (caught) {
      setPreferenceState({
        message:
          caught instanceof ApiError
            ? caught.message
            : "Notification preferences could not be loaded.",
        status: "error"
      });
    }
  }

  function handleMuteToggle(eventType: string, checked: boolean) {
    setPreferenceForm((current) => {
      const mutedEventTypes = new Set(current.muted_event_types ?? []);
      if (checked) {
        mutedEventTypes.add(eventType);
      } else {
        mutedEventTypes.delete(eventType);
      }

      return {
        ...current,
        muted_event_types: Array.from(mutedEventTypes)
      };
    });
  }

  async function handleSavePreferences() {
    setIsSavingPreferences(true);
    setMessage(null);
    try {
      const updatedPreferences = await updateNotificationPreferences(accessToken, {
        email_digest_frequency: preferenceForm.email_digest_frequency ?? "NONE",
        in_app_enabled: preferenceForm.in_app_enabled ?? true,
        muted_event_types: preferenceForm.muted_event_types ?? []
      });
      setPreferenceState({ data: updatedPreferences, status: "ready" });
      setPreferenceForm({
        email_digest_frequency: updatedPreferences.email_digest_frequency,
        in_app_enabled: updatedPreferences.in_app_enabled,
        muted_event_types: updatedPreferences.muted_event_types
      });
      setMessage("Notification preferences saved.");
    } catch (caught) {
      setMessage(
        caught instanceof ApiError ? caught.message : "Notification preferences could not be saved."
      );
    } finally {
      setIsSavingPreferences(false);
    }
  }

  async function handleMarkRead(notificationId: string) {
    setBusyId(notificationId);
    setMessage(null);
    try {
      await markNotificationRead(accessToken, notificationId);
      if (state.status === "ready") {
        await loadNotifications(state.data.offset);
      } else {
        await loadNotifications();
      }
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Notification could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkAllRead() {
    setBusyId("all");
    setMessage(null);
    try {
      const result = await markAllNotificationsRead(accessToken);
      setMessage(
        result.marked_read === 0
          ? "No unread notifications."
          : `${result.marked_read} notification${result.marked_read === 1 ? "" : "s"} marked read.`
      );
      await loadNotifications();
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Notifications could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-10 rounded-lg border border-border bg-white p-6 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bell aria-hidden="true" size={20} />
            </span>
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                Notifications
              </h2>
              {state.status === "ready" ? (
                <p className="mt-1 text-sm font-semibold text-muted">
                  {state.data.unread_count} unread
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${
              streamStatus === "connected"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-border bg-surface text-muted"
            }`}
          >
            <Radio aria-hidden="true" size={16} />
            {streamStatus === "connected"
              ? "Live"
              : streamStatus === "connecting"
                ? "Connecting"
                : "Offline"}
          </span>
          <button
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={
              busyId === "all" || state.status !== "ready" || state.data.unread_count === 0
            }
            onClick={handleMarkAllRead}
            type="button"
          >
            <CheckCheck aria-hidden="true" size={16} />
            Mark all read
          </button>
          <button
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
            onClick={() => setIsPreferencesOpen((current) => !current)}
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" size={16} />
            Preferences
          </button>
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-muted">
          {message}
        </p>
      ) : null}

      {isPreferencesOpen ? (
        <div className="mt-5 border-y border-border bg-surface px-4 py-4">
          {preferenceState.status === "loading" ? (
            <p className="text-sm font-semibold text-muted">Loading preferences...</p>
          ) : null}
          {preferenceState.status === "error" ? (
            <p className="text-sm font-semibold text-red-700">{preferenceState.message}</p>
          ) : null}
          {preferenceState.status === "ready" ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
              <label className="flex items-center gap-3 text-sm font-semibold text-ink">
                <input
                  checked={preferenceForm.in_app_enabled ?? true}
                  className="h-4 w-4 accent-primary"
                  onChange={(event) =>
                    setPreferenceForm((current) => ({
                      ...current,
                      in_app_enabled: event.target.checked
                    }))
                  }
                  type="checkbox"
                />
                In-app notifications
              </label>
              <label className="text-sm font-semibold text-ink">
                Email digest
                <select
                  className="focus-ring mt-2 min-h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-ink"
                  onChange={(event) =>
                    setPreferenceForm((current) => ({
                      ...current,
                      email_digest_frequency: event.target.value as "DAILY" | "NONE" | "WEEKLY"
                    }))
                  }
                  value={preferenceForm.email_digest_frequency ?? "NONE"}
                >
                  <option value="NONE">None</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </label>
              <div className="lg:col-span-2">
                <p className="text-sm font-semibold text-ink">Muted event types</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {notificationEventOptions.map((option) => (
                    <label
                      className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-white px-3 text-sm font-semibold text-muted"
                      key={option.eventType}
                    >
                      <input
                        checked={(preferenceForm.muted_event_types ?? []).includes(
                          option.eventType
                        )}
                        className="h-4 w-4 accent-primary"
                        onChange={(event) =>
                          handleMuteToggle(option.eventType, event.target.checked)
                        }
                        type="checkbox"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-2">
                <button
                  className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSavingPreferences}
                  onClick={() => void handleSavePreferences()}
                  type="button"
                >
                  <Save aria-hidden="true" size={16} />
                  {isSavingPreferences ? "Saving..." : "Save preferences"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {state.status === "loading" ? (
        <div className="mt-6 rounded-lg border border-border bg-surface p-4 text-sm font-semibold text-muted">
          Loading notifications...
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {state.message}
        </div>
      ) : null}

      {state.status === "ready" ? (
        <>
          {state.data.notifications.length === 0 ? (
            <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-surface p-4 text-sm font-semibold text-muted">
              <Inbox aria-hidden="true" size={18} />
              You are all caught up.
            </div>
          ) : (
            <div className="mt-6 divide-y divide-border">
              {state.data.notifications.map((notification) => (
                <article
                  className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]"
                  key={notification.id}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-semibold text-ink">
                        {notification.title}
                      </h3>
                      <span className="rounded-full bg-secondary/10 px-2 py-1 text-xs font-semibold uppercase text-secondary">
                        {notification.event_type.replaceAll("_", " ")}
                      </span>
                    </div>
                    {notification.body ? (
                      <p className="mt-2 text-sm leading-6 text-muted">{notification.body}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted">
                      {notification.actor_display_name ? (
                        <span>From {notification.actor_display_name}</span>
                      ) : null}
                      <time dateTime={notification.created_at}>
                        {new Date(notification.created_at).toLocaleString()}
                      </time>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    {notification.target_url ? (
                      <Link
                        className="focus-ring rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary"
                        href={notification.target_url}
                      >
                        Open
                      </Link>
                    ) : null}
                    <button
                      className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={busyId === notification.id}
                      onClick={() => void handleMarkRead(notification.id)}
                      title="Mark notification read"
                      type="button"
                    >
                      <Check aria-hidden="true" size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {state.data.total > pageSize ? (
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                className="focus-ring rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={state.data.offset === 0}
                onClick={() => void loadNotifications(Math.max(0, state.data.offset - pageSize))}
                type="button"
              >
                Previous
              </button>
              <p className="text-sm font-semibold text-muted">
                {state.data.offset + 1}-{state.data.offset + state.data.notifications.length} of{" "}
                {state.data.total}
              </p>
              <button
                className="focus-ring rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!state.data.has_more}
                onClick={() => void loadNotifications(state.data.offset + pageSize)}
                type="button"
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
