-- =====================================================================
-- 동네운동 찾기 - Supabase 데이터베이스 설정
-- 사용법: Supabase 대시보드 → SQL Editor → New query → 이 파일 전체 붙여넣기 → Run
-- (여러 번 실행해도 괜찮게 만들었어요)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 회원 정보 (profiles)
--    role: user = 개인회원, owner = 시설업체, admin = 관리자
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text not null default '',
  phone text default '',
  role text not null default 'user' check (role in ('user', 'owner', 'admin')),
  created_at timestamptz not null default now()
);

-- 회원가입하면 profiles 행을 자동으로 만들어요. (admin은 가입으로 만들 수 없음)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    case when new.raw_user_meta_data->>'role' = 'owner' then 'owner' else 'user' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 관리자인지 확인하는 함수
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 본인이 role(등급)을 마음대로 바꾸지 못하게 막기
create or replace function public.protect_profile_role()
returns trigger language plpgsql as $$
begin
  if new.role <> old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------------------------------------------------------------------
-- 2. 업체가 등록한 시설 (facilities)
--    status: pending = 승인 대기, approved = 공개, rejected = 반려
-- ---------------------------------------------------------------------
create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  sido text not null,
  sigungu text not null,
  address text not null,
  phone text default '',
  homepage text default '',
  main_event text default '',            -- 주종목 (예: 필라테스)
  sport_ids text[] not null default '{}', -- 우리 8개 종목 id
  description text default '',
  lat double precision,
  lng double precision,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists facilities_region_idx on public.facilities (sido, sigungu, status);

-- 업체가 등록·수정하면 다시 "승인 대기"로 (관리자는 예외)
create or replace function public.facility_review_rule()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if not public.is_admin() then
    new.status := 'pending';
    new.reject_reason := '';
  end if;
  return new;
end $$;

drop trigger if exists facility_review_rule on public.facilities;
create trigger facility_review_rule before insert or update on public.facilities
  for each row execute function public.facility_review_rule();

-- ---------------------------------------------------------------------
-- 3. 업체의 회원 관리 (members / attendance / payments)
--    ※ 개인정보는 최소한만: 이름, 연락처, 메모 (주민번호 등은 저장하지 않아요)
-- ---------------------------------------------------------------------
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  name text not null,
  phone text default '',
  course text default '',         -- 수강 강좌/반
  monthly_fee integer default 0,  -- 월 수강료(원)
  joined_on date default current_date,
  status text not null default 'active' check (status in ('active', 'paused', 'left')),
  memo text default '',
  created_at timestamptz not null default now()
);
create index if not exists members_facility_idx on public.members (facility_id);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (member_id, date)
);
create index if not exists attendance_facility_date_idx on public.attendance (facility_id, date);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'), -- 예: 2026-11
  amount integer not null default 0,
  method text default '' check (method in ('', '현금', '카드', '계좌이체', '이용권')),
  paid_on date default current_date,
  created_at timestamptz not null default now(),
  unique (member_id, month)
);
create index if not exists payments_facility_month_idx on public.payments (facility_id, month);

-- 이 시설의 주인인지 확인
create or replace function public.owns_facility(fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.facilities where id = fid and owner_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 4. 보안 규칙 (RLS: 행 단위 보안) - 브라우저에서 직접 DB를 써도 안전하게
-- ---------------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.facilities enable row level security;
alter table public.members    enable row level security;
alter table public.attendance enable row level security;
alter table public.payments   enable row level security;

-- profiles: 본인 것만 보고 고치기, 관리자는 모두 보기
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- facilities: 승인된 시설은 누구나 보기 / 업체는 자기 시설 / 관리자는 전부
drop policy if exists "facilities public read" on public.facilities;
create policy "facilities public read" on public.facilities
  for select using (status = 'approved' or owner_id = auth.uid() or public.is_admin());
drop policy if exists "facilities owner insert" on public.facilities;
create policy "facilities owner insert" on public.facilities
  for insert with check (
    owner_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin'))
  );
drop policy if exists "facilities owner update" on public.facilities;
create policy "facilities owner update" on public.facilities
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
drop policy if exists "facilities owner delete" on public.facilities;
create policy "facilities owner delete" on public.facilities
  for delete using (owner_id = auth.uid() or public.is_admin());

-- members / attendance / payments: 그 시설 주인만 (관리자도 못 봐요 - 개인정보 보호)
drop policy if exists "members owner all" on public.members;
create policy "members owner all" on public.members
  for all using (public.owns_facility(facility_id)) with check (public.owns_facility(facility_id));
drop policy if exists "attendance owner all" on public.attendance;
create policy "attendance owner all" on public.attendance
  for all using (public.owns_facility(facility_id)) with check (public.owns_facility(facility_id));
drop policy if exists "payments owner all" on public.payments;
create policy "payments owner all" on public.payments
  for all using (public.owns_facility(facility_id)) with check (public.owns_facility(facility_id));

-- ---------------------------------------------------------------------
-- 5. 관리자 지정 (처음 한 번만, 내 이메일로 바꿔서 따로 실행)
-- update public.profiles set role = 'admin' where email = '내이메일@example.com';
-- ---------------------------------------------------------------------
