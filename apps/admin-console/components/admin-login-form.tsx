"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type CsrfResponse = {
  csrf_token: string;
};

type ErrorResponse = {
  detail?: string;
};

const inputClass =
  "mt-2 h-12 w-full rounded-lg border border-border bg-white px-4 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-blue-100";

async function getCsrfToken(): Promise<string> {
  const response = await fetch("/api/session/csrf", {
    cache: "no-store",
    credentials: "include"
  });
  if (!response.ok) {
    throw new Error("The admin session could not be prepared.");
  }

  return ((await response.json()) as CsrfResponse).csrf_token;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ErrorResponse;
    return body.detail ?? "Invalid email or password";
  } catch {
    return "Invalid email or password";
  }
}

export function AdminLoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const nextPath = new URLSearchParams(window.location.search).get("next");

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch("/api/session/login", {
        body: JSON.stringify({
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
          ...(String(formData.get("two_factor_code") ?? "").trim()
            ? { two_factor_code: String(formData.get("two_factor_code") ?? "").trim() }
            : {}),
          ...(String(formData.get("two_factor_recovery_code") ?? "").trim()
            ? {
                two_factor_recovery_code: String(
                  formData.get("two_factor_recovery_code") ?? ""
                ).trim()
              }
            : {})
        }),
        cache: "no-store",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken
        },
        method: "POST"
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      window.location.assign(nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Invalid email or password";
      if (message === "Two-factor authentication required") {
        setRequiresTwoFactor(true);
      }
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="rounded-lg border border-border bg-white p-6 shadow-soft" onSubmit={handleSubmit}>
      <label className="block text-sm font-semibold text-ink" htmlFor="email">
        Admin email
      </label>
      <input
        autoComplete="email"
        className={inputClass}
        id="email"
        name="email"
        placeholder="admin@yalumni.org"
        required
        type="email"
      />

      <label className="mt-5 block text-sm font-semibold text-ink" htmlFor="password">
        Password
      </label>
      <input
        autoComplete="current-password"
        className={inputClass}
        id="password"
        name="password"
        placeholder="Password"
        required
        type="password"
      />

      {requiresTwoFactor ? (
        <>
          <label className="mt-5 block text-sm font-semibold text-ink" htmlFor="two_factor_code">
            Two-factor code
          </label>
          <input
            autoComplete="one-time-code"
            className={inputClass}
            id="two_factor_code"
            inputMode="numeric"
            name="two_factor_code"
            placeholder="6-digit code"
            type="text"
          />

          <label className="mt-5 block text-sm font-semibold text-ink" htmlFor="two_factor_recovery_code">
            Recovery code
          </label>
          <input
            autoComplete="one-time-code"
            className={inputClass}
            id="two_factor_recovery_code"
            name="two_factor_recovery_code"
            placeholder="Use only if you cannot access your authenticator"
            type="text"
          />
        </>
      ) : null}

      {error ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      <button
        className="focus-ring mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-65"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Signing in..." : "Sign in to admin console"}
      </button>

      <p className="mt-5 text-center text-sm text-muted">
        Member workspace is separate at{" "}
        <Link className="font-semibold text-primary hover:underline" href="http://127.0.0.1:3010/login">
          127.0.0.1:3010
        </Link>
        .
      </p>
    </form>
  );
}
