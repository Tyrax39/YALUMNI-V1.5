import { AdminLoginForm } from "@/components/admin-login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-surface">
      <section className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[0.9fr_0.75fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">YALUMNI admin</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-ink sm:text-5xl">
            Role-based admin console
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
            Sign in with an administrative account to access only the queues and tools assigned to your RBAC role.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-sm font-bold text-ink">Separate runtime</p>
              <p className="mt-2 text-sm leading-6 text-muted">This console runs independently on port 3011.</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-sm font-bold text-ink">RBAC filtered</p>
              <p className="mt-2 text-sm leading-6 text-muted">Menus and routes are filtered by the signed-in user role.</p>
            </div>
          </div>
        </div>
        <AdminLoginForm />
      </section>
    </main>
  );
}
