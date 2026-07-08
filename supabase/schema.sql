-- GovContract AI — initial schema
-- Covers proposal §5.1 (system components) and §6.1 (onboarding/preferences).
-- Run in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Organizations & profiles
-- One organization per contractor company; profiles extend auth.users
-- and hold team membership (Starter = 1 user, up to Team = 10 users).
-- ---------------------------------------------------------------------

create table organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  cage_code text,
  uei text,
  sam_registration_status text check (sam_registration_status in ('registered', 'pending', 'expired', 'unregistered')),
  primary_naics_codes text[] not null default '{}',
  past_performance_summary text,
  plan text not null default 'starter' check (plan in ('starter', 'professional', 'team', 'enterprise')),
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid references organizations (id) on delete set null,
  role text not null default 'owner' check (role in ('owner', 'member')),
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Opportunity matching preferences (§6.1 "Opportunity filters")
-- ---------------------------------------------------------------------

create table opportunity_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  naics_codes text[] not null default '{}',
  psc_codes text[] not null default '{}',
  place_of_performance_state text,
  place_of_performance_zip text,
  place_of_performance_radius_miles integer,
  bid_value_min numeric,
  bid_value_max numeric,
  contract_types text[] not null default '{}', -- RFP, RFQ, IFB, SBIR
  set_aside_types text[] not null default '{}', -- 8a, SDVOSB, HUBZone, WOSB, SBA
  match_threshold integer not null default 70 check (match_threshold between 0 and 100),
  notification_frequency text not null default 'instant' check (notification_frequency in ('instant', 'daily', 'weekly')),
  notification_time time, -- used when frequency = daily
  notification_channel text not null default 'email' check (notification_channel in ('email', 'in_app', 'both')),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Opportunities cache (§5.2 SAM.gov integration)
-- Shared across all organizations; one row per SAM.gov notice.
-- ---------------------------------------------------------------------

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  sam_notice_id text not null unique,
  title text not null,
  agency text,
  naics_code text,
  psc_code text,
  set_aside_type text,
  contract_type text,
  place_of_performance_state text,
  place_of_performance_zip text,
  estimated_value numeric,
  posted_date date,
  response_deadline timestamptz,
  qa_deadline timestamptz,
  solicitation_text text,
  solicitation_storage_path text, -- Supabase Storage path for cached PDF/attachments
  raw_response jsonb not null default '{}', -- full SAM.gov API payload for reprocessing
  created_at timestamptz not null default now()
);

create index opportunities_response_deadline_idx on opportunities (response_deadline);
create index opportunities_naics_code_idx on opportunities (naics_code);

-- ---------------------------------------------------------------------
-- Opportunity matches (§5.2 weighted match engine)
-- NAICS 40% + location 25% + bid range 20% + set-aside 15%
-- ---------------------------------------------------------------------

create table opportunity_matches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  opportunity_id uuid not null references opportunities (id) on delete cascade,
  match_score integer not null check (match_score between 0 and 100),
  naics_match_score integer,
  location_match_score integer,
  bid_range_match_score integer,
  set_aside_match_score integer,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, opportunity_id)
);

create index opportunity_matches_org_score_idx on opportunity_matches (organization_id, match_score desc);

-- ---------------------------------------------------------------------
-- Saved / bookmarked opportunities (§6.2 dashboard)
-- ---------------------------------------------------------------------

create table saved_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  opportunity_id uuid not null references opportunities (id) on delete cascade,
  saved_by uuid not null references profiles (id) on delete cascade,
  status text not null default 'reviewing' check (status in ('reviewing', 'drafting', 'submitted', 'won', 'lost')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, opportunity_id)
);

-- ---------------------------------------------------------------------
-- Drafts & version history (§6.3 AI drafting workspace)
-- ---------------------------------------------------------------------

create table drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  opportunity_id uuid not null references opportunities (id) on delete cascade,
  created_by uuid not null references profiles (id) on delete cascade,
  title text not null,
  sections jsonb not null default '{}', -- current content keyed by section name
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table draft_versions (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references drafts (id) on delete cascade,
  version_number integer not null,
  sections jsonb not null,
  created_by uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (draft_id, version_number)
);

-- ---------------------------------------------------------------------
-- MCP connections (§4 — Gmail/Calendar/Drive via Google, or Outlook/OneDrive
-- via Microsoft Graph). Tokens should be encrypted at the application layer
-- before insert; Supabase Storage/Vault can also be used instead of this
-- table if preferred.
-- ---------------------------------------------------------------------

create table mcp_connections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft')),
  access_token text not null,
  refresh_token text,
  scopes text[] not null default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (profile_id, provider)
);

-- ---------------------------------------------------------------------
-- Row Level Security
-- All tenant data is scoped to the caller's organization via profiles.
-- ---------------------------------------------------------------------

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table opportunity_preferences enable row level security;
alter table opportunity_matches enable row level security;
alter table saved_opportunities enable row level security;
alter table drafts enable row level security;
alter table draft_versions enable row level security;
alter table mcp_connections enable row level security;
-- `opportunities` is shared reference data, readable by any authenticated user.
alter table opportunities enable row level security;

-- security definer: this function is called from RLS policies on profiles
-- itself (below). Without it, Postgres has to evaluate every permissive
-- policy to compute their OR, which re-enters this same query under RLS
-- and recurses until "stack depth limit exceeded". Running as the function
-- owner (who isn't subject to RLS) breaks the cycle.
create or replace function current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from profiles where id = auth.uid();
$$;

create policy "org members can read their organization"
  on organizations for select
  using (id = current_organization_id());

create policy "org members can update their organization"
  on organizations for update
  using (id = current_organization_id());

-- Must come before the org-wide policy below: current_organization_id()
-- itself queries profiles, so without a direct self-read policy, nobody
-- could ever read their own row (the org-wide policy would have nothing
-- to key off of, since it depends on the row it's trying to authorize).
create policy "users can read their own profile"
  on profiles for select
  using (id = auth.uid());

create policy "org members can read profiles in their organization"
  on profiles for select
  using (organization_id = current_organization_id());

create policy "users can update their own profile"
  on profiles for update
  using (id = auth.uid());

create policy "any authenticated user can read opportunities"
  on opportunities for select
  to authenticated
  using (true);

create policy "org members can manage their preferences"
  on opportunity_preferences for all
  using (organization_id = current_organization_id());

create policy "org members can read their matches"
  on opportunity_matches for select
  using (organization_id = current_organization_id());

create policy "org members can manage their saved opportunities"
  on saved_opportunities for all
  using (organization_id = current_organization_id());

create policy "org members can manage their drafts"
  on drafts for all
  using (organization_id = current_organization_id());

create policy "org members can read draft versions"
  on draft_versions for select
  using (draft_id in (select id from drafts where organization_id = current_organization_id()));

create policy "users can manage their own mcp connections"
  on mcp_connections for all
  using (profile_id = auth.uid());

-- ---------------------------------------------------------------------
-- Auto-provisioning: every new auth.users row gets its own organization
-- (renameable later during onboarding, §6.1) and an "owner" profile.
-- ---------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_org_id uuid;
begin
  insert into organizations (legal_name)
  values (coalesce(new.raw_user_meta_data ->> 'company_name', 'My Company'))
  returning id into new_org_id;

  insert into profiles (id, organization_id, role, full_name, email)
  values (new.id, new_org_id, 'owner', new.raw_user_meta_data ->> 'full_name', new.email);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
