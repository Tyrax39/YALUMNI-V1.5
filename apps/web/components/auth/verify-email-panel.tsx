"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthUser, verifyEmail } from "@/lib/api";

type VerificationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; user: AuthUser }
  | { status: "error"; message: string };

export function VerifyEmailPanel() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<VerificationState>({ status: token ? "loading" : "idle" });

  useEffect(() => {
    if (!token) {
      return;
    }

    verifyEmail(token)
      .then((user) => {
        window.localStorage.removeItem("yalumni.emailVerificationToken");
        setState({ status: "success", user });
      })
      .catch(() => setState({ status: "error", message: "This verification link is invalid or expired." }));
  }, [token]);

  return (
    <div className="rounded-lg border border-border bg-white p-6 shadow-soft">
      {state.status === "idle" ? (
        <>
          <p className="font-display text-2xl font-bold text-ink">Verification token missing</p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Open the verification link from your email, or use the local development token shown after registration.
          </p>
        </>
      ) : null}
      {state.status === "loading" ? (
        <>
          <p className="font-display text-2xl font-bold text-ink">Verifying email</p>
          <p className="mt-3 text-sm leading-6 text-muted">Please wait while we confirm your account email.</p>
        </>
      ) : null}
      {state.status === "success" ? (
        <>
          <p className="font-display text-2xl font-bold text-primary">Email verified</p>
          <p className="mt-3 text-sm leading-6 text-muted">
            {state.user.email} is now marked as verified for account security.
          </p>
          <Link className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline" href="/dashboard">
            Continue to dashboard
          </Link>
        </>
      ) : null}
      {state.status === "error" ? (
        <>
          <p className="font-display text-2xl font-bold text-red-700">Verification failed</p>
          <p className="mt-3 text-sm leading-6 text-muted">{state.message}</p>
          <Link className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline" href="/register">
            Return to registration
          </Link>
        </>
      ) : null}
    </div>
  );
}
