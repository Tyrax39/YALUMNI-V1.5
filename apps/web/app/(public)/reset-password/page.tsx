import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { PublicHeader } from "@/components/layout/public-header";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-surface">
      <PublicHeader />
      <section className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-5 pb-14 pt-28 sm:px-8 lg:grid-cols-[0.9fr_0.75fr]">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink sm:text-5xl">Choose a new password</h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
            Reset links are single-use and time-limited. After a successful
            reset, existing sessions are revoked and you can sign in again with
            the new password.
          </p>
        </div>
        <Suspense fallback={<div className="rounded-lg border border-border bg-white p-6 shadow-soft" />}>
          <ResetPasswordForm />
        </Suspense>
      </section>
    </main>
  );
}
