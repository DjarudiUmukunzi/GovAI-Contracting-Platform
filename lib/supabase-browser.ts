import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

/**
 * Client-side Supabase client, scoped to the signed-in user via cookies.
 * Use inside "use client" components only.
 *
 * Memoized as a singleton — calling createClientComponentClient() fresh per
 * component creates multiple GoTrueClient instances racing on the same
 * cookie storage key, which silently breaks auth state sync (e.g. signOut()
 * not propagating before the page re-renders).
 */
export function supabaseBrowser() {
  if (!browserClient) {
    browserClient = createClientComponentClient();
  }
  return browserClient;
}
