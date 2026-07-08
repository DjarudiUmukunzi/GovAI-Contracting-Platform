"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAction } from "@/lib/supabase-server";

type CompanyProfileInput = {
  legal_name: string;
  cage_code: string | null;
  uei: string | null;
  sam_registration_status: string | null;
  primary_naics_codes: string[];
  past_performance_summary: string | null;
};

type OpportunityPreferencesInput = {
  naics_codes: string[];
  psc_codes: string[];
  place_of_performance_state: string | null;
  place_of_performance_zip: string | null;
  place_of_performance_radius_miles: number | null;
  bid_value_min: number | null;
  bid_value_max: number | null;
  contract_types: string[];
  set_aside_types: string[];
  match_threshold: number;
  notification_frequency: string;
  notification_channel: string;
};

async function currentOrganizationId() {
  const supabase = supabaseServerAction();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", session.user.id)
    .single();

  if (!profile?.organization_id) throw new Error("No organization for this account");
  return { supabase, organizationId: profile.organization_id as string };
}

/**
 * Saves both halves of onboarding (proposal §6.1) in one action: the
 * company profile (organizations table) and the SAM.gov match filters
 * (opportunity_preferences table).
 */
export async function saveOnboarding(
  profile: CompanyProfileInput,
  preferences: OpportunityPreferencesInput
) {
  const { supabase, organizationId } = await currentOrganizationId();

  const { error: orgError } = await supabase
    .from("organizations")
    .update(profile)
    .eq("id", organizationId);
  if (orgError) throw new Error(orgError.message);

  const { data: existingPref } = await supabase
    .from("opportunity_preferences")
    .select("id")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (existingPref) {
    const { error } = await supabase
      .from("opportunity_preferences")
      .update({ ...preferences, updated_at: new Date().toISOString() })
      .eq("id", existingPref.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("opportunity_preferences")
      .insert({ ...preferences, organization_id: organizationId });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
}
