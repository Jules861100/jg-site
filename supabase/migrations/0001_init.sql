-- TraJeKt: multi-tenant schema with Row-Level Security
-- Tenant = organizations. Every tenant-owned row carries org_id.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Tenants & users
-- ---------------------------------------------------------------------------

create type org_kind as enum ('brand', 'supplier');

create table organizations (
  id          uuid primary key default gen_random_uuid(),
  kind        org_kind not null,
  name        text not null,
  slug        text unique not null,
  created_at  timestamptz not null default now()
);

create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  org_id      uuid not null references organizations (id) on delete cascade,
  full_name   text,
  role        text not null default 'member',
  created_at  timestamptz not null default now()
);

create index profiles_org_id_idx on profiles (org_id);

-- Returns the organization of the currently authenticated user.
-- security definer + stable: cheap to call from every RLS policy.
create function current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from profiles where id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- 2. Suppliers directory (shared, claimable)
-- ---------------------------------------------------------------------------

create table suppliers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  claimed_org_id uuid references organizations (id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Brand side: projects & components
-- ---------------------------------------------------------------------------

create table projects (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  name        text not null,
  launch_date date,
  created_at  timestamptz not null default now()
);

create index projects_org_id_idx on projects (org_id);

create table components (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  project_id    uuid not null references projects (id) on delete cascade,
  supplier_id   uuid references suppliers (id) on delete set null,
  name          text not null,
  pantone       text,
  created_at    timestamptz not null default now()
);

create index components_org_id_idx on components (org_id);
create index components_project_id_idx on components (project_id);

-- ---------------------------------------------------------------------------
-- 4. Supplier side: semi-finished spec sheets
-- ---------------------------------------------------------------------------

create table supplier_sheets (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  supplier_id uuid not null references suppliers (id) on delete cascade,
  title       text not null,
  spec        jsonb not null default '{}'::jsonb,
  status      text not null default 'draft' check (status in ('draft', 'published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index supplier_sheets_org_id_idx on supplier_sheets (org_id);

-- The "moat": a shareable token that lets a targeted brand (or, if
-- target_org_id is null, anyone with the link) read one published sheet
-- without belonging to the supplier's organization.
create table supplier_sheet_shares (
  id              uuid primary key default gen_random_uuid(),
  sheet_id        uuid not null references supplier_sheets (id) on delete cascade,
  target_org_id   uuid references organizations (id) on delete cascade,
  token           uuid not null unique default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  expires_at      timestamptz
);

create index supplier_sheet_shares_sheet_id_idx on supplier_sheet_shares (sheet_id);
create index supplier_sheet_shares_target_org_id_idx on supplier_sheet_shares (target_org_id);

-- ---------------------------------------------------------------------------
-- 5. Documents: the "last BAT" solver
-- ---------------------------------------------------------------------------

create table documents (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  project_id  uuid not null references projects (id) on delete cascade,
  kind        text not null check (kind in ('bat', 'packshot', 'other')),
  version     int not null,
  file_path   text not null,
  status      text not null default 'current' check (status in ('current', 'archived')),
  is_current  boolean not null default true,
  created_at  timestamptz not null default now()
);

create index documents_org_id_idx on documents (org_id);
create index documents_project_id_idx on documents (project_id);

-- Only one "current" document per project + kind: publishing a new version
-- must flip the previous one to archived first.
create unique index uq_documents_current
  on documents (project_id, kind)
  where (is_current);

-- ---------------------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------------------

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table suppliers enable row level security;
alter table projects enable row level security;
alter table components enable row level security;
alter table supplier_sheets enable row level security;
alter table supplier_sheet_shares enable row level security;
alter table documents enable row level security;

-- organizations: a user can read their own org
create policy organizations_select_own
  on organizations for select
  using (id = current_org_id());

-- profiles: a user can read profiles in their own org
create policy profiles_select_own_org
  on profiles for select
  using (org_id = current_org_id());

create policy profiles_update_self
  on profiles for update
  using (id = auth.uid());

-- suppliers: directory is public read; only the claiming org can update
create policy suppliers_select_all
  on suppliers for select
  using (true);

create policy suppliers_update_claimed
  on suppliers for update
  using (claimed_org_id = current_org_id());

-- projects: strict tenant isolation (brand side)
create policy projects_tenant_isolation
  on projects for all
  using (org_id = current_org_id())
  with check (org_id = current_org_id());

-- components: strict tenant isolation (brand side)
create policy components_tenant_isolation
  on components for all
  using (org_id = current_org_id())
  with check (org_id = current_org_id());

-- supplier_sheets: strict tenant isolation for the owning supplier...
create policy supplier_sheets_tenant_isolation
  on supplier_sheets for all
  using (org_id = current_org_id())
  with check (org_id = current_org_id());

-- ...with the one explicit exception: a brand that has been shared a
-- published sheet may read it.
create policy supplier_sheets_select_via_share
  on supplier_sheets for select
  using (
    status = 'published'
    and exists (
      select 1 from supplier_sheet_shares s
      where s.sheet_id = supplier_sheets.id
        and s.target_org_id = current_org_id()
        and (s.expires_at is null or s.expires_at > now())
    )
  );

-- supplier_sheet_shares: managed by the owning supplier org only
create policy supplier_sheet_shares_tenant_isolation
  on supplier_sheet_shares for all
  using (
    exists (
      select 1 from supplier_sheets sh
      where sh.id = supplier_sheet_shares.sheet_id
        and sh.org_id = current_org_id()
    )
  )
  with check (
    exists (
      select 1 from supplier_sheets sh
      where sh.id = supplier_sheet_shares.sheet_id
        and sh.org_id = current_org_id()
    )
  );

-- a targeted brand may also see the share row pointing at it
create policy supplier_sheet_shares_select_target
  on supplier_sheet_shares for select
  using (target_org_id = current_org_id());

-- documents: strict tenant isolation
create policy documents_tenant_isolation
  on documents for all
  using (org_id = current_org_id())
  with check (org_id = current_org_id());

-- ---------------------------------------------------------------------------
-- 7. Public/anon access to a shared sheet via opaque token
-- ---------------------------------------------------------------------------

-- Bypasses RLS deliberately (security definer): the token itself is the
-- credential for anonymous link access (target_org_id is null).
create function get_shared_sheet(p_token uuid)
returns supplier_sheets
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sheet supplier_sheets;
begin
  select sh.* into v_sheet
  from supplier_sheet_shares s
  join supplier_sheets sh on sh.id = s.sheet_id
  where s.token = p_token
    and s.target_org_id is null
    and sh.status = 'published'
    and (s.expires_at is null or s.expires_at > now());

  return v_sheet;
end;
$$;

revoke all on function get_shared_sheet(uuid) from public;
grant execute on function get_shared_sheet(uuid) to anon, authenticated;
