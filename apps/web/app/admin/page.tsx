import Link from "next/link";
import Image from "next/image";

const queues = [
  ["Verification queue", "Review alumni evidence, approve, reject, or request more information."],
  ["User management", "Assign roles, review account status, and audit sensitive changes."],
  ["Moderation", "Resolve reports for posts, profiles, messages, events, and communities."],
  ["Governance", "Prepare contribution, election, and audit workflows for later phases."]
] as const;

export default function AdminPage() {
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
          <Link className="text-sm font-semibold text-primary" href="/dashboard">
            Member dashboard
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
          Admin console preview
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold text-ink">
          Operational queues for verification, trust, and governance.
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
          The admin route is intentionally included in the first foundation so
          privileged workflows can evolve alongside member features instead of
          becoming an afterthought.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {queues.map(([title, body]) => (
            <article className="rounded-lg border border-border bg-white p-6 shadow-soft" key={title}>
              <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
