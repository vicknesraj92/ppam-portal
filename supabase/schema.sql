-- =========================================================
-- PPAM Portal — Supabase database schema
-- Run this once in: Supabase Dashboard → SQL Editor → New query
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- 1. MEMBERS
-- One row per member, linked 1:1 to a Supabase Auth user.
-- Members log in with their IC number, which the app converts
-- to a pseudo-email (see src/supabaseClient.js) because
-- Supabase Auth requires an email-shaped identifier.
-- ---------------------------------------------------------
create table public.members (
  id            uuid primary key references auth.users(id) on delete cascade,
  member_no     text unique not null,        -- e.g. PPAM-001
  ic_number     text unique not null,        -- for staff reference only, never shown publicly
  full_name     text not null,
  position      text,                        -- Jawatan: Presiden, AJK, Ahli, etc.
  joined_date   date,
  fee_status    text default 'Belum Dijelaskan',
  phone         text,
  created_at    timestamptz default now()
);

alter table public.members enable row level security;

-- A member can only ever read their OWN row — no member directory / browsing.
create policy "Members can view own profile only"
  on public.members for select
  using (auth.uid() = id);

-- Members cannot edit their own row from the app (prevents self-editing fee status etc.)
-- Profile changes are made by committee via the Supabase Table Editor, or a future admin panel.


-- ---------------------------------------------------------
-- 2. ACTIVITIES
-- Public read-only list of current & upcoming activities.
-- ---------------------------------------------------------
create table public.activities (
  id             bigint generated always as identity primary key,
  title          text not null,
  status         text check (status in ('akan_datang','berlangsung','selesai')) default 'akan_datang',
  activity_date  date,
  activity_time  text,
  location       text,
  description    text,
  created_at     timestamptz default now()
);

alter table public.activities enable row level security;

create policy "Anyone can view activities"
  on public.activities for select
  using (true);

-- Only committee (via Supabase dashboard, or service-role key in a future admin panel)
-- can insert/update/delete activities — no public write policy is created on purpose.


-- ---------------------------------------------------------
-- 3. AMBULANCE SERVICE REQUESTS
-- Public can submit a request. Nobody can read the list back
-- through the public API — committee reviews it in the
-- Supabase Table Editor (or a future admin panel with a
-- service-role / authenticated-committee policy).
-- ---------------------------------------------------------
create table public.ambulance_requests (
  id              bigint generated always as identity primary key,
  reference_code  text unique not null default ('PPAM-REQ-' || upper(substr(md5(random()::text), 1, 6))),
  full_name       text not null,
  phone           text not null,
  event_type      text,
  location        text,
  request_date    date,
  request_time    text,
  details         text,
  status          text default 'Baharu',   -- Baharu / Disahkan / Selesai / Dibatalkan
  created_at      timestamptz default now()
);

alter table public.ambulance_requests enable row level security;

create policy "Anyone can submit a request"
  on public.ambulance_requests for insert
  with check (true);

-- No SELECT policy for the public role → requests are write-only from the public side.


-- ---------------------------------------------------------
-- 4. SAMPLE ACTIVITIES (safe to run — replace with real data anytime)
-- ---------------------------------------------------------
insert into public.activities (title, status, activity_date, activity_time, location, description) values
  ('Kursus Asas Pertolongan Cemas', 'akan_datang', '2026-08-12', '9:00 pagi – 1:00 tgh', 'Dewan Komuniti Batu Caves', 'Kursus pengenalan pertolongan cemas untuk orang awam.'),
  ('Standby Larian Amal Selangor', 'akan_datang', '2026-08-23', '6:30 pagi – 11:00 pagi', 'Stadium Shah Alam', 'Pasukan standby pertolongan cemas untuk acara larian amal.');

-- ---------------------------------------------------------
-- 5. MEMBERSHIP APPLICATIONS
-- Public registration form. Committee reviews applications in
-- the Table Editor (or a future admin panel) and, once approved,
-- manually creates the Auth user + members row (see Bahagian 5
-- of DEPLOYMENT_GUIDE.md) using the details captured here.
-- ---------------------------------------------------------
create table public.membership_applications (
  id                      bigint generated always as identity primary key,
  full_name               text not null,
  ic_number               text not null,
  address                 text,
  contact_number          text not null,
  email                   text,
  occupation              text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  status                  text default 'Baharu',  -- Baharu / Diluluskan / Ditolak
  created_at              timestamptz default now()
);

alter table public.membership_applications enable row level security;

create policy "Anyone can submit a membership application"
  on public.membership_applications for insert
  with check (true);

-- No SELECT policy for the public role → applications are write-only from the public side.


-- ---------------------------------------------------------
-- 6. SERVICE DUTIES (perkhidmatan / standby hours)
-- One row per member per duty session. A single logged-in
-- representative can submit rows for several members at once
-- (e.g. a team leader logging the whole team after an event).
-- Hours are computed in the app from start/end time and stored
-- directly so totals are cheap to read back.
-- ---------------------------------------------------------
create table public.service_duties (
  id                      bigint generated always as identity primary key,
  member_no               text not null references public.members(member_no),
  member_name             text not null,   -- denormalised for easy display
  duty_type               text not null,
  duty_date               date not null,
  start_time              time not null,
  end_time                time not null,
  hours                   numeric(5,2) not null,
  submitted_by            text not null,   -- name of the representative who logged it
  submitted_by_member_no  text references public.members(member_no),
  created_at              timestamptz default now()
);

alter table public.service_duties enable row level security;

-- Any logged-in member can log duty hours (for themselves or on behalf of others).
create policy "Logged-in members can submit duty records"
  on public.service_duties for insert
  to authenticated
  with check (true);

-- A member can only see their OWN duty history / hours — not other members'.
create policy "Members can view their own duty records only"
  on public.service_duties for select
  to authenticated
  using (
    member_no = (select member_no from public.members where id = auth.uid())
  );


-- =========================================================
-- NOTE ON ADDING REAL MEMBERS
-- Each member needs BOTH:
--   (a) an Auth user — created in Dashboard → Authentication → Add user,
--       using email format "<ic-number>@members.ppam.local" and a temp password
--   (b) a matching row in public.members with the SAME id as that Auth user
-- Once you share the real member list (name, IC number, jawatan, tarikh sertai),
-- I'll generate the exact SQL / setup script for all of them in one go.
-- =========================================================
