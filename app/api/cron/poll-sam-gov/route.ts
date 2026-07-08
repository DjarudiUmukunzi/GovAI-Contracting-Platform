import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { searchOpportunities } from "@/lib/sam-gov";
import { scoreOpportunity } from "@/lib/match-engine";
import { sendOpportunityAlertEmail } from "@/lib/resend-email";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${date.getFullYear()}`;
}

/**
 * Daily SAM.gov poll + weighted match engine + Resend alerts (proposal §5.2).
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when
 * that env var is set — see vercel.json for the schedule.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseAdmin();

  const { data: preferences, error: preferencesError } = await supabase
    .from("opportunity_preferences")
    .select("*");

  if (preferencesError) {
    return NextResponse.json({ error: preferencesError.message }, { status: 500 });
  }

  const naicsCodes = Array.from(new Set(preferences?.flatMap((p) => p.naics_codes) ?? []));

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const postedFrom = formatDate(yesterday);
  const postedTo = formatDate(today);

  let upsertedCount = 0;
  let notifiedCount = 0;

  for (const naicsCode of naicsCodes) {
    const results = await searchOpportunities({ naicsCode, postedFrom, postedTo });

    for (const raw of results) {
      const { data: opportunity, error: upsertError } = await supabase
        .from("opportunities")
        .upsert(
          {
            sam_notice_id: raw.noticeId,
            title: raw.title,
            agency: raw.fullParentPathName ?? null,
            naics_code: raw.naicsCode ?? null,
            set_aside_type: raw.typeOfSetAsideDescription ?? null,
            contract_type: raw.type ?? null,
            place_of_performance_state: raw.placeOfPerformance?.state?.code ?? null,
            place_of_performance_zip: raw.placeOfPerformance?.zip ?? null,
            estimated_value: raw.award?.amount ? Number(raw.award.amount) : null,
            posted_date: raw.postedDate || null,
            response_deadline: raw.responseDeadLine || null,
            solicitation_text: raw.description ?? null,
            raw_response: raw,
          },
          { onConflict: "sam_notice_id" }
        )
        .select()
        .single();

      if (upsertError || !opportunity) continue;
      upsertedCount += 1;

      const matchingPreferences = preferences?.filter((p) => p.naics_codes.includes(naicsCode)) ?? [];

      for (const pref of matchingPreferences) {
        const scores = scoreOpportunity(opportunity, pref);
        if (scores.matchScore < pref.match_threshold) continue;

        const { data: match, error: matchError } = await supabase
          .from("opportunity_matches")
          .upsert(
            {
              organization_id: pref.organization_id,
              opportunity_id: opportunity.id,
              match_score: scores.matchScore,
              naics_match_score: scores.naicsMatchScore,
              location_match_score: scores.locationMatchScore,
              bid_range_match_score: scores.bidRangeMatchScore,
              set_aside_match_score: scores.setAsideMatchScore,
            },
            { onConflict: "organization_id,opportunity_id" }
          )
          .select()
          .single();

        if (matchError || !match || match.notified_at) continue;

        const { data: recipients } = await supabase
          .from("profiles")
          .select("email")
          .eq("organization_id", pref.organization_id);

        for (const recipient of recipients ?? []) {
          if (!recipient.email) continue;
          await sendOpportunityAlertEmail({
            to: recipient.email,
            matchScore: scores.matchScore,
            opportunity: {
              title: opportunity.title,
              agency: opportunity.agency,
              responseDeadline: opportunity.response_deadline,
              samNoticeId: opportunity.sam_notice_id,
            },
          });
          notifiedCount += 1;
        }

        await supabase
          .from("opportunity_matches")
          .update({ notified_at: new Date().toISOString() })
          .eq("id", match.id);
      }
    }
  }

  return NextResponse.json({ upsertedCount, notifiedCount });
}
