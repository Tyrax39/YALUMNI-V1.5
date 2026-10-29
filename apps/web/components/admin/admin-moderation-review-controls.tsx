"use client";

import { Save } from "lucide-react";

export type ModerationEscalationStatus = "ESCALATED" | "NONE";
export type ModerationSeverity = "CRITICAL" | "HIGH" | "LOW" | "MEDIUM";

export type ModerationReviewDraft = {
  escalationStatus: ModerationEscalationStatus;
  moderatorNote: string;
  severity: ModerationSeverity;
};

const severityOptions: Array<[ModerationSeverity, string]> = [
  ["LOW", "Low"],
  ["MEDIUM", "Medium"],
  ["HIGH", "High"],
  ["CRITICAL", "Critical"]
];

const escalationOptions: Array<[ModerationEscalationStatus, string]> = [
  ["NONE", "None"],
  ["ESCALATED", "Escalated"]
];

export function ModerationReviewControls({
  busy,
  draft,
  onChange,
  onSave
}: {
  busy: boolean;
  draft: ModerationReviewDraft;
  onChange: (draft: ModerationReviewDraft) => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-4 grid gap-3 rounded-lg border border-border bg-surface p-3">
      <label className="grid gap-2 text-sm font-semibold text-ink">
        Moderator note
        <textarea
          className="min-h-24 rounded-lg border border-border bg-white px-3 py-2 text-sm font-normal leading-6 text-ink outline-none transition focus:border-primary"
          onChange={(event) => onChange({ ...draft, moderatorNote: event.target.value })}
          placeholder="Internal review note"
          value={draft.moderatorNote}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Severity
          <select
            className="h-11 rounded-lg border border-border bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-primary"
            onChange={(event) =>
              onChange({ ...draft, severity: event.target.value as ModerationSeverity })
            }
            value={draft.severity}
          >
            {severityOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Escalation
          <select
            className="h-11 rounded-lg border border-border bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-primary"
            onChange={(event) =>
              onChange({
                ...draft,
                escalationStatus: event.target.value as ModerationEscalationStatus
              })
            }
            value={draft.escalationStatus}
          >
            {escalationOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-lg border border-primary bg-white px-4 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busy}
          onClick={onSave}
          type="button"
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          {busy ? "Saving..." : "Save review"}
        </button>
      </div>
    </div>
  );
}
