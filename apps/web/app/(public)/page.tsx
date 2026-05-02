import Image from "next/image";
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Globe2,
  HandCoins,
  LockKeyhole,
  MessageSquare,
  Network,
  ShieldCheck,
  UsersRound,
  Vote
} from "lucide-react";

import { PublicHeader } from "@/components/layout/public-header";
import { ButtonLink } from "@/components/ui/button-link";
import { capabilityCards, platformStats } from "@/lib/site";

const heroImage =
  "/brand/landing-hero.png";

const alumniImages = ["/brand/landing-event.png", "/brand/landing-story.png"];

const storyImages = [
  "/brand/landing-alumni.png",
  "/brand/landing-gathering.png",
  "/brand/landing-story.png"
];

const iconMap = [BadgeCheck, Network, BookOpen, Vote];

const audience = [
  {
    icon: BadgeCheck,
    title: "Mandela Washington Fellows",
    body: "Flagship fellowship alumni can find collaborators, mentors, convenings, and chapter opportunities across cohorts."
  },
  {
    icon: Globe2,
    title: "Regional Leadership Center alumni",
    body: "RLC alumni can connect through country chapters, center networks, sector groups, events, and local initiatives."
  }
];

const trustItems = [
  "Verification reviews and decision history",
  "Profile privacy controls for contact fields",
  "Role-based admin and chapter permissions",
  "Audit trails for governance workflows"
];

const stories = [
  {
    area: "Sustainability",
    title: "Scaling green energy solutions in rural Malawi",
    quote:
      "The network connected our team with mentors and chapter partners who helped us scale from a pilot to a national program.",
    author: "Kofi Mensah",
    program: "RLC West Africa"
  },
  {
    area: "Policy reform",
    title: "Championing women's rights in East Africa",
    quote:
      "A cross-country working group became possible because we could find verified peers with the right legal and civic skills.",
    author: "Fatima Zahra",
    program: "Mandela Fellow"
  },
  {
    area: "Tech innovation",
    title: "Revolutionizing agri-tech logistics with AI",
    quote:
      "Our startup found its co-founder through alumni discovery and built a partner pipeline across three chapters.",
    author: "David Okoro",
    program: "RLC South Africa"
  }
];

const actionCards = [
  {
    icon: UsersRound,
    title: "Find your people",
    body: "Search alumni by country, cohort, program, sector, skills, and availability."
  },
  {
    icon: CalendarDays,
    title: "Organize gatherings",
    body: "Create events, manage RSVPs, publish agendas, and report attendance."
  },
  {
    icon: MessageSquare,
    title: "Start collaboration",
    body: "Message verified alumni, build teams, and keep chapter conversations moving."
  },
  {
    icon: HandCoins,
    title: "Fund common goals",
    body: "Prepare transparent contribution campaigns with receipts and ledger controls."
  }
];

const faqs = [
  {
    question: "Who is eligible to join?",
    answer:
      "The platform is designed for YALI Regional Leadership Center alumni, Mandela Washington Fellows, and authorized partners or administrators."
  },
  {
    question: "How does verification work?",
    answer:
      "Members submit affiliation details and supporting evidence. Authorized verifiers can approve, reject, or request more information."
  },
  {
    question: "Can members control privacy?",
    answer:
      "Yes. Directory and profile responses are planned around explicit visibility settings for email, phone, location, social links, and contact actions."
  }
];

export default function LandingPage() {
  return (
    <main className="bg-surface text-ink">
      <PublicHeader />

      <section className="relative min-h-screen overflow-hidden bg-primary pt-16 text-white">
        <Image
          alt="Professional African alumni leaders gathered in a modern workspace"
          className="absolute inset-0 h-full w-full object-cover"
          fill
          priority
          sizes="100vw"
          src={heroImage}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,43,91,0.95)_0%,rgba(0,74,153,0.86)_42%,rgba(0,74,153,0.28)_100%)]" />
        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] min-w-0 w-full max-w-7xl items-center px-5 py-16 sm:px-8 lg:py-20">
          <div className="min-w-0 w-full max-w-3xl">
            <h1 className="max-w-full break-words font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-7xl">
              Empowering the next generation of{" "}
              <span className="block">Pan-African leaders</span>
            </h1>
            <p className="mt-6 max-w-2xl break-words text-base leading-8 text-blue-50 sm:text-xl">
              A dedicated platform for YALI alumni to connect, organize
              communities, launch initiatives, host gatherings, run credible
              elections, and mobilize transparent contributions.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <ButtonLink href="/register">Join the network</ButtonLink>
              <ButtonLink href="/login" variant="secondary">
                Sign in
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section
        className="mx-auto grid max-w-7xl gap-5 px-5 py-12 sm:px-8 lg:grid-cols-4"
        id="directory"
      >
        {capabilityCards.map((card, index) => {
          const Icon = iconMap[index];

          return (
            <article className="rounded-lg border border-border bg-white p-6 shadow-sm" key={card.title}>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-primary">
                <Icon aria-hidden="true" size={22} />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold text-ink">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{card.body}</p>
            </article>
          );
        })}
      </section>

      <section className="bg-white py-20" id="chapters">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-display text-3xl font-bold text-primary sm:text-4xl">
              A professional ecosystem for alumni impact
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted">
              The platform is built around trust, practical coordination, and
              visible outcomes: verified profiles, chapter spaces, initiatives,
              resources, events, contributions, and governance tools.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {actionCards.map((item) => (
                <div className="rounded-lg border border-border bg-surface p-5" key={item.title}>
                  <item.icon aria-hidden="true" className="text-secondary" size={24} />
                  <h3 className="mt-4 font-display text-lg font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <Image
                alt="Alumni collaborating around a tablet"
                className="h-72 w-full rounded-lg object-cover shadow-soft"
                height={720}
                sizes="(min-width: 1024px) 320px, 50vw"
                src={alumniImages[0]}
                width={520}
              />
              <div className="rounded-lg bg-primary p-6 text-white">
                <p className="text-sm text-blue-100">Chapter momentum</p>
                <p className="mt-2 font-display text-3xl font-bold">49 countries</p>
              </div>
            </div>
            <div className="space-y-4 pt-10">
              <div className="rounded-lg bg-secondary p-6 text-white">
                <p className="text-sm text-emerald-50">Impact pipeline</p>
                <p className="mt-2 font-display text-3xl font-bold">500+ initiatives</p>
              </div>
              <Image
                alt="Alumni leader presenting in a professional room"
                className="h-72 w-full rounded-lg object-cover shadow-soft"
                height={720}
                sizes="(min-width: 1024px) 320px, 50vw"
                src={alumniImages[1]}
                width={520}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-primary py-16 text-white" id="opportunities">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 text-center sm:px-8 md:grid-cols-4">
          {platformStats.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-4xl font-bold sm:text-5xl">{stat.value}</p>
              <p className="mt-2 text-sm font-semibold text-blue-100">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-20" id="trust">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-lg bg-primary p-8 text-white shadow-soft sm:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/15">
              <ShieldCheck aria-hidden="true" size={25} />
            </div>
            <h2 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
              Secure, private, and governance-ready
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-50">
              Verification, role scopes, privacy controls, audit logs, voter
              roll protections, and append-only contribution ledgers give the
              network the operational backbone it needs.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {trustItems.map((item) => (
                <div className="flex items-center gap-3" key={item}>
                  <CheckCircle2 aria-hidden="true" className="text-emerald-200" size={20} />
                  <span className="text-sm font-semibold text-white">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="flex items-center justify-between border-b border-border pb-5">
              <div>
                <p className="text-sm font-semibold text-muted">Identity status</p>
                <p className="mt-1 font-display text-2xl font-bold text-primary">Authenticated</p>
              </div>
              <LockKeyhole aria-hidden="true" className="text-secondary" size={34} />
            </div>
            <div className="mt-6 space-y-4">
              {["Program affiliation", "Chapter membership", "Profile visibility", "Admin review"].map(
                (item) => (
                  <div className="flex items-center justify-between rounded-lg bg-white p-4" key={item}>
                    <span className="text-sm font-semibold text-ink">{item}</span>
                    <BadgeCheck aria-hidden="true" className="text-primary" size={20} />
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="max-w-3xl">
          <h2 className="font-display text-3xl font-bold text-primary sm:text-4xl">
            Voices of influence
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted">
            Impact becomes visible through people, projects, regions, and
            outcomes alumni can actually recognize.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {stories.map((story, index) => (
            <article className="overflow-hidden rounded-lg border border-border bg-white shadow-sm" key={story.title}>
              <Image
                alt={story.title}
                className="h-56 w-full object-cover"
                height={440}
                sizes="(min-width: 768px) 33vw, 100vw"
                src={storyImages[index]}
                width={680}
              />
              <div className="p-6">
                <p className="text-sm font-semibold text-secondary">{story.area}</p>
                <h3 className="mt-3 font-display text-xl font-semibold text-ink">{story.title}</h3>
                <p className="mt-4 text-sm leading-6 text-muted">{story.quote}</p>
                <p className="mt-6 text-sm font-bold text-primary">{story.author}</p>
                <p className="text-xs font-semibold text-muted">{story.program}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.8fr_1fr]">
          <div>
            <h2 className="font-display text-3xl font-bold text-primary sm:text-4xl">
              Designed for verified alumni communities
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted">
              Members move from identity to connection, from connection to
              community, and from community to measurable action.
            </p>
          </div>
          <div className="grid gap-4">
            {audience.map((item) => (
              <article className="rounded-lg border border-border bg-white p-6" key={item.title}>
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-primary">
                    <item.icon aria-hidden="true" size={22} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-20 sm:px-8">
        <h2 className="text-center font-display text-3xl font-bold text-primary sm:text-4xl">
          Frequently asked questions
        </h2>
        <div className="mt-10 space-y-4">
          {faqs.map((faq) => (
            <details className="group rounded-lg border border-border bg-white p-6" key={faq.question}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold text-ink">
                {faq.question}
                <ChevronDown
                  aria-hidden="true"
                  className="shrink-0 text-muted transition group-open:rotate-180"
                  size={20}
                />
              </summary>
              <p className="mt-4 text-sm leading-6 text-muted">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-white px-5 py-20 text-center sm:px-8">
        <h2 className="font-display text-3xl font-bold text-ink sm:text-5xl">Ready to lead?</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted">
          Step into a trusted digital home for alumni coordination, leadership,
          governance, and impact across chapters and cohorts.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <ButtonLink href="/register">Join the global network</ButtonLink>
          <ButtonLink href="/login" variant="secondary">
            Contact support
          </ButtonLink>
        </div>
      </section>

      <footer className="border-t border-border bg-slate-50 px-5 py-12 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
          <div>
            <Image
              alt="YALUMNI"
              className="block h-auto w-[156px] object-contain"
              height={34}
              src="/brand/yalumni-logo-horizontal.svg"
              width={156}
            />
            <p className="mt-4 text-sm leading-6 text-muted">
              Connecting verified alumni to build communities, initiatives,
              events, governance, and measurable impact.
            </p>
          </div>
          {[
            ["Network", "Directory", "Chapter map", "Impact reports"],
            ["Support", "Program FAQ", "Contact support", "Verification help"],
            ["Legal", "Privacy policy", "Terms of service", "Brand permissions"]
          ].map(([title, ...links]) => (
            <div key={title}>
              <h3 className="text-sm font-bold text-ink">{title}</h3>
              <ul className="mt-4 space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a className="text-sm text-muted transition hover:text-primary" href="#">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </footer>
    </main>
  );
}
