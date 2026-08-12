"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { ApiError, resetPassword } from "@/lib/api";

const inputClass =
  "mt-2 h-12 w-full rounded-lg border border-border bg-white px-4 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-blue-100";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("new_password") ?? "");

    try {
      const response = await resetPassword(token, newPassword);
      window.localStorage.removeItem("yalumni.accessToken");
      window.localStorage.removeItem("yalumni.refreshToken");
      window.localStorage.removeItem("yalumni.user");
      setMessage(response.message);
      window.setTimeout(() => router.push("/login"), 900);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Password reset failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="rounded-lg border border-border bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold text-red-700">Reset token is missing.</p>
        <Link className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline" href="/forgot-password">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <form className="rounded-lg border border-border bg-white p-6 shadow-soft" onSubmit={handleSubmit}>
      <label className="block text-sm font-semibold text-ink" htmlFor="new_password">
        New password
      </label>
      <input
        autoComplete="new-password"
        className={inputClass}
        id="new_password"
        minLength={10}
        name="new_password"
        placeholder="At least 10 characters"
        required
        type="password"
      />

      {error ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {message}
        </p>
      ) : null}

      <button
        className="focus-ring mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-65"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Resetting..." : "Reset password"}
      </button>
    </form>
  );
}
