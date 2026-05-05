"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import {
  ApiError,
  AuthResponse,
  login,
  register,
  type LoginPayload,
  type RegisterPayload
} from "@/lib/api";

type AuthFormProps = {
  mode: "login" | "register";
};

const inputClass =
  "mt-2 h-12 w-full rounded-lg border border-border bg-white px-4 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-blue-100";

function storeAuth(response: AuthResponse) {
  window.localStorage.removeItem("yalumni.accessToken");
  window.localStorage.removeItem("yalumni.refreshToken");
  window.localStorage.removeItem("yalumni.user");
  if (response.dev_email_verification_token) {
    window.localStorage.setItem(
      "yalumni.emailVerificationToken",
      response.dev_email_verification_token
    );
  } else {
    window.localStorage.removeItem("yalumni.emailVerificationToken");
  }
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const response = isRegister
        ? await register({
            display_name: String(formData.get("display_name") ?? ""),
            email,
            first_name: String(formData.get("first_name") ?? ""),
            last_name: String(formData.get("last_name") ?? ""),
            password
          } satisfies RegisterPayload)
        : await login({ email, password } satisfies LoginPayload);

      storeAuth(response);
      setSuccess(isRegister ? "Account created. Opening your dashboard..." : "Signed in. Opening your dashboard...");
      const nextPath = new URLSearchParams(window.location.search).get("next");
      router.push(nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard");
      router.refresh();
    } catch (caught) {
      const message =
        caught instanceof ApiError ? caught.message : "The auth service could not be reached.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="rounded-lg border border-border bg-white p-6 shadow-soft" onSubmit={handleSubmit}>
      {isRegister ? (
        <>
          <label className="block text-sm font-semibold text-ink" htmlFor="display_name">
            Display name
          </label>
          <input
            className={inputClass}
            id="display_name"
            minLength={2}
            name="display_name"
            placeholder="Amara Diallo"
            required
            type="text"
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-ink" htmlFor="first_name">
                First name
              </label>
              <input className={inputClass} id="first_name" name="first_name" placeholder="Amara" type="text" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink" htmlFor="last_name">
                Last name
              </label>
              <input className={inputClass} id="last_name" name="last_name" placeholder="Diallo" type="text" />
            </div>
          </div>
        </>
      ) : null}

      <label className={`${isRegister ? "mt-5" : ""} block text-sm font-semibold text-ink`} htmlFor="email">
        Email
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

      <label className="mt-5 block text-sm font-semibold text-ink" htmlFor="password">
        Password
      </label>
      <input
        autoComplete={isRegister ? "new-password" : "current-password"}
        className={inputClass}
        id="password"
        minLength={isRegister ? 10 : 1}
        name="password"
        placeholder={isRegister ? "At least 10 characters" : "Password"}
        required
        type="password"
      />

      {error ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {success}
        </p>
      ) : null}

      <button
        className="focus-ring mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-65"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
      </button>

      <p className="mt-5 text-center text-sm text-muted">
        {isRegister ? "Already have an account?" : "New to YALUMNI?"}{" "}
        <Link className="font-semibold text-primary hover:underline" href={isRegister ? "/login" : "/register"}>
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
      {!isRegister ? (
        <p className="mt-3 text-center text-sm">
          <Link className="font-semibold text-primary hover:underline" href="/forgot-password">
            Forgot password?
          </Link>
        </p>
      ) : null}
    </form>
  );
}
