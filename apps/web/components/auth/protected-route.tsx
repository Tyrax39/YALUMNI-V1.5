"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useState } from "react";

import { ApiError, AuthUser, bootstrapLocalAdmin, getMe } from "@/lib/api";

const cookieSessionToken = "cookie-session";

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; accessToken: string; refreshToken: string | null; user: AuthUser }
  | { status: "error"; message: string };

export type ProtectedRouteContext = {
  accessToken: string;
  clearSession: () => void;
  refreshToken: string | null;
  setUser: (user: AuthUser) => void;
  user: AuthUser;
};

type ProtectedRouteProps = {
  allowLocalAdminBootstrap?: boolean;
  children: (context: ProtectedRouteContext) => ReactNode;
  description: string;
  requiredRoles?: readonly string[];
  title: string;
};

function clearStoredAuth() {
  window.localStorage.removeItem("yalumni.accessToken");
  window.localStorage.removeItem("yalumni.refreshToken");
  window.localStorage.removeItem("yalumni.user");
}

export function ProtectedRoute({
  allowLocalAdminBootstrap = false,
  children,
  description,
  requiredRoles = [],
  title
}: ProtectedRouteProps) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  useEffect(() => {
    getMe()
      .then((user) => {
        clearStoredAuth();
        setState({
          accessToken: cookieSessionToken,
          refreshToken: null,
          status: "authenticated",
          user
        });
      })
      .catch((caught) => {
        clearStoredAuth();
        if (caught instanceof ApiError && caught.status === 401) {
          setState({ status: "anonymous" });
          return;
        }

        setState({
          status: "error",
          message:
            caught instanceof ApiError
              ? caught.message
              : "Your session could not be verified."
        });
      });
  }, []);

  const hasRequiredRole = useMemo(() => {
    if (state.status !== "authenticated" || requiredRoles.length === 0) {
      return true;
    }

    return state.user.roles.some((role) => requiredRoles.includes(role));
  }, [requiredRoles, state]);

  function setUser(user: AuthUser) {
    if (state.status !== "authenticated") {
      return;
    }

    setState({ ...state, user });
  }

  function clearSession() {
    clearStoredAuth();
    setState({ status: "anonymous" });
  }

  async function handleBootstrapAdmin() {
    if (state.status !== "authenticated") {
      return;
    }

    setBootstrapError(null);
    setIsBootstrapping(true);
    try {
      const user = await bootstrapLocalAdmin(state.accessToken);
      setUser(user);
    } catch (caught) {
      setBootstrapError(
        caught instanceof ApiError ? caught.message : "Admin bootstrap could not be completed."
      );
    } finally {
      setIsBootstrapping(false);
    }
  }

  if (state.status === "loading") {
    return (
      <GuardPanel description={description} title={`Loading ${title.toLowerCase()}`} />
    );
  }

  if (state.status === "anonymous") {
    return (
      <GuardPanel
        action={
          <Link
            className="focus-ring inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white"
            href="/login"
          >
            Sign in
          </Link>
        }
        description="Sign in with an active YALUMNI account to continue."
        title="Authentication required"
      />
    );
  }

  if (state.status === "error") {
    return (
      <GuardPanel
        action={
          <Link
            className="focus-ring inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white"
            href="/login"
          >
            Sign in again
          </Link>
        }
        description={state.message}
        title="Session check failed"
      />
    );
  }

  if (!hasRequiredRole) {
    return (
      <GuardPanel
        action={
          allowLocalAdminBootstrap ? (
            <div className="flex flex-col items-start gap-3">
              <button
                className="focus-ring rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-65"
                disabled={isBootstrapping}
                onClick={handleBootstrapAdmin}
                type="button"
              >
                {isBootstrapping ? "Granting access..." : "Enable local admin access"}
              </button>
              {bootstrapError ? (
                <p className="text-sm font-semibold text-danger">{bootstrapError}</p>
              ) : null}
            </div>
          ) : null
        }
        description={`Signed in as ${state.user.email}, but this route requires an admin role.`}
        eyebrow={state.user.roles.length ? `Current roles: ${state.user.roles.join(", ")}` : "No roles assigned"}
        title="Admin role required"
      />
    );
  }

  return (
    <>
      {children({
        accessToken: state.accessToken,
        clearSession,
        refreshToken: state.refreshToken,
        setUser,
        user: state.user
      })}
    </>
  );
}

function GuardPanel({
  action,
  description,
  eyebrow,
  title
}: {
  action?: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-76px)] max-w-5xl items-center px-5 py-12 sm:px-8">
      <div className="w-full rounded-lg border border-border bg-white p-6 shadow-soft sm:p-8">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{description}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </section>
  );
}
