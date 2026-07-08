import { NextRequest } from "next/server";
import { supabaseRouteHandler } from "@/lib/supabase-server";
import { streamAI } from "@/lib/ai-provider";
import { getMCPServers } from "@/lib/mail-provider";
import { buildDraftingSystemPrompt, isDraftSection, sectionInstruction } from "@/lib/drafting-prompt";

/**
 * Streams a drafted section for one opportunity (proposal §5.3/§6.3).
 * POST body: { opportunityId: string, section: string, instruction?: string }
 * `instruction`, when present, overrides the default section prompt — used
 * for inline commands ("address this requirement", "expand this", etc.).
 */
export async function POST(request: NextRequest) {
  const supabase = supabaseRouteHandler();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { opportunityId, section, instruction } = await request.json();
  if (typeof section !== "string" || !isDraftSection(section)) {
    return new Response("Unknown section", { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", session.user.id)
    .single();
  if (!profile?.organization_id) return new Response("No organization", { status: 400 });

  const { data: organization } = await supabase
    .from("organizations")
    .select("legal_name, cage_code, uei, primary_naics_codes, past_performance_summary")
    .eq("id", profile.organization_id)
    .single();
  if (!organization) return new Response("Organization not found", { status: 404 });

  const { data: opportunity } = await supabase
    .from("opportunities")
    .select("title, agency, naics_code, set_aside_type, solicitation_text")
    .eq("id", opportunityId)
    .single();
  if (!opportunity) return new Response("Opportunity not found", { status: 404 });

  const system = buildDraftingSystemPrompt(organization, opportunity);
  const userMessage = typeof instruction === "string" && instruction.trim() ? instruction : sectionInstruction(section);

  let mcpServers;
  try {
    mcpServers = getMCPServers();
  } catch {
    // No MCP connection yet (e.g. user signed up with email/password, not
    // Google OAuth) — draft without live Drive retrieval instead of failing.
    mcpServers = undefined;
  }

  const stream = streamAI({
    system,
    messages: [{ role: "user", content: userMessage }],
    maxTokens: 2000,
    mcpServers,
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      stream.on("text", (textDelta) => controller.enqueue(encoder.encode(textDelta)));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
