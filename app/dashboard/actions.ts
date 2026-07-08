"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAction } from "@/lib/supabase-server";

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
  return { supabase, organizationId: profile.organization_id as string, userId: session.user.id };
}

export async function saveOpportunity(opportunityId: string) {
  const { supabase, organizationId, userId } = await currentOrganizationId();

  await supabase.from("saved_opportunities").upsert(
    {
      organization_id: organizationId,
      opportunity_id: opportunityId,
      saved_by: userId,
      status: "reviewing",
    },
    { onConflict: "organization_id,opportunity_id" }
  );

  revalidatePath("/dashboard");
}

export async function updateSavedOpportunityStatus(savedOpportunityId: string, status: string) {
  const { supabase } = await currentOrganizationId();

  await supabase
    .from("saved_opportunities")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", savedOpportunityId);

  revalidatePath("/dashboard");
}

export async function updateSavedOpportunityNotes(savedOpportunityId: string, notes: string) {
  const { supabase } = await currentOrganizationId();

  await supabase
    .from("saved_opportunities")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", savedOpportunityId);

  revalidatePath("/dashboard");
}
