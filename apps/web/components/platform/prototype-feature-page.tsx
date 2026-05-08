"use client";

import Link from "next/link";

import { AppShell } from "@/components/platform/app-shell";
import { adminRoles } from "@/lib/api";
import {
  FeatureAction,
  FeatureScreenConfig,
  FeatureScreenKey,
  featureScreens
} from "@/lib/screen-parity";

type PrototypeFeaturePageProps = {
  recordId?: string;
  screenKey: FeatureScreenKey;
};

export function PrototypeFeaturePage({ recordId, screenKey }: PrototypeFeaturePageProps) {
  const screen: FeatureScreenConfig = featureScreens[screenKey];
  const requiredRoles = screen.requiresAdmin ? adminRoles : [];

  return (
    <AppShell
      allowLocalAdminBootstrap={screen.requiresAdmin}
      description={screen.description}
      eyebrow={screen.eyebrow}
      requiredRoles={requiredRoles}
      title={recordId ? `${screen.title}: ${recordId}` : screen.title}
    >
      {() => (
        <div className="grid gap-6">
          <section className="grid gap-4 md:grid-cols-3">
            {screen.metrics.map((metric) => (
              <article className="rounded-lg border border-border bg-white p-5 shadow-soft" key={metric.label}>
                <p className="text-sm font-bold text-muted">{metric.label}</p>
                <p className="mt-3 font-display text-3xl font-bold text-primary">{metric.value}</p>
                {metric.detail ? <p className="mt-2 text-sm leading-6 text-muted">{metric.detail}</p> : null}
              </article>
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-secondary">
                    Source exports
                  </p>
                  <p className="mt-2 text-sm font-semibold text-muted">
                    {screen.sourceExports.join(", ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge label={screen.dataSource} />
                  <StatusBadge label={screen.backendDependencyStatus} />
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {screen.highlights.map((card) => (
                  <article className="rounded-lg border border-border bg-surface p-4" key={card.title}>
                    {card.meta ? (
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">
                        {card.meta}
                      </p>
                    ) : null}
                    <h2 className="mt-2 font-display text-xl font-semibold text-ink">{card.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-muted">{card.body}</p>
                  </article>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {screen.primaryAction ? <ActionButton action={screen.primaryAction} tone="primary" /> : null}
                {screen.secondaryAction ? <ActionButton action={screen.secondaryAction} tone="neutral" /> : null}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
              <h2 className="font-display text-2xl font-semibold text-ink">Workflow</h2>
              <div className="mt-5 grid gap-3">
                {screen.workflow.map((item, index) => (
                  <div className="grid grid-cols-[40px_1fr] items-start gap-3" key={item}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <div className="rounded-lg border border-border bg-surface px-4 py-3">
                      <p className="font-semibold text-ink">{item}</p>
                      <p className="mt-1 text-sm leading-6 text-muted">
                        {index === screen.workflow.length - 1
                          ? "Final state is prepared for the next backend-backed implementation."
                          : "Step preserved from the exported screen workflow."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">Operational view</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Fixture rows keep the route reviewable without pretending backend persistence exists.
                </p>
              </div>
              {screen.emptyState ? <p className="text-sm font-bold text-muted">{screen.emptyState}</p> : null}
            </div>
            <div className="mt-5 overflow-hidden rounded-lg border border-border">
              <div className="hidden bg-surface px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-muted md:grid md:grid-cols-3">
                {screen.table.headers.map((header) => (
                  <span key={header}>{header}</span>
                ))}
              </div>
              <div className="divide-y divide-border">
                {screen.table.rows.map((row) => (
                  <div className="grid gap-2 bg-white px-4 py-4 text-sm md:grid-cols-3" key={row.join(":")}>
                    {row.map((cell, index) => (
                      <div key={`${cell}:${index}`}>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted md:hidden">
                          {screen.table.headers[index]}
                        </p>
                        <p className="mt-1 font-semibold text-ink md:mt-0">{cell}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded-md border border-border bg-surface px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
      {label}
    </span>
  );
}

function ActionButton({ action, tone }: { action: FeatureAction; tone: "neutral" | "primary" }) {
  const className =
    tone === "primary"
      ? "focus-ring inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-bold text-white transition hover:bg-[#003d7d] disabled:cursor-not-allowed disabled:opacity-60"
      : "focus-ring inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-white px-5 text-sm font-bold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60";

  if (action.href && !action.disabled) {
    return (
      <Link className={className} href={action.href}>
        {action.label}
      </Link>
    );
  }

  return (
    <button className={className} disabled={action.disabled ?? true} type="button">
      {action.label}
    </button>
  );
}
