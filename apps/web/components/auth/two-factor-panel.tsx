"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  ApiError,
  AuthUser,
  confirmTwoFactor,
  disableTwoFactor,
  getTwoFactorStatus,
  regenerateTwoFactorRecoveryCodes,
  setupTwoFactor,
  TwoFactorSetup,
  TwoFactorStatus
} from "@/lib/api";

type TwoFactorPanelProps = {
  accessToken: string;
  onUserChange: (user: AuthUser) => void;
  user: AuthUser;
};

type PanelState =
  | { status: "loading" }
  | { status: "ready"; security: TwoFactorStatus }
  | { status: "error"; message: string };

const inputClass =
  "mt-2 h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-blue-100";

export function TwoFactorPanel({ accessToken, onUserChange, user }: TwoFactorPanelProps) {
  const [state, setState] = useState<PanelState>({ status: "loading" });
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getTwoFactorStatus(accessToken)
      .then((security) => {
        if (isMounted) {
          setState({ security, status: "ready" });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message:
              caught instanceof ApiError
                ? caught.message
                : "Account security could not be loaded.",
            status: "error"
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, user.two_factor_enabled]);

  async function reloadStatus() {
    const security = await getTwoFactorStatus(accessToken);
    setState({ security, status: "ready" });
  }

  async function handleSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await setupTwoFactor(accessToken, String(formData.get("password") ?? ""));
      setSetup(response);
      setMessage("Setup key ready.");
      event.currentTarget.reset();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Two-factor setup failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await confirmTwoFactor(accessToken, String(formData.get("code") ?? ""));
      onUserChange(response.user);
      setSetup(null);
      setRecoveryCodes(response.recovery_codes);
      setMessage("Two-factor authentication enabled. Save your recovery codes now.");
      await reloadStatus();
      event.currentTarget.reset();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Two-factor confirmation failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDisable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const updatedUser = await disableTwoFactor(accessToken, {
        code: String(formData.get("code") ?? "").trim() || undefined,
        password: String(formData.get("password") ?? ""),
        recovery_code: String(formData.get("recovery_code") ?? "").trim() || undefined
      });
      onUserChange(updatedUser);
      setSetup(null);
      setRecoveryCodes([]);
      setMessage("Two-factor authentication disabled.");
      await reloadStatus();
      event.currentTarget.reset();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Two-factor disable failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegenerateRecoveryCodes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await regenerateTwoFactorRecoveryCodes(accessToken, {
        code: String(formData.get("code") ?? "").trim() || undefined,
        password: String(formData.get("password") ?? ""),
        recovery_code: String(formData.get("recovery_code") ?? "").trim() || undefined
      });
      setRecoveryCodes(response.recovery_codes);
      setMessage("Recovery codes regenerated. Replace any previously saved codes.");
      await reloadStatus();
      event.currentTarget.reset();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Recovery codes could not be regenerated."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const enabled = state.status === "ready" ? state.security.enabled : user.two_factor_enabled;
  const adminRequired =
    state.status === "ready" ? state.security.admin_two_factor_required : false;
  const adminSatisfied =
    state.status === "ready" ? state.security.admin_two_factor_satisfied : enabled;

  return (
    <section className="mt-10 rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Account security</h2>
          <p className="mt-2 text-sm font-semibold text-muted">
            Two-factor: {enabled ? "enabled" : "not enabled"}
          </p>
          {state.status === "ready" ? (
            <p className="mt-1 text-sm font-semibold text-muted">
              Recovery codes remaining: {state.security.recovery_codes_remaining}
            </p>
          ) : null}
        </div>
        {adminRequired ? (
          <span
            className={`rounded-md px-3 py-1 text-xs font-bold ${
              adminSatisfied ? "bg-emerald-50 text-secondary" : "bg-red-50 text-danger"
            }`}
          >
            Admin 2FA {adminSatisfied ? "ready" : "required"}
          </span>
        ) : null}
      </div>

      {state.status === "loading" ? (
        <p className="mt-5 text-sm font-semibold text-muted">Loading security status...</p>
      ) : null}

      {state.status === "error" ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.message}
        </p>
      ) : null}

      {message ? (
        <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      {!enabled ? (
        <form className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={handleSetup}>
          <div>
            <label className="block text-sm font-semibold text-ink" htmlFor="two_factor_password">
              Current password
            </label>
            <input
              autoComplete="current-password"
              className={inputClass}
              id="two_factor_password"
              name="password"
              required
              type="password"
            />
          </div>
          <button
            className="focus-ring min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-65"
            disabled={isSubmitting}
            type="submit"
          >
            Start setup
          </button>
        </form>
      ) : null}

      {setup ? (
        <form className="mt-5 grid gap-4" onSubmit={handleConfirm}>
          <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyField label="Setup key" value={setup.secret} />
            <ReadOnlyField label="Authenticator URI" value={setup.otpauth_url} />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label className="block text-sm font-semibold text-ink" htmlFor="two_factor_code">
                6-digit code
              </label>
              <input
                autoComplete="one-time-code"
                className={inputClass}
                id="two_factor_code"
                inputMode="numeric"
                maxLength={12}
                name="code"
                required
                type="text"
              />
            </div>
            <button
              className="focus-ring min-h-11 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#006d49] disabled:cursor-not-allowed disabled:opacity-65"
              disabled={isSubmitting}
              type="submit"
            >
              Confirm
            </button>
          </div>
        </form>
      ) : null}

      {enabled ? (
        <>
          {recoveryCodes.length ? (
            <RecoveryCodePanel recoveryCodes={recoveryCodes} />
          ) : null}

          <form className="mt-5 grid gap-4 md:grid-cols-3" onSubmit={handleRegenerateRecoveryCodes}>
            <div>
              <label
                className="block text-sm font-semibold text-ink"
                htmlFor="regenerate_two_factor_password"
              >
                Current password
              </label>
              <input
                autoComplete="current-password"
                className={inputClass}
                id="regenerate_two_factor_password"
                name="password"
                required
                type="password"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink" htmlFor="regenerate_two_factor_code">
                6-digit code
              </label>
              <input
                autoComplete="one-time-code"
                className={inputClass}
                id="regenerate_two_factor_code"
                inputMode="numeric"
                maxLength={12}
                name="code"
                type="text"
              />
            </div>
            <div>
              <label
                className="block text-sm font-semibold text-ink"
                htmlFor="regenerate_two_factor_recovery_code"
              >
                Recovery code
              </label>
              <input
                className={inputClass}
                id="regenerate_two_factor_recovery_code"
                name="recovery_code"
                type="text"
              />
            </div>
            <div className="md:col-span-3 flex items-start justify-end">
              <button
                className="focus-ring min-h-11 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-65"
                disabled={isSubmitting}
                type="submit"
              >
                Regenerate recovery codes
              </button>
            </div>
          </form>

          <form className="mt-5 grid gap-4 md:grid-cols-4 md:items-end" onSubmit={handleDisable}>
            <div>
              <label className="block text-sm font-semibold text-ink" htmlFor="disable_two_factor_password">
              Current password
              </label>
              <input
                autoComplete="current-password"
                className={inputClass}
                id="disable_two_factor_password"
                name="password"
                required
                type="password"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink" htmlFor="disable_two_factor_code">
              6-digit code
              </label>
              <input
                autoComplete="one-time-code"
                className={inputClass}
                id="disable_two_factor_code"
                inputMode="numeric"
                maxLength={12}
                name="code"
                type="text"
              />
            </div>
            <div>
              <label
                className="block text-sm font-semibold text-ink"
                htmlFor="disable_two_factor_recovery_code"
              >
                Recovery code
              </label>
              <input
                className={inputClass}
                id="disable_two_factor_recovery_code"
                name="recovery_code"
                type="text"
              />
            </div>
            <button
              className="focus-ring min-h-11 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink transition hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-65"
              disabled={isSubmitting}
              type="submit"
            >
              Disable
            </button>
          </form>
        </>
      ) : null}
    </section>
  );
}

function RecoveryCodePanel({ recoveryCodes }: { recoveryCodes: string[] }) {
  return (
    <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">
        Save these recovery codes. Each code can be used once if you lose access to your authenticator.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {recoveryCodes.map((code) => (
          <div
            className="rounded-md border border-amber-200 bg-white px-3 py-2 font-mono text-sm font-semibold text-amber-950"
            key={code}
          >
            {code}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-ink">{label}</label>
      <input className={`${inputClass} font-mono`} readOnly type="text" value={value} />
    </div>
  );
}
