-- FaithFinders video library and administrator access
-- Run this entire file once in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.service_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  service_date date not null,
  speaker text not null default 'FaithFinders Church',
  category text not null default 'Sunday Service',
  description text not null default '',
  video_url text not null,
  storage_path text,
  thumbnail_url text,
  thumbnail_storage_path text,
  published boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_videos_date_idx
  on public.service_videos(service_date desc);

create unique index if not exists service_videos_video_url_uidx
  on public.service_videos(video_url);

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_faithfinders_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_faithfinders_admin() from public, anon;
grant execute on function private.is_faithfinders_admin() to authenticated;

create or replace function public.set_service_video_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists service_videos_updated_at on public.service_videos;
create trigger service_videos_updated_at
before update on public.service_videos
for each row execute function public.set_service_video_updated_at();

revoke execute on function public.set_service_video_updated_at()
from public, anon, authenticated;

create or replace function public.keep_one_featured_video()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_featured then
    update public.service_videos
      set is_featured = false
      where id <> new.id and is_featured = true;
  end if;
  return new;
end;
$$;

drop trigger if exists service_videos_single_featured on public.service_videos;
create trigger service_videos_single_featured
before insert or update of is_featured on public.service_videos
for each row execute function public.keep_one_featured_video();

revoke execute on function public.keep_one_featured_video()
from public, anon, authenticated;

alter table public.admin_users enable row level security;
alter table public.service_videos enable row level security;

drop policy if exists "Admins can verify their access" on public.admin_users;
create policy "Admins can verify their access"
on public.admin_users for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Visitors can view published videos" on public.service_videos;
create policy "Visitors can view published videos"
on public.service_videos for select
to anon
using (published = true);

drop policy if exists "Signed-in users can view permitted videos" on public.service_videos;
create policy "Signed-in users can view permitted videos"
on public.service_videos for select
to authenticated
using (published = true or private.is_faithfinders_admin());

drop policy if exists "Admins can add videos" on public.service_videos;
create policy "Admins can add videos"
on public.service_videos for insert
to authenticated
with check (private.is_faithfinders_admin());

drop policy if exists "Admins can update videos" on public.service_videos;
create policy "Admins can update videos"
on public.service_videos for update
to authenticated
using (private.is_faithfinders_admin())
with check (private.is_faithfinders_admin());

drop policy if exists "Admins can remove videos" on public.service_videos;
create policy "Admins can remove videos"
on public.service_videos for delete
to authenticated
using (private.is_faithfinders_admin());

grant select on public.service_videos to anon;
grant select, insert, update, delete on public.service_videos to authenticated;
grant select on public.admin_users to authenticated;

-- Preserve the church's current archive when the portal is connected.
insert into public.service_videos
  (title, service_date, speaker, category, description, video_url, published, is_featured)
values
  ('Sunday Service — August 9', '2026-08-09', 'FaithFinders Church', 'Sunday Service', 'FaithFinders Sunday worship service.', 'https://www.facebook.com/100064259846821/videos/1034092655911042', true, true),
  ('Sunday Service — August 2', '2026-08-02', 'FaithFinders Church', 'Sunday Service', 'FaithFinders Sunday worship service.', 'https://www.facebook.com/100064259846821/videos/867314006244238', true, false),
  ('Sunday Service — July 26', '2026-07-26', 'FaithFinders Church', 'Sunday Service', 'FaithFinders Sunday worship service.', 'https://www.facebook.com/100064259846821/videos/1060532843584361', true, false)
on conflict (video_url) do nothing;

insert into storage.buckets (id, name, public)
values ('service-videos', 'service-videos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can watch service videos" on storage.objects;
create policy "Public can watch service videos"
on storage.objects for select
to public
using (bucket_id = 'service-videos');

drop policy if exists "Admins can upload service videos" on storage.objects;
create policy "Admins can upload service videos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'service-videos'
  and private.is_faithfinders_admin()
);

drop policy if exists "Admins can update service videos" on storage.objects;
create policy "Admins can update service videos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'service-videos'
  and private.is_faithfinders_admin()
)
with check (
  bucket_id = 'service-videos'
  and private.is_faithfinders_admin()
);

drop policy if exists "Admins can delete service videos" on storage.objects;
create policy "Admins can delete service videos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'service-videos'
  and private.is_faithfinders_admin()
);

-- Remove the older public helper if this script is being used to harden an
-- earlier installation. Public SECURITY DEFINER functions must not remain.
drop function if exists public.is_faithfinders_admin();

-- FINAL ADMIN STEP
-- 1. In Supabase Authentication > Users, create the administrator account.
-- 2. Replace the email below with that account's email.
-- 3. Run only this INSERT statement again.
insert into public.admin_users (user_id)
select id from auth.users
where lower(email) = lower('ADMIN_EMAIL@example.com')
on conflict (user_id) do nothing;
