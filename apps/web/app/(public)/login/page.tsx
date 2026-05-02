import { PublicHeader } from "@/components/layout/public-header";
import { ButtonLink } from "@/components/ui/button-link";

export default function LoginPage() {
  return (
    <main>
      <PublicHeader />
      <section className="mx-auto grid min-h-[calc(100vh-90px)] max-w-6xl items-center gap-8 px-5 py-10 sm:px-8 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink">Sign in</h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
            The auth screens are scaffolded for the foundation milestone. API-backed
            registration, sessions, refresh tokens, and email verification come next.
          </p>
        </div>
        <form className="rounded-lg border border-border bg-white p-6 shadow-soft">
          <label className="block text-sm font-semibold text-ink" htmlFor="email">
            Email
          </label>
          <input
            className="mt-2 h-12 w-full rounded-lg border border-border px-4 focus:border-primary focus:outline-none"
            id="email"
            placeholder="name@example.com"
            type="email"
          />
          <label className="mt-5 block text-sm font-semibold text-ink" htmlFor="password">
            Password
          </label>
          <input
            className="mt-2 h-12 w-full rounded-lg border border-border px-4 focus:border-primary focus:outline-none"
            id="password"
            placeholder="Password"
            type="password"
          />
          <div className="mt-6">
            <ButtonLink href="/dashboard">Continue to dashboard preview</ButtonLink>
          </div>
        </form>
      </section>
    </main>
  );
}

