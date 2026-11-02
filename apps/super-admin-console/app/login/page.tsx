import { SuperAdminLoginForm } from "@/components/super-admin-login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-surface">
      <section className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[0.9fr_0.75fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">YALUMNI platform owner</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-ink sm:text-5xl">
            Super-admin console
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
            This separate runtime is reserved for protected platform owner diagnostics and security visibility.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-sm font-bold text-ink">Owner only</p>
              <p className="mt-2 text-sm leading-6 text-muted">Access is denied unless the account has SUPER_ADMIN.</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-sm font-bold text-ink">Read-only diagnostics</p>
              <p className="mt-2 text-sm leading-6 text-muted">Future destructive tools stay out until backend policy exists.</p>
            </div>
          </div>
        </div>
        <SuperAdminLoginForm />
      </section>
    </main>
  );
}
