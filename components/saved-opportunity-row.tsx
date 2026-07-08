"use client";

import { useState } from "react";
import { updateSavedOpportunityNotes, updateSavedOpportunityStatus } from "@/app/dashboard/actions";

const STATUSES = ["reviewing", "drafting", "submitted", "won", "lost"] as const;

const STATUS_STYLES: Record<(typeof STATUSES)[number], string> = {
  reviewing: "bg-slate-100 text-slate-700 ring-slate-500/20",
  drafting: "bg-sky-50 text-sky-700 ring-sky-600/20",
  submitted: "bg-amber-50 text-amber-700 ring-amber-600/20",
  won: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  lost: "bg-red-50 text-red-700 ring-red-600/20",
};

type Props = {
  savedOpportunityId: string;
  title: string;
  status: string;
  notes: string | null;
};

export function SavedOpportunityRow({ savedOpportunityId, title, status: initialStatus, notes }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [draftNotes, setDraftNotes] = useState(notes ?? "");

  const statusStyle =
    STATUS_STYLES[status as (typeof STATUSES)[number]] ?? STATUS_STYLES.reviewing;

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <p className="font-semibold text-slate-900">{title}</p>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            void updateSavedOpportunityStatus(savedOpportunityId, e.target.value);
          }}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-sky-600 ${statusStyle}`}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={draftNotes}
        onChange={(e) => setDraftNotes(e.target.value)}
        onBlur={() => void updateSavedOpportunityNotes(savedOpportunityId, draftNotes)}
        placeholder="Add a note…"
        rows={2}
        className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600"
      />
    </li>
  );
}
