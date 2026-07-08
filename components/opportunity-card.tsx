"use client";

import Link from "next/link";
import { saveOpportunity } from "@/app/dashboard/actions";

type Props = {
  opportunity: {
    id: string;
    title: string;
    agency: string | null;
    naics_code: string | null;
    set_aside_type: string | null;
    response_deadline: string | null;
    estimated_value: number | null;
    sam_notice_id: string;
  };
  matchScore?: number;
  isSaved: boolean;
};

function matchScoreStyles(score: number) {
  if (score >= 85) return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20";
  if (score >= 70) return "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20";
  return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20";
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M8 4H4v12h12v-4M12 4h4v4M16 4l-7 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M5 3.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1V17l-5-3-5 3V3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M4 10h12M11 5l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OpportunityCard({ opportunity, matchScore, isSaved }: Props) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{opportunity.title}</p>
          <p className="mt-0.5 truncate text-sm text-slate-500">{opportunity.agency ?? "Unknown agency"}</p>
        </div>
        {matchScore != null && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${matchScoreStyles(matchScore)}`}
          >
            {matchScore}% match
          </span>
        )}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">NAICS</dt>
          <dd className="mt-0.5 text-slate-700">{opportunity.naics_code ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Set-aside</dt>
          <dd className="mt-0.5 text-slate-700">{opportunity.set_aside_type ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Deadline</dt>
          <dd className="mt-0.5 tabular-nums text-slate-700">
            {opportunity.response_deadline
              ? new Date(opportunity.response_deadline).toLocaleDateString()
              : "TBD"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Est. value</dt>
          <dd className="mt-0.5 tabular-nums text-slate-700">
            {opportunity.estimated_value
              ? `$${opportunity.estimated_value.toLocaleString()}`
              : "—"}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <a
          href={`https://sam.gov/opp/${opportunity.sam_notice_id}/view`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <ExternalLinkIcon />
          View solicitation
        </a>
        {!isSaved && (
          <button
            onClick={() => void saveOpportunity(opportunity.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <BookmarkIcon />
            Save
          </button>
        )}
        <Link
          href={`/dashboard/drafts/${opportunity.id}`}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-sky-800"
        >
          Start proposal
          <ArrowRightIcon />
        </Link>
      </div>
    </li>
  );
}
