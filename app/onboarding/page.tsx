import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
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
  if (!profile?.organization_id) redirect("/");

  const { data: organization } = await supabase
    .from("organizations")
    .select("legal_name, cage_code, uei, sam_registration_status, primary_naics_codes, past_performance_summary")
    .eq("id", profile.organization_id)
    .single();

  const { data: preferences } = await supabase
    .from("opportunity_preferences")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .maybeSingle();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Company profile & preferences</h1>
      <OnboardingForm
        initialProfile={{
          legal_name: organization?.legal_name ?? "",
          cage_code: organization?.cage_code ?? null,
          uei: organization?.uei ?? null,
          sam_registration_status: organization?.sam_registration_status ?? null,
          primary_naics_codes: organization?.primary_naics_codes ?? [],
          past_performance_summary: organization?.past_performance_summary ?? null,
        }}
        initialPreferences={{
          naics_codes: preferences?.naics_codes ?? [],
          psc_codes: preferences?.psc_codes ?? [],
          place_of_performance_state: preferences?.place_of_performance_state ?? null,
          place_of_performance_zip: preferences?.place_of_performance_zip ?? null,
          place_of_performance_radius_miles: preferences?.place_of_performance_radius_miles ?? null,
          bid_value_min: preferences?.bid_value_min ?? null,
          bid_value_max: preferences?.bid_value_max ?? null,
          contract_types: preferences?.contract_types ?? [],
          set_aside_types: preferences?.set_aside_types ?? [],
          match_threshold: preferences?.match_threshold ?? 70,
          notification_frequency: preferences?.notification_frequency ?? "instant",
          notification_channel: preferences?.notification_channel ?? "email",
        }}
      />
    </main>
  );
}
