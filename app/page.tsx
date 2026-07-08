import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { SignOutButton } from "@/components/sign-out-button";

const FEATURES = [
  {
    title: "Smart opportunity discovery",
    description: "SAM.gov polled daily and matched to your saved parameters, ranked by fit score.",
    icon: (
      <path
        d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM17 17l-3.6-3.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Real-time notifications",
    description: "Instant, daily, or weekly email alerts the moment a new match is posted.",
    icon: (
      <path
        d="M10 17a2 2 0 0 0 2-2H8a2 2 0 0 0 2 2Zm6-5V9a6 6 0 1 0-12 0v3l-1.5 3h15L16 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "AI proposal drafting",
    description: "Claude drafts capability statements, technical approach, and pricing narrative in-platform.",
    icon: (
      <path
        d="M4 15.5 13.5 6a1.5 1.5 0 0 1 2.12 0l.38.38a1.5 1.5 0 0 1 0 2.12L6.5 18H4v-2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "MCP workflow integration",
    description: "Claude connects Gmail, Calendar, and Drive so you act on opportunities without switching tabs.",
    icon: (
      <path
        d="M7 8.5a2.5 2.5 0 1 1 2.4 3.2M13 11.5a2.5 2.5 0 1 1-2.4 3.2M9 9.5l2 2m0 0 2-2m-2 2v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
          inverted ? "bg-white text-slate-900" : "bg-slate-900 text-white"
        }`}
      >
        G
      </div>
      <span className={`text-lg font-bold ${inverted ? "text-white" : "text-slate-900"}`}>
        GovContract AI
      </span>
    </div>
  );
}

export default async function Home() {
  const supabase = supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <header className="bg-slate-900">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Logo inverted />
            <SignOutButton />
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-6 py-16">
          <div className="w-full rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-500">Signed in as {session.user.email}</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Welcome back</h1>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-800"
            >
              Go to dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-slate-900">
        <header>
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Logo inverted />
            <Link
              href="/login"
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-4xl px-6 pb-24 pt-12 text-center sm:pb-32 sm:pt-16">
          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sky-300 ring-1 ring-inset ring-white/20">
            Powered by SAM.gov, Claude AI & Claude MCP
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Find, track, and win government contracts in one place
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">
            GovContract AI monitors SAM.gov for opportunities that match your business, alerts you the
            moment they post, and drafts your proposal — so you spend less time searching and more time
            winning.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-400"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </section>
      </div>

      <main>
        <section className="bg-slate-50 py-16">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                      {feature.icon}
                    </svg>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-500">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-900 py-16">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <h2 className="text-2xl font-bold text-white">Stop losing bids to missed postings</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              Set your NAICS codes and filters once — GovContract AI does the rest.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-400"
            >
              Get started
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
