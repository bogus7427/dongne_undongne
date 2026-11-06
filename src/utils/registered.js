// 업체가 직접 등록한 시설(Supabase) 불러오기
import { supabase } from '../lib/supabase.js'
import { getSportIds } from '../data/sportMapping.js'
import { maxDiscountRate, buildPeriodRows, activeDiscounts } from './discounts.js'

// DB 행 → 다른 시설들과 같은 모양으로
export function normalizeRegistered(row) {
  const f = {
    kind: 'registered',
    id: row.id,
    name: row.name,
    sido: row.sido,
    sigungu: row.sigungu,
    address: row.address,
    phone: row.phone || '',
    homepage: row.homepage || '',
    mainEvent: row.main_event || '',
    industry: row.main_event || '',
    facilityType: '등록 업체',
    description: row.description || '',
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    // 할인 정보 (아래 attachDiscounts에서 채워요)
    pricing: null,
    discounts: [],
    discountLocked: false, // true = 할인이 있지만 로그인해야 볼 수 있음
    discountCounts: { period: 0, coupon: 0, card: 0 },
    hasDiscount: false,
    maxDiscount: null,
  }
  // 업체가 고른 종목 + 주종목 글자로 찾은 종목
  f.sportIds = [...new Set([...(row.sport_ids || []), ...getSportIds({ ...f, kind: 'voucher' })])]
  return f
}

// 시설 목록에 할인 정보 붙이기
// - 로그인했으면: 할인 내용 전체
// - 로그인 안 했으면: "할인이 몇 개 있는지"만 (내용은 DB가 막아요)
async function attachDiscounts(facilities) {
  if (!facilities.length) return facilities
  const ids = facilities.map((f) => f.id)
  const { data: sessionData } = await supabase.auth.getSession()

  if (sessionData.session) {
    const [pricing, discounts] = await Promise.all([
      supabase.from('facility_pricing').select('*').in('facility_id', ids),
      supabase.from('facility_discounts').select('*').in('facility_id', ids).order('created_at'),
    ])
    return facilities.map((f) => {
      const p = (pricing.data || []).find((x) => x.facility_id === f.id) || null
      const d = (discounts.data || []).filter((x) => x.facility_id === f.id)
      const active = activeDiscounts(d)
      return {
        ...f,
        pricing: p,
        discounts: d,
        discountCounts: {
          period: buildPeriodRows(p).length,
          coupon: active.filter((x) => x.kind === 'coupon').length,
          card: active.filter((x) => x.kind === 'card').length,
        },
        hasDiscount: buildPeriodRows(p).length > 0 || active.length > 0,
        maxDiscount: maxDiscountRate(p, d),
      }
    })
  }

  const { data } = await supabase.rpc('discount_summary', { fids: ids })
  return facilities.map((f) => {
    const s = (data || []).find((x) => x.facility_id === f.id)
    const counts = { period: s?.period_count || 0, coupon: s?.coupon_count || 0, card: s?.card_count || 0 }
    const has = counts.period + counts.coupon + counts.card > 0
    return { ...f, discountCounts: counts, hasDiscount: has, discountLocked: has }
  })
}

// 승인된 등록 시설 (시/군/구 하나). Supabase 설정이 없으면 빈 목록.
export async function fetchRegistered(sido, sigungu) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('facilities')
    .select('*')
    .eq('status', 'approved')
    .eq('sido', sido)
    .eq('sigungu', sigungu)
    .limit(500)
  if (error) {
    console.warn('등록 시설을 불러오지 못했어요', error)
    return [] // 등록 시설이 실패해도 공공 시설은 보여 주도록
  }
  return attachDiscounts(data.map(normalizeRegistered))
}

export async function fetchRegisteredById(id) {
  if (!supabase) throw new Error('회원 기능 설정(Supabase)이 필요해요.')
  const { data, error } = await supabase.from('facilities').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  const [facility] = await attachDiscounts([normalizeRegistered(data)])
  return facility
}

// 할인이 있는 등록 시설 모아 보기 (할인제도 페이지용). sido가 비면 전국.
export async function fetchDiscountedFacilities(sido = '', sigungu = '') {
  if (!supabase) return []
  let query = supabase.from('facilities').select('*').eq('status', 'approved')
  if (sido) query = query.eq('sido', sido)
  if (sido && sigungu) query = query.eq('sigungu', sigungu)
  const { data, error } = await query.order('updated_at', { ascending: false }).limit(300)
  if (error) throw error
  const list = await attachDiscounts(data.map(normalizeRegistered))
  return list
    .filter((f) => f.hasDiscount)
    .sort((a, b) => (b.maxDiscount || 0) - (a.maxDiscount || 0)) // 할인 큰 순
}
