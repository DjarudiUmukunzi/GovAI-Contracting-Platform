import {
  createRouteHandlerClient,
  createServerActionClient,
  createServerComponentClient,
} from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Server Component Supabase client, scoped to the signed-in user via
 * cookies (read-only). RLS policies in supabase/schema.sql apply.
 * Server-only — importing this from a "use client" file will break the build.
 */
export function supabaseServer() {
  return createServerComponentClient({ cookies });
}

/**
 * Route Handler Supabase client — like supabaseServer(), but can also write
 * auth cookies (needed for the OAuth callback and sign-out routes).
 */
export function supabaseRouteHandler() {
  return createRouteHandlerClient({ cookies });
}

/**
 * Server Action Supabase client — like supabaseServer(), but can also write
 * auth cookies. Use inside "use server" actions (e.g. app/dashboard/actions.ts).
 */
export function supabaseServerAction() {
  return createServerActionClient({ cookies });
}

/**
 * Service-role Supabase client for backend jobs (SAM.gov polling, match
 * engine, cron-triggered notifications) that must bypass RLS. Never expose
 * this client or SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
