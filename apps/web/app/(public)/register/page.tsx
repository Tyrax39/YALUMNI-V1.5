import { PublicHeader } from "@/components/layout/public-header";
import { AuthForm } from "@/components/auth/auth-form";

const steps = [
  "Account details",
  "Program affiliation",
  "Verification evidence",
  "Profile and privacy",
  "Suggested communities"
] as const;

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-surface">
      <PublicHeader />
      <section className="mx-auto grid min-h-screen max-w-6xl gap-10 px-5 pb-14 pt-28 sm:px-8 lg:grid-cols-[0.9fr_0.75fr]">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink sm:text-5xl">Create your alumni account</h1>
          <p className="mt-4 text-lg leading-8 text-muted">
            Start the trusted identity path for the alumni network. This slice
            creates a real user account, assigns the initial unverified role, and
            opens the authenticated workspace.
          </p>
        </div>
        <div className="lg:row-span-2">
          <AuthForm mode="register" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {steps.map((step, index) => (
            <div className="rounded-lg border border-border bg-white p-4" key={step}>
              <p className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {index + 1}
              </p>
              <p className="mt-4 text-sm font-semibold text-ink">{step}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
