-- =====================================================================
-- 동네운동 찾기 - 문자 발송 기록 (schema.sql 다음에 실행)
-- 받는 사람 번호는 저장하지 않고, 몇 명에게 무엇을 보냈는지만 남겨요.
-- =====================================================================
create table if not exists public.message_logs (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  channel text not null default 'sms' check (channel in ('sms')),
  recipient_count integer not null default 0,
  failed_count integer not null default 0,
  text text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists message_logs_facility_idx on public.message_logs (facility_id, created_at desc);

alter table public.message_logs enable row level security;

-- 그 시설 주인만 보고 남길 수 있어요
drop policy if exists "message logs owner read" on public.message_logs;
create policy "message logs owner read" on public.message_logs
  for select using (public.owns_facility(facility_id));
drop policy if exists "message logs owner insert" on public.message_logs;
create policy "message logs owner insert" on public.message_logs
  for insert with check (public.owns_facility(facility_id) and created_by = auth.uid());
