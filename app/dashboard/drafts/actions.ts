"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAction } from "@/lib/supabase-server";

async function currentOrgAndUser() {
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

/**
 * Persists one section's content to the live draft and snapshots the full
 * draft into draft_versions (proposal §6.3 — "every save creates a snapshot").
 */
export async function saveDraftSection(opportunityId: string, section: string, content: string) {
  const { supabase, organizationId, userId } = await currentOrgAndUser();

  const { data: existingDraft } = await supabase
    .from("drafts")
    .select("id, sections")
    .eq("organization_id", organizationId)
    .eq("opportunity_id", opportunityId)
    .maybeSingle();

  const nextSections = { ...(existingDraft?.sections ?? {}), [section]: content };
  let draftId: string | undefined = existingDraft?.id;

  if (draftId) {
    await supabase
      .from("drafts")
      .update({ sections: nextSections, updated_at: new Date().toISOString() })
      .eq("id", draftId);
  } else {
    const { data: opportunity } = await supabase
      .from("opportunities")
      .select("title")
      .eq("id", opportunityId)
      .single();

    const { data: created } = await supabase
      .from("drafts")
      .insert({
        organization_id: organizationId,
        opportunity_id: opportunityId,
        created_by: userId,
        title: opportunity?.title ?? "Untitled proposal",
        sections: nextSections,
      })
      .select("id")
      .single();

    draftId = created?.id;
  }

  if (!draftId) throw new Error("Failed to save draft");

  const { data: lastVersion } = await supabase
    .from("draft_versions")
    .select("version_number")
    .eq("draft_id", draftId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("draft_versions").insert({
    draft_id: draftId,
    version_number: (lastVersion?.version_number ?? 0) + 1,
    sections: nextSections,
    created_by: userId,
  });

  revalidatePath(`/dashboard/drafts/${opportunityId}`);
}
