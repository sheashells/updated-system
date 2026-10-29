create table if not exists public.valuation_comparables (
    id uuid primary key default gen_random_uuid(),
    location text not null check (char_length(btrim(location)) between 3 and 120),
    property_type text not null check (property_type in ('condominium', 'apartment', 'house', 'townhouse', 'commercial', 'industrial')),
    floor_area_m2 numeric(12, 2) not null check (floor_area_m2 > 0),
    lot_area_m2 numeric(12, 2) check (lot_area_m2 is null or lot_area_m2 >= 0),
    bedrooms integer check (bedrooms is null or bedrooms between 0 and 30),
    sale_price_php numeric(16, 2) not null check (sale_price_php > 0),
    sold_at date not null,
    source text not null check (char_length(btrim(source)) between 2 and 200),
    source_url text,
    verified boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists valuation_comparables_lookup_idx
    on public.valuation_comparables (lower(location), property_type, sold_at desc)
    where verified = true;

alter table public.valuation_comparables enable row level security;
revoke all on table public.valuation_comparables from anon, authenticated;
grant all on table public.valuation_comparables to service_role;

create table if not exists public.valuation_request_events (
    user_id uuid not null,
    created_at timestamptz not null default now()
);

alter table public.valuation_request_events enable row level security;
revoke all on table public.valuation_request_events from anon, authenticated;
grant all on table public.valuation_request_events to service_role;

create or replace function public.consume_valuation_request(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    recent_requests integer;
begin
    perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
    delete from public.valuation_request_events
    where created_at < now() - interval '10 minutes';

    select count(*) into recent_requests
    from public.valuation_request_events
    where user_id = p_user_id
      and created_at >= now() - interval '1 minute';

    if recent_requests >= 5 then
        return false;
    end if;

    insert into public.valuation_request_events (user_id) values (p_user_id);
    return true;
end;
$$;

revoke all on function public.consume_valuation_request(uuid) from public, anon, authenticated;
grant execute on function public.consume_valuation_request(uuid) to service_role;
