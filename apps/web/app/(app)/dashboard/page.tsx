import Link from "next/link";
import Image from "next/image";

const modules = [
  ["Verification", "Pending review queue and profile completion"],
  ["Directory", "Search by program, country, cohort, sector, and skills"],
  ["Communities", "Country chapters, sector groups, and private working teams"],
  ["Events", "RSVPs, gatherings, agendas, speakers, and check-in planning"],
  ["Messages", "Direct conversations with privacy and blocking controls"],
  ["Governance", "Contributions, elections, audit logs, and reports"]
] as const;

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link className="focus-ring rounded-lg" href="/">
            <Image
              alt="YALUMNI"
              className="block h-auto w-[132px] object-contain sm:w-[156px]"
              height={34}
              priority
              src="/brand/yalumni-logo-horizontal.svg"
              width={156}
            />
          </Link>
          <Link
            className="focus-ring rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            href="/admin"
          >
            Admin console
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_0.25fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
              Member app preview
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold text-ink">
              The authenticated workspace starts here.
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
              This dashboard shell establishes the route structure for the MVP:
              onboarding, verification, alumni discovery, communities, feed,
              messages, events, and admin operations.
            </p>
          </div>
          <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
            <p className="text-sm font-semibold text-muted">Foundation status</p>
            <p className="mt-2 font-display text-2xl font-bold text-primary">Phase 1</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Ready for auth, profile, verification, and directory implementation.
            </p>
          </aside>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map(([title, body]) => (
            <article className="rounded-lg border border-border bg-white p-5" key={title}>
              <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
