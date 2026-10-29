"use client";

import { useEffect, useMemo, useState } from "react";

import { ApiError, AuthSessionInfo, getSessions, revokeSession } from "@/lib/api";

type SessionManagementPanelProps = {
  accessToken: string;
  onCurrentSessionRevoked: () => void;
  refreshToken: string | null;
};

type SessionState =
  | { status: "loading" }
  | { status: "ready"; sessions: AuthSessionInfo[] }
  | { status: "error"; message: string };

export function SessionManagementPanel({
  accessToken,
  onCurrentSessionRevoked,
  refreshToken
}: SessionManagementPanelProps) {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getSessions(accessToken, refreshToken)
      .then((response) => {
        if (isMounted) {
          setState({ status: "ready", sessions: response.sessions });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            status: "error",
            message:
              caught instanceof ApiError
                ? caught.message
                : "Session list could not be loaded."
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, refreshToken]);

  const activeCount = useMemo(() => {
    if (state.status !== "ready") {
      return 0;
    }

    return state.sessions.filter((session) => session.is_active).length;
  }, [state]);

  async function reloadSessions() {
    setState({ status: "loading" });
    try {
      const response = await getSessions(accessToken, refreshToken);
      setState({ status: "ready", sessions: response.sessions });
    } catch (caught) {
      setState({
        status: "error",
        message:
          caught instanceof ApiError ? caught.message : "Session list could not be loaded."
      });
    }
  }

  async function handleRevoke(session: AuthSessionInfo) {
    setRevokingId(session.id);
    try {
      const response = await revokeSession(accessToken, session.id, refreshToken);
      if (response.revoked_current_session) {
        onCurrentSessionRevoked();
        return;
      }

      await reloadSessions();
    } catch (caught) {
      setState({
        status: "error",
        message:
          caught instanceof ApiError ? caught.message : "Session could not be revoked."
      });
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <section className="mt-10 rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Sessions and devices</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Review active sign-ins and revoke sessions that should no longer have refresh access.
          </p>
        </div>
        <button
          className="focus-ring rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
          onClick={reloadSessions}
          type="button"
        >
          Refresh
        </button>
      </div>

      {state.status === "loading" ? (
        <p className="mt-6 text-sm font-semibold text-muted">Loading sessions...</p>
      ) : null}

      {state.status === "error" ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.message}
        </p>
      ) : null}

      {state.status === "ready" ? (
        <>
          <div className="mt-5 flex flex-wrap gap-3">
            <StatusPill label="Active sessions" value={activeCount} />
            <StatusPill label="Total records" value={state.sessions.length} />
          </div>
          <div className="mt-5 divide-y divide-border">
            {state.sessions.map((session) => (
              <SessionRow
                key={session.id}
                onRevoke={handleRevoke}
                revokingId={revokingId}
                session={session}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function StatusPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-primary">{value}</p>
    </div>
  );
}

function SessionRow({
  onRevoke,
  revokingId,
  session
}: {
  onRevoke: (session: AuthSessionInfo) => void;
  revokingId: string | null;
  session: AuthSessionInfo;
}) {
  const isRevoking = revokingId === session.id;
  const statusText = session.is_active ? "Active" : "Revoked";

  return (
    <article className="grid gap-4 py-5 lg:grid-cols-[1fr_auto] lg:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-semibold text-ink">
            {session.is_current ? "Current session" : "Signed-in device"}
          </h3>
          <span
            className={`rounded-md px-2.5 py-1 text-xs font-bold ${
              session.is_active
                ? "bg-emerald-50 text-secondary"
                : "bg-slate-100 text-muted"
            }`}
          >
            {statusText}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted">{summarizeUserAgent(session.user_agent)}</p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <SessionDetail label="IP address" value={session.ip_address ?? "Unknown"} />
          <SessionDetail label="Created" value={formatDate(session.created_at)} />
          <SessionDetail label="Expires" value={formatDate(session.expires_at)} />
        </dl>
      </div>
      <button
        className="focus-ring rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink transition hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!session.is_active || isRevoking}
        onClick={() => onRevoke(session)}
        type="button"
      >
        {isRevoking ? "Revoking..." : session.is_current ? "Sign out here" : "Revoke"}
      </button>
    </article>
  );
}

function SessionDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function summarizeUserAgent(userAgent: string | null) {
  if (!userAgent) {
    return "Unknown device";
  }

  if (userAgent.includes("Chrome")) {
    return "Chrome browser";
  }

  if (userAgent.includes("Firefox")) {
    return "Firefox browser";
  }

  if (userAgent.includes("Safari")) {
    return "Safari browser";
  }

  return userAgent.length > 90 ? `${userAgent.slice(0, 90)}...` : userAgent;
}
