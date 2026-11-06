// 할인 계산 도우미

export const PERIOD_MONTHS = [3, 6, 9, 12, 18, 24]

const todayText = () => new Date().toLocaleDateString('sv-SE') // "2026-11-06"

// 기간권 표 만들기: 정가 합계, 할인가, 월 환산 금액
export function buildPeriodRows(pricing) {
  if (!pricing) return []
  const monthly = Number(pricing.monthly_price) || 0
  const rates = pricing.period_rates || {}
  return PERIOD_MONTHS
    .filter((m) => Number(rates[m]) > 0)
    .map((months) => {
      const rate = Number(rates[months])
      const list = monthly * months
      const price = Math.round((list * (100 - rate)) / 100 / 10) * 10 // 10원 단위 반올림
      return { months, rate, list, price, perMonth: Math.round(price / months / 10) * 10 }
    })
}

// 지금 쓸 수 있는 쿠폰·카드할인만 (꺼져 있거나 기간이 지난 것 제외)
export function activeDiscounts(discounts = []) {
  const today = todayText()
  return discounts.filter(
    (d) => d.active && (!d.starts_on || d.starts_on <= today) && (!d.ends_on || d.ends_on >= today),
  )
}

// "10%" 또는 "5,000원"
export function discountText(d) {
  return d.rate ? `${Number(d.rate)}%` : `${Number(d.amount).toLocaleString()}원`
}

// 카드에 보여 줄 "최대 OO% 할인" (없으면 null)
export function maxDiscountRate(pricing, discounts) {
  const rates = [
    ...Object.values(pricing?.period_rates || {}).map(Number),
    ...activeDiscounts(discounts).filter((d) => d.rate).map((d) => Number(d.rate)),
  ].filter((r) => r > 0)
  return rates.length ? Math.max(...rates) : null
}

export function hasAnyDiscount(pricing, discounts) {
  return buildPeriodRows(pricing).length > 0 || activeDiscounts(discounts).length > 0
}
