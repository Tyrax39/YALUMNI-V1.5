import { PublicHeader } from "@/components/layout/public-header";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-surface">
      <PublicHeader />
      <section className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-5 pb-14 pt-28 sm:px-8 lg:grid-cols-[0.9fr_0.75fr]">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink sm:text-5xl">Sign in</h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
            Access the verified alumni workspace with the new FastAPI-backed
            identity service. Sessions now issue short-lived access tokens and
            rotating refresh tokens.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-sm font-bold text-ink">Token based</p>
              <p className="mt-2 text-sm leading-6 text-muted">Bearer access tokens are used for protected API calls.</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-sm font-bold text-ink">Session tracked</p>
              <p className="mt-2 text-sm leading-6 text-muted">Refresh tokens are hashed and can be revoked on logout.</p>
            </div>
          </div>
        </div>
        <AuthForm mode="login" />
      </section>
    </main>
  );
}
