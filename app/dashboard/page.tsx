import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { OpportunityCard } from "@/components/opportunity-card";
import { SavedOpportunityRow } from "@/components/saved-opportunity-row";

type SortKey = "score" | "deadline" | "value";

type Opportunity = {
  id: string;
  title: string;
  agency: string | null;
  naics_code: string | null;
  set_aside_type: string | null;
  response_deadline: string | null;
  estimated_value: number | null;
  sam_notice_id: string;
};

type MatchRow = { id: string; match_score: number; opportunities: Opportunity | null };
type SavedRow = { id: string; status: string; notes: string | null; opportunities: Opportunity | null };

const SORT_TABS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Match score" },
  { key: "deadline", label: "Deadline" },
  { key: "value", label: "Value" },
];

function deadlineUrgencyStyles(deadline: string) {
  const daysLeft = (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysLeft <= 3) return "bg-red-50 text-red-700 ring-red-600/20";
  if (daysLeft <= 14) return "bg-amber-50 text-amber-700 ring-amber-600/20";
  return "bg-slate-100 text-slate-600 ring-slate-500/20";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { sort?: string };
}) {
  const supabase = supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", session.user.id)
    .single();

  if (!profile?.organization_id) {
    return <p className="p-6">No organization found for this account.</p>;
  }

  const sort: SortKey = (searchParams.sort as SortKey) ?? "score";

  const { data: matchesRaw } = await supabase
    .from("opportunity_matches")
    .select("id, match_score, opportunities(*)")
    .eq("organization_id", profile.organization_id);
  const matches = (matchesRaw ?? []) as unknown as MatchRow[];

  const { data: savedRaw } = await supabase
    .from("saved_opportunities")
    .select("id, status, notes, opportunities(*)")
    .eq("organization_id", profile.organization_id)
    .order("updated_at", { ascending: false });
  const saved = (savedRaw ?? []) as unknown as SavedRow[];

  const savedOpportunityIds = new Set(saved.map((s) => s.opportunities?.id));

  const sortedMatches = [...matches].sort((a, b) => {
    if (sort === "deadline") {
      const ad = a.opportunities?.response_deadline ?? "9999";
      const bd = b.opportunities?.response_deadline ?? "9999";
      return ad.localeCompare(bd);
    }
    if (sort === "value") {
      return (b.opportunities?.estimated_value ?? 0) - (a.opportunities?.estimated_value ?? 0);
    }
    return b.match_score - a.match_score;
  });

  const upcomingDeadlines = [...matches, ...saved]
    .map((m) => m.opportunities)
    .filter((o): o is NonNullable<typeof o> => Boolean(o?.response_deadline))
    .filter((o, i, arr) => arr.findIndex((x) => x.id === o.id) === i)
    .sort((a, b) => (a.response_deadline ?? "").localeCompare(b.response_deadline ?? ""))
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
              G
            </div>
            <span className="text-lg font-bold text-slate-900">GovContract AI</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/onboarding" className="font-medium text-slate-600 hover:text-slate-900">
              Company profile & preferences
            </Link>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{session.user.email}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Upcoming deadlines</h2>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-slate-500">No deadlines tracked yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100">
              {upcomingDeadlines.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                  <span className="truncate text-sm font-medium text-slate-700">{o.title}</span>
                  {o.response_deadline && (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ring-1 ring-inset ${deadlineUrgencyStyles(o.response_deadline)}`}
                    >
                      {new Date(o.response_deadline).toLocaleDateString()}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Opportunity feed</h2>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-sm">
              {SORT_TABS.map((tab) => (
                <Link
                  key={tab.key}
                  href={`?sort=${tab.key}`}
                  className={`rounded-md px-3 py-1 font-medium transition-colors ${
                    sort === tab.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>
          {sortedMatches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-sm text-slate-500">
                No matches yet — matches appear after the daily SAM.gov poll runs against your saved
                preferences.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {sortedMatches.map(
                (m) =>
                  m.opportunities && (
                    <OpportunityCard
                      key={m.id}
                      opportunity={m.opportunities}
                      matchScore={m.match_score}
                      isSaved={savedOpportunityIds.has(m.opportunities.id)}
                    />
                  )
              )}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-base font-semibold text-slate-900">Saved opportunities</h2>
          {saved.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {saved.map(
                (s) =>
                  s.opportunities && (
                    <SavedOpportunityRow
                      key={s.id}
                      savedOpportunityId={s.id}
                      title={s.opportunities.title}
                      status={s.status}
                      notes={s.notes}
                    />
                  )
              )}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-sm text-slate-500">Nothing saved yet.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
