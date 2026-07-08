import { NextResponse } from "next/server";
import { supabaseRouteHandler } from "@/lib/supabase-server";
import { oauthConfigFor } from "@/lib/mail-provider";

/**
 * Exchanges the Supabase Auth OAuth code for a session. When the provider is
 * Google, also persists the provider access/refresh token into
 * mcp_connections so lib/mail-provider.ts's getMCPServers() has something to
 * point Claude at without a second consent step.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = supabaseRouteHandler();
    const {
      data: { session },
      error,
    } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && session?.provider_token) {
      await supabase.from("mcp_connections").upsert(
        {
          profile_id: session.user.id,
          provider: "google",
          access_token: session.provider_token,
          refresh_token: session.provider_refresh_token ?? null,
          scopes: oauthConfigFor("google").scopes,
        },
        { onConflict: "profile_id,provider" }
      );
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
