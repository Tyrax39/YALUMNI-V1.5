"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  Download,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCcw,
  ShieldCheck
} from "lucide-react";
import {
  type ContributionCampaign,
  type ContributionRecord,
  type TreasurySummary,
  adminContributionsExportUrl,
  closeContributionCampaign,
  createContributionCampaign,
  fetchAdminContributionCampaigns,
  fetchAdminContributions,
  fetchTreasurySummary,
  publishContributionCampaign,
  refundContribution,
  treasuryAuditPackageUrl,
  treasuryAuditReportUrl,
  treasuryLedgerExportUrl,
  voidContribution
} from "@yalumni/frontend-shared";

type LiveContributionAdminProps = {
  mode: "campaigns" | "treasury";
};

type ContributionAdminState =
  | { status: "loading" }
  | {
      campaigns: ContributionCampaign[];
      contributions: ContributionRecord[];
      status: "ready";
      treasury: TreasurySummary;
    }
  | { message: string; status: "error" };

type CampaignForm = {
  chapter_name: string;
  country: string;
  currency: string;
  description: string;
  ends_at: string;
  goal_amount: string;
  starts_at: string;
  summary: string;
  title: string;
};

const INITIAL_CAMPAIGN_FORM: CampaignForm = {
  chapter_name: "",
  country: "",
  currency: "USD",
  description: "",
  ends_at: "",
  goal_amount: "25000",
  starts_at: "",
  summary: "",
  title: ""
};

export function LiveContributionAdmin({ mode }: LiveContributionAdminProps) {
  const [state, setState] = useState<ContributionAdminState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [form, setForm] = useState<CampaignForm>(INITIAL_CAMPAIGN_FORM);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetchAdminContributionCampaigns({ status: "ALL", limit: 20 }),
      fetchAdminContributions({ limit: 10 }),
      fetchTreasurySummary()
    ])
      .then(([campaigns, contributions, treasury]) => {
        if (!isMounted) {
          return;
        }
        setState({
          campaigns: campaigns.campaigns,
          contributions: contributions.contributions,
          status: "ready",
          treasury
        });
        if (!selectedCampaignId && campaigns.campaigns[0]) {
          setSelectedCampaignId(campaigns.campaigns[0].id);
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Contribution finance data could not load.",
            status: "error"
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [reloadKey, selectedCampaignId]);

  const selectedCampaign = useMemo(() => {
    return state.status === "ready"
      ? state.campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null
      : null;
  }, [selectedCampaignId, state]);

  async function handleCreateCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("create");
    setMessage(null);
    try {
      const campaign = await createContributionCampaign({
        chapter_name: form.chapter_name.trim() || null,
        country: form.country.trim() || null,
        currency: form.currency,
        description: form.description,
        ends_at: optionalIso(form.ends_at),
        goal_amount_cents: amountToCents(form.goal_amount),
        starts_at: optionalIso(form.starts_at),
        summary: form.summary,
        title: form.title
      });
      setSelectedCampaignId(campaign.id);
      setForm(INITIAL_CAMPAIGN_FORM);
      setMessage("Contribution campaign draft created.");
      setReloadKey((current) => current + 1);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Campaign could not be created.");
    } finally {
      setBusy(null);
    }
  }

  async function updateStatus(action: "close" | "publish") {
    if (!selectedCampaignId) {
      return;
    }
    setBusy(action);
    setMessage(null);
    try {
      if (action === "publish") {
        await publishContributionCampaign(selectedCampaignId, "Published from finance console.");
      } else {
        await closeContributionCampaign(selectedCampaignId, "Closed from finance console.");
      }
      setMessage(`Campaign ${action === "publish" ? "published" : "closed"}.`);
      setReloadKey((current) => current + 1);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Campaign status could not update.");
    } finally {
      setBusy(null);
    }
  }

  async function adjustContribution(action: "refund" | "void", contribution: ContributionRecord) {
    setBusy(`${action}:${contribution.id}`);
    setMessage(null);
    try {
      if (action === "refund") {
        await refundContribution(contribution.id, "Refunded from finance console.");
      } else {
        await voidContribution(contribution.id, "Voided from finance console.");
      }
      setMessage(`Contribution ${action === "refund" ? "refunded" : "voided"}.`);
      setReloadKey((current) => current + 1);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Contribution adjustment could not be recorded.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">
              {mode === "treasury" ? "Live treasury summary" : "Live contribution campaigns"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Campaign setup, member contribution receipts, and ledger totals are backed by FastAPI.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-bold text-ink"
              download
              href={
                mode === "treasury"
                  ? treasuryLedgerExportUrl()
                  : adminContributionsExportUrl({
                      campaign_id: selectedCampaignId || undefined
                    })
              }
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              Export CSV
            </a>
            {mode === "treasury" ? (
              <a
                className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-bold text-ink"
                download
                href={treasuryAuditPackageUrl()}
              >
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                Audit package
              </a>
            ) : null}
            {mode === "treasury" ? (
              <a
                className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-bold text-ink"
                download
                href={treasuryAuditReportUrl()}
              >
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                Audit PDF
              </a>
            ) : null}
            <button
              className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-bold text-ink"
              onClick={() => {
                setState({ status: "loading" });
                setReloadKey((current) => current + 1);
              }}
              type="button"
            >
              <RefreshCcw aria-hidden="true" className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {state.status === "loading" ? <PanelMessage label="Loading contribution finance data." /> : null}
        {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
        {message ? <NoticePanel message={message} /> : null}

        {state.status === "ready" ? (
          <div className="mt-5 grid gap-5">
            <section className="grid gap-4 md:grid-cols-4">
              <MetricCard
                label="Received"
                value={formatMoney(state.treasury.received_amount_cents, "USD")}
              />
              <MetricCard
                label="Pending"
                value={formatMoney(state.treasury.pending_amount_cents, "USD")}
              />
              <MetricCard label="Receipts" value={String(state.treasury.receipt_count)} />
              <MetricCard label="Campaigns" value={String(state.treasury.campaign_count)} />
            </section>

            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <select
                className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-bold text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setSelectedCampaignId(event.target.value)}
                value={selectedCampaignId}
              >
                <option value="">Select campaign</option>
                {state.campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title} · {formatStatus(campaign.status)}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                <button
                  className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={
                    !selectedCampaign ||
                    !["CLOSED", "DRAFT"].includes(selectedCampaign.status) ||
                    busy === "publish"
                  }
                  onClick={() => updateStatus("publish")}
                  type="button"
                >
                  {busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Publish
                </button>
                <button
                  className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!selectedCampaign || selectedCampaign.status !== "PUBLISHED" || busy === "close"}
                  onClick={() => updateStatus("close")}
                  type="button"
                >
                  {busy === "close" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptText className="h-4 w-4" />}
                  Close
                </button>
              </div>
            </div>

            {selectedCampaign ? (
              <section className="grid gap-4 md:grid-cols-4">
                <MetricCard label="Status" value={formatStatus(selectedCampaign.status)} />
                <MetricCard
                  label="Raised"
                  value={formatMoney(selectedCampaign.received_amount_cents, selectedCampaign.currency)}
                />
                <MetricCard
                  label="Goal"
                  value={formatMoney(selectedCampaign.goal_amount_cents, selectedCampaign.currency)}
                />
                <MetricCard label="Receipts" value={String(selectedCampaign.contribution_count)} />
              </section>
            ) : (
              <EmptyPanel label="Create or select a campaign to manage finance status." />
            )}
          </div>
        ) : null}
      </section>

      {mode === "campaigns" ? (
        <section className="grid gap-5 2xl:grid-cols-[0.9fr_1.1fr]">
          <CampaignFormCard
            busy={busy === "create"}
            form={form}
            onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
            onSubmit={handleCreateCampaign}
          />
          {state.status === "ready" ? <CampaignTable campaigns={state.campaigns} /> : null}
        </section>
      ) : (
        state.status === "ready" ? (
          <section className="grid gap-5 2xl:grid-cols-[1fr_1fr]">
            <RecentContributions
              busy={busy}
              contributions={state.contributions}
              onAdjust={adjustContribution}
            />
            <LedgerEntries entries={state.treasury.ledger_entries} />
          </section>
        ) : null
      )}
    </div>
  );
}

function CampaignFormCard({
  busy,
  form,
  onChange,
  onSubmit
}: {
  busy: boolean;
  form: CampaignForm;
  onChange: (patch: Partial<CampaignForm>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="rounded-lg border border-border bg-white p-5 shadow-soft" onSubmit={onSubmit}>
      <h3 className="font-display text-xl font-semibold text-ink">Create campaign draft</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <TextInput
          label="Title"
          onChange={(value) => onChange({ title: value })}
          placeholder="Alumni scholarship fund"
          required
          value={form.title}
        />
        <TextInput
          label="Goal amount"
          onChange={(value) => onChange({ goal_amount: value })}
          required
          type="number"
          value={form.goal_amount}
        />
        <TextInput
          label="Currency"
          onChange={(value) => onChange({ currency: value.toUpperCase().slice(0, 3) })}
          required
          value={form.currency}
        />
        <TextInput
          label="Country"
          onChange={(value) => onChange({ country: value })}
          value={form.country}
        />
        <TextInput
          label="Chapter"
          onChange={(value) => onChange({ chapter_name: value })}
          value={form.chapter_name}
        />
        <TextInput
          label="Starts"
          onChange={(value) => onChange({ starts_at: value })}
          type="datetime-local"
          value={form.starts_at}
        />
        <TextInput
          label="Ends"
          onChange={(value) => onChange({ ends_at: value })}
          type="datetime-local"
          value={form.ends_at}
        />
      </div>
      <TextAreaInput
        label="Summary"
        onChange={(value) => onChange({ summary: value })}
        required
        value={form.summary}
      />
      <TextAreaInput
        label="Description"
        onChange={(value) => onChange({ description: value })}
        required
        value={form.description}
      />
      <button
        className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Plus aria-hidden="true" className="h-4 w-4" />}
        Create draft
      </button>
    </form>
  );
}

function CampaignTable({ campaigns }: { campaigns: ContributionCampaign[] }) {
  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <h3 className="font-display text-xl font-semibold text-ink">Campaign records</h3>
      <div className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
        {campaigns.length ? (
          campaigns.map((campaign) => (
            <div className="grid gap-2 bg-white px-4 py-4 text-sm md:grid-cols-4" key={campaign.id}>
              <p className="font-bold text-ink">{campaign.title}</p>
              <p className="font-semibold text-muted">{formatStatus(campaign.status)}</p>
              <p className="font-semibold text-muted">
                {formatMoney(campaign.received_amount_cents, campaign.currency)}
              </p>
              <p className="font-semibold text-muted">{campaign.contribution_count} receipts</p>
            </div>
          ))
        ) : (
          <EmptyPanel label="No campaigns created yet." />
        )}
      </div>
    </section>
  );
}

function RecentContributions({
  busy,
  contributions,
  onAdjust
}: {
  busy: string | null;
  contributions: ContributionRecord[];
  onAdjust: (action: "refund" | "void", contribution: ContributionRecord) => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <h3 className="font-display text-xl font-semibold text-ink">Recent contributions</h3>
      <div className="mt-4 grid gap-3">
        {contributions.length ? (
          contributions.map((contribution) => (
            <div className="rounded-lg border border-border bg-surface p-4" key={contribution.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink">{contribution.campaign_title}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                    {contribution.receipt_number ?? "Receipt pending"} · {formatStatus(contribution.status)}
                  </p>
                </div>
                <p className="font-display text-xl font-bold text-primary">
                  {formatMoney(contribution.amount_cents, contribution.currency)}
                </p>
              </div>
              {contribution.status === "RECEIVED" || contribution.status === "PENDING" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {contribution.status === "RECEIVED" ? (
                    <button
                      className="focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-bold text-ink disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={busy === `refund:${contribution.id}`}
                      onClick={() => onAdjust("refund", contribution)}
                      type="button"
                    >
                      {busy === `refund:${contribution.id}` ? (
                        <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCcw aria-hidden="true" className="h-3.5 w-3.5" />
                      )}
                      Refund
                    </button>
                  ) : null}
                  {contribution.status === "PENDING" ? (
                    <button
                      className="focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-bold text-ink disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={busy === `void:${contribution.id}`}
                      onClick={() => onAdjust("void", contribution)}
                      type="button"
                    >
                      {busy === `void:${contribution.id}` ? (
                        <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ReceiptText aria-hidden="true" className="h-3.5 w-3.5" />
                      )}
                      Void
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <EmptyPanel label="No contribution records yet." />
        )}
      </div>
    </section>
  );
}

function LedgerEntries({ entries }: { entries: TreasurySummary["ledger_entries"] }) {
  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <h3 className="font-display text-xl font-semibold text-ink">Ledger entries</h3>
      <div className="mt-4 grid gap-3">
        {entries.length ? (
          entries.map((entry) => (
            <div className="rounded-lg border border-border bg-surface p-4" key={entry.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink">{formatStatus(entry.entry_type)}</p>
                  <p className="mt-1 text-xs font-semibold text-muted">{entry.memo}</p>
                </div>
                <p className="font-display text-xl font-bold text-primary">
                  {formatMoney(entry.amount_cents, entry.currency)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <EmptyPanel label="No ledger entries yet." />
        )}
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-white p-4">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-primary">{value}</p>
    </article>
  );
}

function TextInput({
  label,
  onChange,
  placeholder,
  required = false,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="block text-sm font-bold text-ink">
      {label}
      <input
        className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        step={type === "number" ? "0.01" : undefined}
        type={type}
        value={value}
      />
    </label>
  );
}

function TextAreaInput({
  label,
  onChange,
  required = false,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="mt-4 block text-sm font-bold text-ink">
      {label}
      <textarea
        className="mt-2 min-h-24 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      />
    </label>
  );
}

function PanelMessage({ label }: { label: string }) {
  return (
    <div className="mt-4 rounded-lg border border-border bg-surface p-4 text-sm font-semibold text-muted">
      {label}
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-lg border border-[#ffb7a8] bg-[#fff2ed] p-4 text-sm font-semibold text-[#b82716]">
      {message}
    </div>
  );
}

function NoticePanel({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-ink">
      {message}
    </div>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface p-3 text-sm font-semibold text-muted">
      {label}
    </div>
  );
}

function amountToCents(value: string) {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return Math.round(parsed * 100);
}

function optionalIso(value: string) {
  if (!value.trim()) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    currency,
    maximumFractionDigits: 2,
    style: "currency"
  }).format(amountCents / 100);
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}
