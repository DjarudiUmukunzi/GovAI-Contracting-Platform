# GovContract AI — starter scaffold

This is a starting point, not a finished app. It gives you the pieces that
needed a decision made (AI provider, mail provider) already wired as clean
abstractions, so the rest of the build in Claude Code isn't blocked on them.

## What's here

- `lib/ai-provider.ts` — one `callAI()` function. Flip `AI_PROVIDER` in
  `.env` between `anthropic` and `deepseek`. Read the comment at the top
  before switching — DeepSeek's compatible endpoint drops MCP tool
  orchestration, which your MCP workflows (Gmail/Outlook, Calendar, Drive)
  depend on.
- `lib/mail-provider.ts` — one `getMCPServers()` function. Flip
  `MAIL_PROVIDER` between `google` and `microsoft`. The Microsoft/Outlook
  path needs an actual Graph-API MCP server URL — confirm what's currently
  available (self-hosted or third-party) before you build against it, since
  this space moves fast.
- `.env.example` — every env var referenced above, plus a note on where the
  21st.dev Magic key and the ui-ux-pro-max skill belong (your MCP client
  config, never a `.env` committed to the repo).
- `package.json` — the dependency set from the proposal's tech stack
  (Next.js, Supabase, Resend, Anthropic SDK).

## Status

- [x] Next.js 14 app router scaffold (TypeScript, Tailwind, ESLint) — done
- [x] `lib/ai-provider.ts`, `lib/mail-provider.ts` wired in
- [x] Supabase schema (`supabase/schema.sql`) — users, preferences, saved
      opportunities, draft history (proposal §5.1/§6.1)
- [x] `lib/supabase-browser.ts`, `lib/supabase-server.ts` — browser, server
      component, route handler, and admin (service-role) clients
- [x] Auth: Supabase Auth email/password + Google OAuth (requests the same
      Gmail/Calendar/Drive scopes as `oauthConfigFor()`, so sign-in also
      covers MCP consent). See `middleware.ts`, `app/login/page.tsx`,
      `app/auth/callback/route.ts`. A DB trigger (`handle_new_user` in
      `supabase/schema.sql`) auto-creates an organization + profile on signup.
- [x] SAM.gov polling + weighted match engine (proposal §5.2) — see
      `lib/sam-gov.ts`, `lib/match-engine.ts`,
      `app/api/cron/poll-sam-gov/route.ts`, scheduled via `vercel.json`.
      Sends alerts through `lib/resend-email.ts`.
- [x] Dashboard UI (`app/dashboard/page.tsx`, proposal §6.2) — opportunity
      feed sortable by match score/deadline/value, save/status tracking
      (`app/dashboard/actions.ts`, `components/opportunity-card.tsx`,
      `components/saved-opportunity-row.tsx`), and an upcoming-deadlines
      list.
- [x] Visual design pass (via the `ui-ux-pro-max` skill) — Enterprise SaaS
      style: navy/slate + sky-blue accent, Plus Jakarta Sans
      (`app/layout.tsx`), tiered match-score badges (emerald/sky/slate),
      deadline-urgency color coding, status pills on saved opportunities,
      icon-based actions (no emoji), segmented sort control.
- [x] Home / landing page (`app/page.tsx`) — dark navy header/hero + light
      feature grid + dark closing CTA (bookend pattern, avoids an all-white
      page) for signed-out visitors, headline/subhead from proposal §1,
      4-feature grid from proposal §3's platform pillars. Signed-in users
      get a simple "Welcome back" card under the same dark header.
- [x] Login page (`app/login/page.tsx`) — centered card, smaller type scale
      (text-sm/text-xs throughout, was text-xl/base), labeled inputs, a
      proper multi-color Google icon on "Continue with Google". The
      onboarding form still uses the original plain styling.
- [x] Drafting workspace (proposal §5.3/§6.3) — `lib/drafting-prompt.ts`
      builds the system prompt from company profile + solicitation text;
      `lib/ai-provider.ts` gained `streamAI()` alongside `callAI()`;
      `app/api/drafts/generate/route.ts` streams a section (also passes
      `getMCPServers()` so Claude can pull Drive docs live, falling back
      gracefully if no MCP connection exists yet); `app/dashboard/drafts/
      [opportunityId]/page.tsx` is the split-screen editor (solicitation
      left, streamed draft right), with Save snapshotting to
      `draft_versions` via `app/dashboard/drafts/actions.ts`.
- [x] Onboarding (proposal §6.1) — `app/onboarding/page.tsx` +
      `components/onboarding-form.tsx`: company profile (legal name, CAGE,
      UEI, SAM.gov status, primary NAICS, past performance) and opportunity
      filters (NAICS/PSC codes, location, bid range, contract types,
      set-aside types, match threshold, notification prefs), saved via
      `app/onboarding/actions.ts`. Linked from the dashboard header.

## What's deliberately not built yet

- Inline commands (highlight a requirement, ask Claude to address/rewrite
  it) and the compliance scanner (§6.3) — the drafting workspace generates
  and saves whole sections, but doesn't do selection-scoped edits or
  cross-reference the solicitation against the current draft yet.
- Version history UI — snapshots are written to `draft_versions` on every
  save, but there's no browse/restore view.
- Visual polish beyond the dashboard — login, home, onboarding, and the
  drafting workspace still have the original bare-bones styling. Re-run the
  `ui-ux-pro-max` skill against those files to bring them in line with the
  dashboard's design system (colors/typography are already established in
  `app/layout.tsx` — reuse them rather than re-deriving).

## Decisions still open

- `lib/supabase-browser.ts`'s `supabaseBrowser()` must stay a memoized
  singleton. Calling `createClientComponentClient()` fresh per component
  (the original code) spawns multiple GoTrueClient instances racing on the
  same cookie storage key — surfaced as a console warning, but the real
  symptom was sign-out not taking effect until a manual cookie clear. Fixed
  once; don't reintroduce a per-call client.
- Outlook MCP: no first-party Anthropic-hosted Outlook connector as of this
  writing — you'll need to find or build one before `MAIL_PROVIDER=microsoft`
  is real, not just scaffolded.
- DeepSeek: fine for cost-sensitive drafting calls that don't need MCP;
  keep MCP-dependent calls on Anthropic until/unless that changes.
- `@supabase/auth-helpers-nextjs` (used for the login flow) is deprecated
  upstream in favor of `@supabase/ssr`. Still functional, but worth migrating
  before this goes to production.
- SAM.gov field names (`lib/sam-gov.ts`) are best-effort against the public
  API docs — verify against a live response before trusting them in prod.
- SAM.gov's NAICS filter param is `ncode`, not `naicsCode` (that's only the
  response field name) — confirmed empirically after the wrong name silently
  returned unfiltered results.
- RLS policies are per-operation (select/insert/update/delete), not
  per-table — a table with only a `for select` policy silently no-ops any
  `update()`/`insert()` call (0 rows affected, no error) rather than
  rejecting it. Caught this twice already (`organizations` had no update
  policy; `current_organization_id()` needed `security definer` to avoid
  recursing into `profiles`' own RLS). When adding new tables/columns to
  `supabase/schema.sql`, double-check every operation the app needs is
  covered by an explicit policy, and test writes against a live session —
  not just service-role.
