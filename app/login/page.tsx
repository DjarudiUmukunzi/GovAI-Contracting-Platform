"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { oauthConfigFor } from "@/lib/mail-provider";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      <path
        d="M19.6 10.2c0-.7-.06-1.35-.18-2H10v3.8h5.4a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 3-4.32 3-7.32Z"
        fill="#4285F4"
      />
      <path
        d="M10 20c2.7 0 4.96-.9 6.62-2.44l-3.24-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.75-5.6-4.12H1.06v2.58A10 10 0 0 0 10 20Z"
        fill="#34A853"
      />
      <path
        d="M4.4 11.9a6 6 0 0 1 0-3.8V5.52H1.06a10 10 0 0 0 0 8.96l3.34-2.58Z"
        fill="#FBBC05"
      />
      <path
        d="M10 3.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.5 9.5 0 0 0 10 0 10 10 0 0 0 1.06 5.52L4.4 8.1c.8-2.37 3-4.12 5.6-4.12Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleGoogleSignIn() {
    // Requesting Gmail/Calendar/Drive scopes here means the same Google
    // sign-in also grants MCP consent (proposal §5.1, §6.1) — no separate
    // OAuth step later.
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: oauthConfigFor("google").scopes.join(" "),
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">
            G
          </div>
          <span className="text-sm font-bold text-slate-900">GovContract AI</span>
        </Link>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-base font-semibold text-slate-900">
            {mode === "signin" ? "Sign in to your account" : "Create your account"}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {mode === "signin"
              ? "Welcome back — enter your details below."
              : "Start finding and winning contracts."}
          </p>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Email</span>
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Password</span>
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600"
              />
            </label>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-800 disabled:opacity-50"
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-xs text-slate-500 hover:text-slate-700"
        >
          {mode === "signin" ? "Need an account? " : "Already have an account? "}
          <span className="font-medium text-sky-700">
            {mode === "signin" ? "Sign up" : "Sign in"}
          </span>
        </button>
      </div>
    </main>
  );
}
