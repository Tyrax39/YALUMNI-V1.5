import Image from "next/image";

import { ButtonLink } from "@/components/ui/button-link";
import { PublicHeader } from "@/components/layout/public-header";
import { capabilityCards, platformStats } from "@/lib/site";

export default function LandingPage() {
  return (
    <main>
      <PublicHeader />

      <section className="mx-auto grid min-h-[calc(100vh-90px)] w-full max-w-7xl items-center gap-10 px-5 pb-12 pt-4 sm:px-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="max-w-3xl">
          <p className="mb-5 max-w-xl text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
            Verified alumni network foundation
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight text-ink sm:text-5xl lg:text-6xl">
            Build trusted YALI alumni communities that can organize, govern, and grow.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            YALUMNI V1.5 is the new platform foundation for alumni identity,
            discovery, chapters, events, initiatives, contributions, elections,
            and transparent community operations.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/register">Join the alumni network</ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary">
              Preview member dashboard
            </ButtonLink>
          </div>
          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
            {platformStats.map((stat) => (
              <div className="rounded-lg border border-border bg-white p-4" key={stat.label}>
                <p className="font-display text-2xl font-bold text-primary">{stat.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-4 top-8 hidden rounded-lg bg-secondary px-4 py-3 text-sm font-semibold text-white shadow-soft lg:block">
            Admin verification ready
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-white shadow-soft">
            <Image
              alt="Public landing page design reference"
              className="h-auto w-full"
              height={900}
              priority
              src="/brand/public-landing-reference.png"
              width={1200}
            />
          </div>
          <div className="absolute -bottom-5 right-5 rounded-lg border border-border bg-white px-5 py-4 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Current phase</p>
            <p className="mt-1 font-display text-xl font-bold text-ink">Monorepo foundation</p>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-12 sm:px-8 lg:grid-cols-4">
          {capabilityCards.map((card) => (
            <article className="rounded-lg border border-border bg-surface p-5" key={card.title}>
              <h2 className="font-display text-lg font-semibold text-ink">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{card.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
