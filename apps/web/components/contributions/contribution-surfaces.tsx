"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import {
  CircleDollarSign,
  Download,
  ExternalLink,
  Filter,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCcw,
  Send,
  ShieldCheck
} from "lucide-react";
import {
  MEMBER_ACCESS_ROLES,
  type ContributionCampaign,
  type ContributionFilters,
  type ContributionReceipt,
  type ContributionRecord,
  contributionReceiptDownloadUrl,
  contributionReceiptPdfDownloadUrl,
  fetchContributionCampaign,
  fetchContributionCampaigns,
  fetchContributionReceipt,
  recordContributionPayment
} from "@yalumni/frontend-shared";

import { AppShell } from "@/components/platform/app-shell";

type CampaignListState =
  | { status: "loading" }
  | { campaigns: ContributionCampaign[]; status: "ready"; total: number }
  | { message: string; status: "error" };

type CampaignDetailState =
  | { status: "loading" }
  | { campaign: ContributionCampaign; status: "ready" }
  | { message: string; status: "error" };

type ReceiptState =
  | { status: "loading" }
  | { receipt: ContributionReceipt; status: "ready" }
  | { message: string; status: "error" };

type PaymentForm = {
  amount: string;
  anonymous: boolean;
  note: string;
  payment_method: string;
  payment_reference: string;
};

const INITIAL_PAYMENT_FORM: PaymentForm = {
  amount: "25.00",
  anonymous: false,
  note: "",
  payment_method: "CARD_TEST",
  payment_reference: ""
};

const CAMPAIGN_STATUS_OPTIONS: [string, string][] = [
  ["", "All visible"],
  ["PUBLISHED", "Open"],
  ["CLOSED", "Closed"]
];

const PAYMENT_METHOD_OPTIONS: [string, string][] = [
  ["CARD_TEST", "Card test"],
  ["MOBILE_MONEY", "Mobile money"],
  ["BANK_TRANSFER", "Bank transfer"],
  ["OFFLINE_CASH", "Offline cash"]
];

export function ContributionsHub() {
  const [state, setState] = useState<CampaignListState>({ status: "loading" });
  const [filters, setFilters] = useState({ country: "", q: "", status: "" });
  const [reloadKey, setReloadKey] = useState(0);

  const apiFilters = useMemo<ContributionFilters>(
    () => ({
      country: filters.country.trim() || undefined,
      q: filters.q.trim() || undefined,
      status: filters.status || undefined
    }),
    [filters]
  );

  useEffect(() => {
    let isMounted = true;
    fetchContributionCampaigns(apiFilters)
      .then((response) => {
        if (isMounted) {
          setState({ campaigns: response.campaigns, status: "ready", total: response.total });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Contribution campaigns could not load.",
            status: "error"
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [apiFilters, reloadKey]);

  function updateFilter(patch: Partial<typeof filters>) {
    setState({ status: "loading" });
    setFilters((current) => ({ ...current, ...patch }));
  }

  return (
    <AppShell
      actions={
        <button
          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
          onClick={() => {
            setState({ status: "loading" });
            setReloadKey((current) => current + 1);
          }}
          type="button"
        >
          <RefreshCcw aria-hidden="true" className="h-4 w-4" />
          Refresh
        </button>
      }
      description="Support member-approved campaigns, review progress, and access contribution receipts."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Contributions"
    >
      {() => (
        <div className="grid gap-6">
          <section className="rounded-lg border border-border bg-white p-4 shadow-soft sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                <Filter aria-hidden="true" className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink">Campaign directory</h2>
                <p className="text-sm leading-6 text-muted">
                  Published campaigns and closed records come from the live treasury API.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <TextInput
                label="Search"
                onChange={(value) => updateFilter({ q: value })}
                placeholder="Scholarship, chapter, reserve"
                value={filters.q}
              />
              <TextInput
                label="Country"
                onChange={(value) => updateFilter({ country: value })}
                placeholder="Rwanda"
                value={filters.country}
              />
              <SelectInput
                label="Status"
                onChange={(value) => updateFilter({ status: value })}
                options={CAMPAIGN_STATUS_OPTIONS}
                value={filters.status}
              />
            </div>
          </section>

          {state.status === "loading" ? <PanelMessage label="Loading contribution campaigns." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
          {state.status === "ready" ? (
            <section className="grid gap-4">
              <p className="text-sm font-semibold text-muted">
                {state.total} campaign{state.total === 1 ? "" : "s"} available
              </p>
              {state.campaigns.length ? (
                state.campaigns.map((campaign) => <CampaignCard campaign={campaign} key={campaign.id} />)
              ) : (
                <EmptyPanel label="No contribution campaigns match the current filters." />
              )}
            </section>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

export function ContributionCampaignDetail({ campaignId }: { campaignId: string }) {
  const [state, setState] = useState<CampaignDetailState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;
    fetchContributionCampaign(campaignId)
      .then((campaign) => {
        if (isMounted) {
          setState({ campaign, status: "ready" });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Contribution campaign could not load.",
            status: "error"
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [campaignId]);

  return (
    <AppShell
      description="Review campaign funding progress, eligibility window, and receipt-backed contribution options."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Contribution campaign"
    >
      {() => (
        <>
          {state.status === "loading" ? <PanelMessage label="Loading campaign." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
          {state.status === "ready" ? <CampaignDetailBody campaign={state.campaign} /> : null}
        </>
      )}
    </AppShell>
  );
}

export function ContributionPaySurface({ campaignId }: { campaignId: string }) {
  const [state, setState] = useState<CampaignDetailState>({ status: "loading" });
  const [form, setForm] = useState<PaymentForm>(INITIAL_PAYMENT_FORM);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [contribution, setContribution] = useState<ContributionRecord | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchContributionCampaign(campaignId)
      .then((campaign) => {
        if (isMounted) {
          setState({ campaign, status: "ready" });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Payment screen could not load.",
            status: "error"
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [campaignId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== "ready") {
      return;
    }
    const amountCents = amountToCents(form.amount);
    if (!amountCents || amountCents < 100) {
      setMessage("Enter at least 1.00 before recording a contribution.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const created = await recordContributionPayment(state.campaign.id, {
        amount_cents: amountCents,
        anonymous: form.anonymous,
        currency: state.campaign.currency,
        note: form.note.trim() || null,
        payment_method: form.payment_method,
        payment_reference: form.payment_reference.trim() || null
      });
      setContribution(created);
      setMessage("Contribution recorded and receipt issued.");
      setForm(INITIAL_PAYMENT_FORM);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Contribution could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  function updateField(field: keyof PaymentForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <AppShell
      description="Record a local confirmed contribution and issue a member receipt."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Contribute"
    >
      {() => (
        <>
          {state.status === "loading" ? <PanelMessage label="Loading payment form." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
          {state.status === "ready" ? (
            <form className="grid gap-6 xl:grid-cols-[1fr_360px]" onSubmit={handleSubmit}>
              <section className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
                <Pill label={formatStatus(state.campaign.status)} />
                <h2 className="mt-4 font-display text-3xl font-bold text-ink">{state.campaign.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted">{state.campaign.summary}</p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <TextInput
                    label={`Amount (${state.campaign.currency})`}
                    onChange={(value) => updateField("amount", value)}
                    required
                    type="number"
                    value={form.amount}
                  />
                  <SelectInput
                    label="Payment method"
                    onChange={(value) => updateField("payment_method", value)}
                    options={PAYMENT_METHOD_OPTIONS}
                    value={form.payment_method}
                  />
                  <TextInput
                    label="Reference"
                    onChange={(value) => updateField("payment_reference", value)}
                    placeholder="Transaction or bank reference"
                    value={form.payment_reference}
                  />
                  <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-surface px-3 text-sm font-bold text-ink md:mt-7">
                    <input
                      checked={form.anonymous}
                      className="h-4 w-4 accent-primary"
                      onChange={(event) => updateField("anonymous", event.target.checked)}
                      type="checkbox"
                    />
                    Hide my name in donor summaries
                  </label>
                </div>
                <label className="mt-4 block text-sm font-bold text-ink">
                  Note
                  <textarea
                    className="mt-2 min-h-28 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    onChange={(event) => updateField("note", event.target.value)}
                    placeholder="Optional note for finance records."
                    value={form.note}
                  />
                </label>
              </section>
              <aside className="rounded-lg border border-border bg-white p-5 shadow-soft">
                <h2 className="font-display text-xl font-semibold text-ink">Receipt status</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  This slice records a local confirmed payment and issues a receipt immediately.
                </p>
                <div className="mt-5 grid gap-3">
                  <StatusLine label="Campaign" value={formatStatus(state.campaign.status)} />
                  <StatusLine label="Raised" value={formatMoney(state.campaign.received_amount_cents, state.campaign.currency)} />
                  <StatusLine label="Goal" value={formatMoney(state.campaign.goal_amount_cents, state.campaign.currency)} />
                </div>
                {message ? <NoticePanel message={message} /> : null}
                {contribution?.receipt_id ? (
                  <Link
                    className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink transition hover:border-primary hover:text-primary"
                    href={`/contributions/receipts/${contribution.receipt_id}`}
                  >
                    <ReceiptText aria-hidden="true" className="h-4 w-4" />
                    View receipt
                  </Link>
                ) : null}
                <button
                  className="focus-ring mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={busy || state.campaign.status !== "PUBLISHED"}
                  type="submit"
                >
                  {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Send aria-hidden="true" className="h-4 w-4" />}
                  {busy ? "Recording" : "Record contribution"}
                </button>
              </aside>
            </form>
          ) : null}
        </>
      )}
    </AppShell>
  );
}

export function ContributionReceiptSurface({ receiptId }: { receiptId: string }) {
  const [state, setState] = useState<ReceiptState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;
    fetchContributionReceipt(receiptId)
      .then((receipt) => {
        if (isMounted) {
          setState({ receipt, status: "ready" });
        }
      })
      .catch((caught) => {
        if (isMounted) {
          setState({
            message: caught instanceof Error ? caught.message : "Receipt could not load.",
            status: "error"
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [receiptId]);

  return (
    <AppShell
      description="Review a receipt issued for a recorded YALUMNI contribution."
      requiredRoles={MEMBER_ACCESS_ROLES}
      title="Contribution receipt"
    >
      {() => (
        <>
          {state.status === "loading" ? <PanelMessage label="Loading receipt." /> : null}
          {state.status === "error" ? <ErrorPanel message={state.message} /> : null}
          {state.status === "ready" ? <ReceiptCard receipt={state.receipt} /> : null}
        </>
      )}
    </AppShell>
  );
}

function CampaignCard({ campaign }: { campaign: ContributionCampaign }) {
  const progress = progressPercent(campaign.received_amount_cents, campaign.goal_amount_cents);
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-ink">{campaign.title}</h3>
            <Pill label={formatStatus(campaign.status)} />
            {campaign.country ? <Pill label={campaign.country} /> : null}
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{campaign.summary}</p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-muted">
            <span>{formatMoney(campaign.received_amount_cents, campaign.currency)} raised</span>
            <span>{formatMoney(campaign.goal_amount_cents, campaign.currency)} goal</span>
            <span>{campaign.contribution_count} contribution{campaign.contribution_count === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Link
            className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-bold text-ink"
            href={`/contributions/${campaign.id}`}
          >
            View
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link
            className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-bold text-white"
            href={`/contributions/${campaign.id}/pay`}
          >
            <CircleDollarSign aria-hidden="true" className="h-4 w-4" />
            Contribute
          </Link>
        </div>
      </div>
    </article>
  );
}

function CampaignDetailBody({ campaign }: { campaign: ContributionCampaign }) {
  const progress = progressPercent(campaign.received_amount_cents, campaign.goal_amount_cents);
  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Raised" value={formatMoney(campaign.received_amount_cents, campaign.currency)} />
        <MetricCard label="Goal" value={formatMoney(campaign.goal_amount_cents, campaign.currency)} />
        <MetricCard label="Progress" value={`${progress}%`} />
        <MetricCard label="Receipts" value={String(campaign.contribution_count)} />
      </section>
      <article className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div>
            <div className="flex flex-wrap gap-2">
              <Pill label={formatStatus(campaign.status)} />
              {campaign.chapter_name ? <Pill label={campaign.chapter_name} /> : null}
            </div>
            <h2 className="mt-4 font-display text-3xl font-bold text-ink">{campaign.title}</h2>
            <p className="mt-4 text-lg leading-8 text-ink">{campaign.summary}</p>
            <p className="mt-6 whitespace-pre-line text-base leading-8 text-muted">
              {campaign.description}
            </p>
          </div>
          <aside className="rounded-lg border border-border bg-surface p-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted">Campaign</h3>
            <div className="mt-4 grid gap-3">
              <StatusLine label="Window" value={formatDateRange(campaign.starts_at, campaign.ends_at)} />
              <StatusLine label="Country" value={campaign.country ?? "Platform"} />
              <StatusLine label="Contributor" value={campaign.is_contributor ? "Recorded" : "Not yet"} />
            </div>
            <Link
              className="focus-ring mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white aria-disabled:pointer-events-none aria-disabled:opacity-60"
              href={`/contributions/${campaign.id}/pay`}
              aria-disabled={campaign.status !== "PUBLISHED"}
            >
              <CircleDollarSign aria-hidden="true" className="h-4 w-4" />
              Contribute
            </Link>
          </aside>
        </div>
      </article>
    </div>
  );
}

function ReceiptCard({ receipt }: { receipt: ContributionReceipt }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white">
            <ReceiptText aria-hidden="true" className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold text-ink">{receipt.receipt_number}</h2>
          <p className="mt-3 text-lg leading-8 text-ink">{receipt.campaign_title}</p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <StatusLine label="Issued to" value={receipt.issued_to_name} />
            <StatusLine label="Email" value={receipt.issued_to_email} />
            <StatusLine label="Issued" value={formatDate(receipt.issued_at)} />
            <StatusLine label="Status" value={formatStatus(receipt.status)} />
          </div>
          {receipt.tax_note ? (
            <p className="mt-6 rounded-lg border border-border bg-surface p-4 text-sm leading-6 text-muted">
              {receipt.tax_note}
            </p>
          ) : null}
        </div>
        <aside className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted">Amount</h3>
          <p className="mt-3 font-display text-4xl font-bold text-primary">
            {formatMoney(receipt.amount_cents, receipt.currency)}
          </p>
          <a
            className="focus-ring mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white"
            download
            href={contributionReceiptDownloadUrl(receipt.id)}
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            Download text receipt
          </a>
          <a
            className="focus-ring mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink"
            download
            href={contributionReceiptPdfDownloadUrl(receipt.id)}
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            Download PDF receipt
          </a>
          <button
            className="focus-ring mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink"
            onClick={() => window.print()}
            type="button"
          >
            <Printer aria-hidden="true" className="h-4 w-4" />
            Print receipt
          </button>
          <Link
            className="focus-ring mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-ink"
            href={`/contributions/${receipt.campaign_id}`}
          >
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            Campaign detail
          </Link>
        </aside>
      </div>
    </article>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5 shadow-soft">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-3 font-display text-2xl font-bold text-primary">{value}</p>
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

function SelectInput({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: [string, string][];
  value: string;
}) {
  return (
    <label className="block text-sm font-bold text-ink">
      {label}
      <select
        className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white px-3 py-2">
      <span className="text-sm font-bold text-muted">{label}</span>
      <span className="text-right text-sm font-bold text-ink">{value}</span>
    </div>
  );
}

function PanelMessage({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-5 text-sm font-semibold text-muted shadow-soft">
      {label}
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-[#ffb7a8] bg-[#fff2ed] p-5 text-sm font-semibold text-[#b82716]">
      {message}
    </div>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-white p-5 text-sm font-semibold text-muted">
      {label}
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

function Pill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
      {label}
    </span>
  );
}

function amountToCents(value: string) {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return Math.round(parsed * 100);
}

function progressPercent(received: number, goal: number) {
  if (!goal) {
    return received > 0 ? 100 : 0;
  }
  return Math.min(100, Math.round((received / goal) * 100));
}

function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    currency,
    maximumFractionDigits: 2,
    style: "currency"
  }).format(amountCents / 100);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatDateRange(start?: string | null, end?: string | null) {
  return `${formatDate(start)} to ${formatDate(end)}`;
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}
