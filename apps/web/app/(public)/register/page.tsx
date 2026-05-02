import { PublicHeader } from "@/components/layout/public-header";
import { ButtonLink } from "@/components/ui/button-link";

const steps = [
  "Account details",
  "Program affiliation",
  "Verification evidence",
  "Profile and privacy",
  "Suggested communities"
] as const;

export default function RegisterPage() {
  return (
    <main>
      <PublicHeader />
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="max-w-3xl">
          <h1 className="font-display text-4xl font-bold text-ink">Create your alumni account</h1>
          <p className="mt-4 text-lg leading-8 text-muted">
            This placeholder mirrors the required onboarding path from the rebuild
            plan. The next implementation step connects it to FastAPI auth and
            verification endpoints.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-5">
          {steps.map((step, index) => (
            <div className="rounded-lg border border-border bg-white p-4" key={step}>
              <p className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {index + 1}
              </p>
              <p className="mt-4 text-sm font-semibold text-ink">{step}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <ButtonLink href="/dashboard">Preview onboarding destination</ButtonLink>
        </div>
      </section>
    </main>
  );
}

