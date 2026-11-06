-- =====================================================================
-- 동네운동 찾기 - 할인 제도 (schema.sql 을 먼저 실행한 뒤 이 파일을 실행하세요)
-- 사용법: Supabase → SQL Editor → New query → 붙여넣기 → Run (여러 번 실행해도 괜찮아요)
--
-- ※ 할인 정보는 시설 승인과 따로 관리해요.
--   (할인만 바꿨는데 시설이 "승인 대기"로 숨겨지면 안 되니까요)
--   대신 "승인된 시설"의 할인만 일반 사용자에게 보여요.
-- =====================================================================

-- 1. 기간권 요금 (시설당 1개)
--    monthly_price: 1개월 정가(원)
--    period_rates : 개월 수별 할인율(%)  예) {"3": 5, "6": 10, "12": 20}
create table if not exists public.facility_pricing (
  facility_id uuid primary key references public.facilities(id) on delete cascade,
  monthly_price integer not null default 0 check (monthly_price >= 0),
  period_rates jsonb not null default '{}'::jsonb,
  note text default '',
  updated_at timestamptz not null default now()
);

-- 2. 할인쿠폰 / 카드할인 (시설당 여러 개)
--    kind: coupon = 할인쿠폰, card = 카드할인
--    할인은 rate(%) 또는 amount(원) 중 하나
create table if not exists public.facility_discounts (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  kind text not null check (kind in ('coupon', 'card')),
  title text not null,                 -- 예: 신규회원 첫 달 할인 / 신한카드 결제 할인
  card_name text default '',           -- 카드할인: 카드사 이름
  code text default '',                -- 할인쿠폰: 쿠폰 코드(선택)
  rate numeric(5,2) check (rate is null or (rate > 0 and rate <= 100)),
  amount integer check (amount is null or amount > 0),
  condition text default '',           -- 예: 6개월 이상 결제 시, 첫 등록 1회
  starts_on date,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (rate is not null or amount is not null)
);
create index if not exists facility_discounts_facility_idx on public.facility_discounts (facility_id);

-- 3. 보안 규칙: 승인된 시설의 할인 "내용"은 로그인한 회원만 보기 / 그 시설 업체만 고치기
--    (로그인 안 한 사람은 아래 discount_summary 함수로 "할인이 있는지"만 알 수 있어요)
alter table public.facility_pricing   enable row level security;
alter table public.facility_discounts enable row level security;

create or replace function public.facility_is_public(fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.facilities where id = fid and status = 'approved');
$$;

drop policy if exists "pricing read" on public.facility_pricing;
create policy "pricing read" on public.facility_pricing
  for select using ((auth.uid() is not null and public.facility_is_public(facility_id)) or public.owns_facility(facility_id) or public.is_admin());
drop policy if exists "pricing owner write" on public.facility_pricing;
create policy "pricing owner write" on public.facility_pricing
  for all using (public.owns_facility(facility_id)) with check (public.owns_facility(facility_id));

drop policy if exists "discounts read" on public.facility_discounts;
create policy "discounts read" on public.facility_discounts
  for select using ((auth.uid() is not null and public.facility_is_public(facility_id)) or public.owns_facility(facility_id) or public.is_admin());
drop policy if exists "discounts owner write" on public.facility_discounts;
create policy "discounts owner write" on public.facility_discounts
  for all using (public.owns_facility(facility_id)) with check (public.owns_facility(facility_id));

-- 4. 로그인 안 한 사람용: 시설별 "할인 개수"만 알려 주는 함수 (할인율·코드는 알려 주지 않음)
create or replace function public.discount_summary(fids uuid[])
returns table (facility_id uuid, period_count int, coupon_count int, card_count int)
language sql stable security definer set search_path = public as $$
  select f.id,
    coalesce((select count(*) from jsonb_each(p.period_rates) r where (r.value)::text::numeric > 0), 0)::int,
    (select count(*) from facility_discounts d where d.facility_id = f.id and d.kind = 'coupon' and d.active
       and (d.starts_on is null or d.starts_on <= current_date) and (d.ends_on is null or d.ends_on >= current_date))::int,
    (select count(*) from facility_discounts d where d.facility_id = f.id and d.kind = 'card' and d.active
       and (d.starts_on is null or d.starts_on <= current_date) and (d.ends_on is null or d.ends_on >= current_date))::int
  from facilities f
  left join facility_pricing p on p.facility_id = f.id and p.monthly_price > 0
  where f.id = any(fids) and f.status = 'approved';
$$;
grant execute on function public.discount_summary(uuid[]) to anon, authenticated;
