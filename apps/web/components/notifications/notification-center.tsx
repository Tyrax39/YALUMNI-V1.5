"use client";

import { useEffect, useRef, useState } from "react";

import { Bell, Check, CheckCheck, Inbox, Radio } from "lucide-react";
import Link from "next/link";

import {
  ApiError,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationListResponse,
  streamNotificationSnapshots
} from "@/lib/api";

type NotificationCenterProps = {
  accessToken: string;
};

type NotificationState =
  | { status: "loading" }
  | { data: NotificationListResponse; status: "ready" }
  | { message: string; status: "error" };

const pageSize = 6;

export function NotificationCenter({ accessToken }: NotificationCenterProps) {
  const [state, setState] = useState<NotificationState>({ status: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<"connected" | "connecting" | "offline">(
    "connecting"
  );
  const latestNotificationIdRef = useRef<string | null>(null);
  const unreadCountRef = useRef<number | null>(null);

  useEffect(() => {
    void loadNotifications();
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
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-muted">
          {message}
        </p>
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
