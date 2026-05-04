import { Suspense } from "react";

import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";
import { PublicHeader } from "@/components/layout/public-header";

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen bg-surface">
      <PublicHeader />
      <section className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-5 pb-14 pt-28 sm:px-8 lg:grid-cols-[0.9fr_0.75fr]">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink sm:text-5xl">Verify your email</h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
            Email verification confirms account ownership before sensitive
            workflows such as password reset, profile verification, and future
            admin-scoped actions.
          </p>
        </div>
        <Suspense fallback={<div className="rounded-lg border border-border bg-white p-6 shadow-soft" />}>
          <VerifyEmailPanel />
        </Suspense>
      </section>
    </main>
  );
}
