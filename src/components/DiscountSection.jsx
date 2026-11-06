import { Link, useLocation } from 'react-router-dom'
import { activeDiscounts, buildPeriodRows, discountText } from '../utils/discounts.js'

const won = (n) => `${Number(n).toLocaleString()}원`

// 시설 상세의 "할인 혜택" 영역 (기간권 / 할인쿠폰 / 카드할인)
// locked = true 이면 로그인 안 한 사용자: 할인 "틀"만 보여 주고 내용은 가려요.
export default function DiscountSection({ pricing, discounts, locked = false, counts }) {
  if (locked) return <LockedDiscounts counts={counts} />

  const periods = buildPeriodRows(pricing)
  const list = activeDiscounts(discounts)
  const coupons = list.filter((d) => d.kind === 'coupon')
  const cards = list.filter((d) => d.kind === 'card')

  if (!periods.length && !list.length) return null

  return (
    <section className="detail-block discount-section">
      <h2>💸 할인 혜택</h2>

      {periods.length > 0 && (
        <div className="card">
          <h3 className="discount-title">🗓️ 기간권 할인 <small className="muted">1개월 정가 {won(pricing.monthly_price)}</small></h3>
          <div className="table-wrap">
            <table className="data-table period-table">
              <thead><tr><th>기간</th><th>할인율</th><th>정가</th><th>할인가</th><th>월 환산</th></tr></thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.months}>
                    <td><strong>{p.months}개월</strong></td>
                    <td><span className="rate-badge">{p.rate}%</span></td>
                    <td className="muted"><s>{won(p.list)}</s></td>
                    <td><strong>{won(p.price)}</strong></td>
                    <td>{won(p.perMonth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pricing.note && <p className="muted small-text pre-line">{pricing.note}</p>}
        </div>
      )}

      {(coupons.length > 0 || cards.length > 0) && (
        <div className="discount-grid">
          {coupons.map((d) => (
            <div key={d.id} className="coupon">
              <div className="coupon-value">{discountText(d)}</div>
              <div className="coupon-body">
                <span className="coupon-kind">🎟️ 할인쿠폰</span>
                <strong>{d.title}</strong>
                {d.code && <span className="coupon-code">코드 <code>{d.code}</code></span>}
                {d.condition && <small>{d.condition}</small>}
                {d.ends_on && <small className="muted">~ {d.ends_on}까지</small>}
              </div>
            </div>
          ))}
          {cards.map((d) => (
            <div key={d.id} className="coupon coupon-card">
              <div className="coupon-value">{discountText(d)}</div>
              <div className="coupon-body">
                <span className="coupon-kind">💳 카드할인{d.card_name ? ` · ${d.card_name}` : ''}</span>
                <strong>{d.title}</strong>
                {d.condition && <small>{d.condition}</small>}
                {d.ends_on && <small className="muted">~ {d.ends_on}까지</small>}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="muted small-text">할인 내용은 시설이 직접 등록한 정보예요. 결제 전에 시설에 꼭 확인하세요.</p>
    </section>
  )
}

// 로그인 전: 어떤 할인이 몇 개 있는지만 + 가입/로그인 버튼
function LockedDiscounts({ counts = {} }) {
  const location = useLocation()
  const next = encodeURIComponent(location.pathname + location.search)
  const items = [
    ['🗓️', '기간권 할인', counts.period, '개월 수별 할인율'],
    ['🎟️', '할인쿠폰', counts.coupon, '쿠폰 코드와 할인 금액'],
    ['💳', '카드할인', counts.card, '카드사별 할인'],
  ].filter(([, , n]) => n > 0)

  return (
    <section className="detail-block discount-section">
      <h2>💸 할인 혜택</h2>
      <div className="locked-box">
        <div className="locked-items">
          {items.map(([icon, name, n, desc]) => (
            <div key={name} className="locked-item">
              <span className="locked-icon">{icon}</span>
              <div>
                <strong>{name} {n}개</strong>
                <span className="blur-text">{desc} ●●%</span>
              </div>
            </div>
          ))}
        </div>
        <div className="locked-message">
          <p>🔒 <strong>할인 내용은 회원만 볼 수 있어요.</strong><br />가입하면 할인율·쿠폰 코드·카드 혜택을 확인할 수 있어요.</p>
          <div className="link-buttons">
            <Link to={`/signup?next=${next}`} className="btn btn-dark btn-sm">무료 회원가입</Link>
            <Link to={`/login?next=${next}`} className="btn btn-sm">로그인</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
