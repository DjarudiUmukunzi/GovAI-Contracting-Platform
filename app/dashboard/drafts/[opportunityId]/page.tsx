import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { DraftingWorkspace } from "@/components/drafting-workspace";

export default async function DraftPage({ params }: { params: { opportunityId: string } }) {
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

  const { data: opportunity } = await supabase
    .from("opportunities")
    .select("id, title, agency, solicitation_text")
    .eq("id", params.opportunityId)
    .single();
  if (!opportunity) notFound();

  const { data: draft } = await supabase
    .from("drafts")
    .select("sections")
    .eq("organization_id", profile.organization_id)
    .eq("opportunity_id", params.opportunityId)
    .maybeSingle();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">{opportunity.title}</h1>
        <p className="text-sm text-gray-500">{opportunity.agency ?? "Unknown agency"}</p>
      </div>
      <DraftingWorkspace
        opportunityId={opportunity.id}
        solicitationText={opportunity.solicitation_text}
        initialSections={(draft?.sections as Record<string, string> | undefined) ?? {}}
      />
    </main>
  );
}
