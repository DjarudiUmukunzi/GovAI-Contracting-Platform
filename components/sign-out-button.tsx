"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export function SignOutButton() {
  const supabase = supabaseBrowser();
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.refresh();
      }}
      className="rounded border px-3 py-2 text-sm"
    >
      Sign out
    </button>
  );
}
