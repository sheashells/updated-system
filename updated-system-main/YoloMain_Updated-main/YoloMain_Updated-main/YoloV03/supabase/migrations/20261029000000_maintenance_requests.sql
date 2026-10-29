create table if not exists public.maintenance_requests (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    tenant_name text not null check (char_length(btrim(tenant_name)) between 1 and 120),
    tenant_email text not null check (char_length(btrim(tenant_email)) between 3 and 320),
    property_name text not null check (char_length(btrim(property_name)) between 1 and 160),
    unit_name text not null check (char_length(btrim(unit_name)) between 1 and 160),
    concern text not null check (concern in ('Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Structural', 'Pest control', 'Cleaning', 'Doors and windows', 'Other')),
    notes text not null check (char_length(btrim(notes)) between 1 and 1000),
    status text not null default 'Open' check (status in ('Open', 'In Progress', 'Completed')),
    priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Urgent')),
    assignee text not null default 'Unassigned',
    cost_estimate numeric(12, 2) not null default 0 check (cost_estimate >= 0),
    actual_cost numeric(12, 2) not null default 0 check (actual_cost >= 0),
    reported_at date not null default current_date,
    completed_at date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists maintenance_requests_tenant_created_idx
    on public.maintenance_requests (tenant_id, created_at desc);
create index if not exists maintenance_requests_status_created_idx
    on public.maintenance_requests (status, created_at desc);

alter table public.maintenance_requests enable row level security;
revoke all on table public.maintenance_requests from anon, public;
grant select, insert, update, delete on table public.maintenance_requests to authenticated;

drop policy if exists "Tenants and admins can read maintenance requests" on public.maintenance_requests;
create policy "Tenants and admins can read maintenance requests"
    on public.maintenance_requests
    for select
    to authenticated
    using (
        tenant_id = (select auth.uid())
        or coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    );

drop policy if exists "Tenants can submit their own maintenance requests" on public.maintenance_requests;
create policy "Tenants can submit their own maintenance requests"
    on public.maintenance_requests
    for insert
    to authenticated
    with check (
        tenant_id = (select auth.uid())
        and lower(tenant_email) = lower((select auth.jwt() ->> 'email'))
        and status = 'Open'
        and priority = 'Medium'
        and assignee = 'Unassigned'
        and cost_estimate = 0
        and actual_cost = 0
        and completed_at is null
    );

drop policy if exists "Admins can update maintenance requests" on public.maintenance_requests;
create policy "Admins can update maintenance requests"
    on public.maintenance_requests
    for update
    to authenticated
    using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false))
    with check (coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false));

drop policy if exists "Admins can delete maintenance requests" on public.maintenance_requests;
create policy "Admins can delete maintenance requests"
    on public.maintenance_requests
    for delete
    to authenticated
    using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false));
