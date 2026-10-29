"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { ApiError, forgotPassword } from "@/lib/api";

const inputClass =
  "mt-2 h-12 w-full rounded-lg border border-border bg-white px-4 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-blue-100";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setResetToken(null);
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");

    try {
      const response = await forgotPassword(email);
      setMessage(response.message);
      setResetToken(response.dev_token);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Password reset could not be started.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="rounded-lg border border-border bg-white p-6 shadow-soft" onSubmit={handleSubmit}>
      <label className="block text-sm font-semibold text-ink" htmlFor="email">
        Account email
      </label>
      <input
        autoComplete="email"
        className={inputClass}
        id="email"
        name="email"
        placeholder="name@example.com"
        required
        type="email"
      />

      {error ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-semibold">{message}</p>
          {resetToken ? (
            <Link
              className="mt-3 inline-flex font-bold text-primary hover:underline"
              href={`/reset-password?token=${encodeURIComponent(resetToken)}`}
            >
              Open local reset link
            </Link>
          ) : null}
        </div>
      ) : null}

      <button
        className="focus-ring mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-65"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Sending..." : "Send reset instructions"}
      </button>
    </form>
  );
}
