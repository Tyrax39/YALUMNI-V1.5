"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthUser, getMe, logout, verifyEmail } from "@/lib/api";

type SessionState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: AuthUser }
  | { status: "error"; message: string };

export function SessionCard() {
  const [session, setSession] = useState<SessionState>({ status: "anonymous" });
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const accessToken = window.localStorage.getItem("yalumni.accessToken");
    if (!accessToken) {
      return;
    }
    const storedVerificationToken = window.localStorage.getItem("yalumni.emailVerificationToken");

    getMe(accessToken)
      .then((user) => {
        setVerificationToken(storedVerificationToken);
        setSession({ status: "authenticated", user });
      })
      .catch(() => setSession({ status: "error", message: "Your session could not be verified." }));
  }, []);

  async function handleVerifyEmail() {
    if (!verificationToken) {
      return;
    }

    setIsVerifying(true);
    try {
      const user = await verifyEmail(verificationToken);
      window.localStorage.removeItem("yalumni.emailVerificationToken");
      window.localStorage.setItem("yalumni.user", JSON.stringify(user));
      setVerificationToken(null);
      setSession({ status: "authenticated", user });
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleLogout() {
    const refreshToken = window.localStorage.getItem("yalumni.refreshToken");
    if (refreshToken) {
      await logout(refreshToken).catch(() => undefined);
    }
    window.localStorage.removeItem("yalumni.accessToken");
    window.localStorage.removeItem("yalumni.refreshToken");
    window.localStorage.removeItem("yalumni.user");
    setSession({ status: "anonymous" });
  }

  if (session.status === "loading") {
    return (
      <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
        <p className="text-sm font-semibold text-muted">Session status</p>
        <p className="mt-2 font-display text-2xl font-bold text-primary">Checking</p>
      </aside>
    );
  }

  if (session.status === "authenticated") {
    return (
      <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
        <p className="text-sm font-semibold text-muted">Signed in as</p>
        <p className="mt-2 font-display text-2xl font-bold text-primary">{session.user.display_name}</p>
        <p className="mt-2 text-sm text-muted">{session.user.email}</p>
        <p className="mt-3 text-sm font-semibold text-muted">
          Email: {session.user.email_verified_at ? "verified" : "not verified yet"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {session.user.roles.map((role) => (
            <span className="rounded-md bg-blue-50 px-3 py-1 text-xs font-bold text-primary" key={role}>
              {role.replaceAll("_", " ")}
            </span>
          ))}
        </div>
        {!session.user.email_verified_at && verificationToken ? (
          <button
            className="focus-ring mt-4 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#006d49] disabled:cursor-not-allowed disabled:opacity-65"
            disabled={isVerifying}
            onClick={handleVerifyEmail}
            type="button"
          >
            {isVerifying ? "Verifying..." : "Verify email"}
          </button>
        ) : null}
        <button
          className="focus-ring mt-5 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
          onClick={handleLogout}
          type="button"
        >
          Sign out
        </button>
      </aside>
    );
  }

  return (
    <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <p className="text-sm font-semibold text-muted">Foundation status</p>
      <p className="mt-2 font-display text-2xl font-bold text-primary">Auth ready</p>
      <p className="mt-2 text-sm leading-6 text-muted">
        Register or sign in to test the new API-backed identity flow.
      </p>
      {session.status === "error" ? <p className="mt-3 text-sm font-semibold text-red-700">{session.message}</p> : null}
      <div className="mt-5 flex gap-3">
        <Link className="focus-ring rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" href="/login">
          Sign in
        </Link>
        <Link
          className="focus-ring rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink"
          href="/register"
        >
          Register
        </Link>
      </div>
    </aside>
  );
}
