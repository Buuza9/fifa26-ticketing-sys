-- ATIB Fan Zone · World Cup 2026 — Ticketing & Check-in
-- Full database: tables, Row Level Security, seeded events, and the API functions.
-- Run this once in the Supabase SQL editor.
--
-- Design contract (see docs/DATA-MODEL.md):
--   * Every table has RLS enabled with NO broad read/write policies.
--   * All access goes through SECURITY DEFINER functions below — the apps
--     never touch tables directly. This keeps the directory private and
--     check-in staff-only.

begin;

-- Needed for gen_random_uuid() and gen_random_bytes().
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

-- The private directory / eligibility list (imported).
create table if not exists public.employees (
  id          uuid primary key default gen_random_uuid(),
  emp_no      text,
  name        text not null,
  email       text not null,
  home_city   text not null check (home_city in ('Tripoli', 'Benghazi', 'Misrata')),
  created_at  timestamptz not null default now()
);

-- Case-insensitive unique email (matched on RSVP).
create unique index if not exists employees_email_lower_uidx
  on public.employees (lower(email));

-- One ticket per registered employee, valid all nights.
create table if not exists public.tickets (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null unique references public.employees(id) on delete cascade,
  token        text not null unique,
  rsvp_at      timestamptz not null default now(),
  revoked      boolean not null default false
);

-- The 8 x 3 grid of event nights (seeded below).
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  event_date  date not null,
  city        text not null check (city in ('Tripoli', 'Benghazi', 'Misrata')),
  venue       text not null,
  kickoff     text not null default '20:00',
  unique (event_date, city)
);

-- Scanner / admin accounts, linked to Supabase Auth (id = auth user id).
create table if not exists public.staff (
  id             uuid primary key,
  display_name   text not null,
  role           text not null default 'scanner' check (role in ('scanner', 'admin')),
  assigned_city  text check (assigned_city in ('Tripoli', 'Benghazi', 'Misrata')),
  created_at     timestamptz not null default now()
);

-- One row per ticket per night. The unique constraint is the anti-double-count rule.
create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets(id) on delete cascade,
  event_id    uuid not null references public.events(id) on delete cascade,
  scanned_by  uuid references public.staff(id),
  scanned_at  timestamptz not null default now(),
  unique (ticket_id, event_id)
);

create index if not exists attendance_event_idx on public.attendance (event_id);

-- ---------------------------------------------------------------------------
-- 2. Row Level Security — enabled, with NO policies (locks tables shut).
--    SECURITY DEFINER functions below bypass RLS and enforce their own rules.
-- ---------------------------------------------------------------------------
alter table public.employees  enable row level security;
alter table public.tickets    enable row level security;
alter table public.events     enable row level security;
alter table public.staff      enable row level security;
alter table public.attendance enable row level security;

-- Revoke direct table access from the API roles for good measure.
revoke all on public.employees, public.tickets, public.events,
                public.staff, public.attendance
  from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Seed the 8 x 3 events grid
-- ---------------------------------------------------------------------------
insert into public.events (event_date, city, venue)
select d::date, c.city, c.venue
from (values
  ('Tripoli',  'Cafeteria + Parking'),
  ('Benghazi', 'Meeting Room'),
  ('Misrata',  'Meeting Room')
) as c(city, venue)
cross join (values
  ('2026-06-11'), ('2026-06-13'), ('2026-06-15'), ('2026-06-16'),
  ('2026-06-19'), ('2026-06-21'), ('2026-06-26'), ('2026-06-28')
) as nights(d)
on conflict (event_date, city) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Helpers
-- ---------------------------------------------------------------------------

-- Generate an opaque, URL-safe, unguessable token for a QR payload.
create or replace function public.gen_ticket_token()
returns text
language sql
volatile
as $$
  -- 24 random bytes -> base64, made URL-safe and trimmed of padding.
  select translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_');
$$;

-- Is the current auth user a staff member? Returns the role or null.
create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.staff where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 5. API functions (the entire callable surface)
-- ---------------------------------------------------------------------------

-- rsvp_register(p_email) — anyone. Idempotent: registering twice returns the
-- existing ticket, never a second one.
-- Returns: ok | exists (token, name, emp_no, city) · not_found
create or replace function public.rsvp_register(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp     public.employees%rowtype;
  v_ticket  public.tickets%rowtype;
  v_new     boolean := false;
begin
  if p_email is null or btrim(p_email) = '' then
    return jsonb_build_object('status', 'not_found');
  end if;

  select * into v_emp
  from public.employees
  where lower(email) = lower(btrim(p_email))
  limit 1;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  select * into v_ticket
  from public.tickets
  where employee_id = v_emp.id;

  if not found then
    insert into public.tickets (employee_id, token)
    values (v_emp.id, public.gen_ticket_token())
    returning * into v_ticket;
    v_new := true;
  end if;

  return jsonb_build_object(
    'status',  case when v_new then 'ok' else 'exists' end,
    'token',   v_ticket.token,
    'name',    v_emp.name,
    'emp_no',  v_emp.emp_no,
    'city',    v_emp.home_city
  );
end;
$$;

-- get_ticket(p_token) — anyone. Resolves a token to its ticket for display.
-- Returns: ok (name, emp_no, city, token) · revoked · invalid
create or replace function public.get_ticket(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp     public.employees%rowtype;
  v_ticket  public.tickets%rowtype;
begin
  select * into v_ticket from public.tickets where token = p_token;
  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  if v_ticket.revoked then
    return jsonb_build_object('status', 'revoked');
  end if;

  select * into v_emp from public.employees where id = v_ticket.employee_id;

  return jsonb_build_object(
    'status',  'ok',
    'name',    v_emp.name,
    'emp_no',  v_emp.emp_no,
    'city',    v_emp.home_city,
    'token',   v_ticket.token
  );
end;
$$;

-- check_in(p_token, p_date, p_city) — staff only.
-- Records attendance for (date, city); flags home-city mismatch.
-- Returns: ok (name, home_city, mismatch) · duplicate (name, time)
--        · invalid · revoked · no_event · unauthorized
create or replace function public.check_in(p_token text, p_date date, p_city text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role    text;
  v_emp     public.employees%rowtype;
  v_ticket  public.tickets%rowtype;
  v_event   public.events%rowtype;
  v_att     public.attendance%rowtype;
begin
  v_role := public.current_staff_role();
  if v_role is null then
    return jsonb_build_object('status', 'unauthorized');
  end if;

  select * into v_ticket from public.tickets where token = p_token;
  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;
  if v_ticket.revoked then
    return jsonb_build_object('status', 'revoked');
  end if;

  select * into v_event
  from public.events
  where event_date = p_date and city = p_city;
  if not found then
    return jsonb_build_object('status', 'no_event');
  end if;

  select * into v_emp from public.employees where id = v_ticket.employee_id;

  -- Attempt to record; the unique (ticket_id, event_id) constraint makes this
  -- safe under concurrent scans from two phones.
  begin
    insert into public.attendance (ticket_id, event_id, scanned_by)
    values (v_ticket.id, v_event.id, auth.uid())
    returning * into v_att;
  exception when unique_violation then
    select * into v_att
    from public.attendance
    where ticket_id = v_ticket.id and event_id = v_event.id;
    return jsonb_build_object(
      'status', 'duplicate',
      'name',   v_emp.name,
      'time',   to_char(v_att.scanned_at, 'HH24:MI')
    );
  end;

  return jsonb_build_object(
    'status',     'ok',
    'name',       v_emp.name,
    'home_city',  v_emp.home_city,
    'mismatch',   (v_emp.home_city is distinct from p_city)
  );
end;
$$;

-- get_counts() — staff only. Aggregate attendance for the dashboard.
-- Returns: ok (issued, attendees, rows[{event_date, city, cnt}]) · unauthorized
create or replace function public.get_counts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role       text;
  v_issued     integer;
  v_attendees  integer;
  v_rows       jsonb;
begin
  v_role := public.current_staff_role();
  if v_role is null then
    return jsonb_build_object('status', 'unauthorized');
  end if;

  select count(*) into v_issued from public.tickets where not revoked;

  select count(distinct ticket_id) into v_attendees from public.attendance;

  select coalesce(jsonb_agg(r order by r->>'event_date', r->>'city'), '[]'::jsonb)
  into v_rows
  from (
    select jsonb_build_object(
      'event_date', e.event_date,
      'city',       e.city,
      'cnt',        count(a.id)
    ) as r
    from public.events e
    left join public.attendance a on a.event_id = e.id
    group by e.event_date, e.city
  ) s;

  return jsonb_build_object(
    'status',     'ok',
    'issued',     v_issued,
    'attendees',  v_attendees,
    'rows',       v_rows
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Admin functions (used by dashboard.html) — staff only, definer.
-- ---------------------------------------------------------------------------

-- resend_ticket(p_email) — return the token/link for an existing registrant.
-- Returns: ok (token, name, city) · not_found · unauthorized
create or replace function public.resend_ticket(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp     public.employees%rowtype;
  v_ticket  public.tickets%rowtype;
begin
  if public.current_staff_role() is null then
    return jsonb_build_object('status', 'unauthorized');
  end if;

  select * into v_emp
  from public.employees
  where lower(email) = lower(btrim(coalesce(p_email, '')));
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  select * into v_ticket from public.tickets where employee_id = v_emp.id;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'token',  v_ticket.token,
    'name',   v_emp.name,
    'city',   v_emp.home_city
  );
end;
$$;

-- revoke_ticket / restore_ticket — toggle the revoked flag. Admin only.
-- Returns: ok (token, revoked) · invalid · unauthorized
create or replace function public.set_ticket_revoked(p_token text, p_revoked boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.tickets%rowtype;
begin
  if public.current_staff_role() <> 'admin' then
    return jsonb_build_object('status', 'unauthorized');
  end if;

  update public.tickets
  set revoked = p_revoked
  where token = p_token
  returning * into v_ticket;

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  return jsonb_build_object(
    'status',  'ok',
    'token',   v_ticket.token,
    'revoked', v_ticket.revoked
  );
end;
$$;

create or replace function public.revoke_ticket(p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select public.set_ticket_revoked(p_token, true);
$$;

create or replace function public.restore_ticket(p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select public.set_ticket_revoked(p_token, false);
$$;

-- event_roster(p_date, p_city) — attendees for one night (export / fallback).
-- Returns: ok (rows[{name, emp_no, home_city, scanned_at, mismatch}]) · unauthorized
create or replace function public.event_roster(p_date date, p_city text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if public.current_staff_role() is null then
    return jsonb_build_object('status', 'unauthorized');
  end if;

  select coalesce(jsonb_agg(r order by r->>'scanned_at'), '[]'::jsonb)
  into v_rows
  from (
    select jsonb_build_object(
      'name',       emp.name,
      'emp_no',     emp.emp_no,
      'home_city',  emp.home_city,
      'scanned_at', to_char(a.scanned_at, 'HH24:MI'),
      'mismatch',   (emp.home_city is distinct from e.city)
    ) as r
    from public.attendance a
    join public.events e    on e.id = a.event_id
    join public.tickets t   on t.id = a.ticket_id
    join public.employees emp on emp.id = t.employee_id
    where e.event_date = p_date and e.city = p_city
  ) s;

  return jsonb_build_object('status', 'ok', 'rows', v_rows);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Grant EXECUTE on the callable surface only.
-- ---------------------------------------------------------------------------
-- Public (anonymous) surface.
grant execute on function public.rsvp_register(text) to anon, authenticated;
grant execute on function public.get_ticket(text)    to anon, authenticated;

-- Staff surface (functions self-check staff membership; sign-in required).
grant execute on function public.check_in(text, date, text) to authenticated;
grant execute on function public.get_counts()               to authenticated;
grant execute on function public.resend_ticket(text)        to authenticated;
grant execute on function public.revoke_ticket(text)        to authenticated;
grant execute on function public.restore_ticket(text)       to authenticated;
grant execute on function public.event_roster(date, text)   to authenticated;

commit;
