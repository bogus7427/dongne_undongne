import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { REGIONS, SIDO_LIST } from '../data/regions.js'
import supports from '../data/supports.json'
import { fetchDiscountedFacilities } from '../utils/registered.js'
import { useAuth } from '../hooks/authContext.js'
import { supabase } from '../lib/supabase.js'
import FacilityCard from '../components/FacilityCard.jsx'
import ExternalLink from '../components/ExternalLink.jsx'
import Notice from '../components/Notice.jsx'

// 💸 할인제도 모아보기 (/discounts)
// 1) 시설 할인: 등록 업체의 기간권·쿠폰·카드할인
// 2) 나라에서 받는 할인: 이용권·소득공제 등 (지원 제도 중 "비용 지원")
export default function DiscountsHubPage() {
  const [params, setParams] = useSearchParams()
  const sido = params.get('sido') || ''
  const sigungu = params.get('sigungu') || ''
  const { user } = useAuth()
  const userId = user?.id || 'guest'

  const key = `${sido}|${sigungu}|${userId}`
  const [state, setState] = useState({ key: '', items: [], error: '' })
  useEffect(() => {
    let cancelled = false
    fetchDiscountedFacilities(sido, sigungu)
      .then((items) => { if (!cancelled) setState({ key, items, error: '' }) })
      .catch((err) => { if (!cancelled) setState({ key, items: [], error: err.message }) })
    return () => { cancelled = true }
  }, [key, sido, sigungu])

  const moneySupports = supports.filter((s) => s.category === 'money')

  function setRegion(changes) {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next)
  }

  return (
    <section>
      <p className="eyebrow">DISCOUNTS</p>
      <h1 className="section-title">💸 할인제도 모아보기</h1>
      <p className="section-desc">우리 동네 시설의 할인과, 나라에서 받을 수 있는 운동비 할인을 한곳에 모았어요.</p>

      {/* 할인 종류 안내 */}
      <div className="discount-kinds">
        <div><span>🗓️</span><strong>기간권 할인</strong><small>3·6·9·12·18·24개월 등록 시 할인율</small></div>
        <div><span>🎟️</span><strong>할인쿠폰</strong><small>신규회원·이벤트 쿠폰</small></div>
        <div><span>💳</span><strong>카드할인</strong><small>카드사별 결제 할인</small></div>
        <div><span>🏛️</span><strong>나라 지원</strong><small>이용권·소득공제</small></div>
      </div>

      {/* 1. 시설 할인 */}
      <section className="detail-block">
        <h2>🏢 할인 중인 시설</h2>
        <div className="control-row discount-filter">
          <select value={sido} onChange={(e) => setRegion({ sido: e.target.value, sigungu: '' })} aria-label="시/도">
            <option value="">전국</option>
            {SIDO_LIST.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={sigungu} onChange={(e) => setRegion({ sigungu: e.target.value })} disabled={!sido} aria-label="시/군/구">
            <option value="">전체 시/군/구</option>
            {(REGIONS[sido] || []).map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>

        {!user && supabase && (
          <Notice>
            🔒 할인율·쿠폰 코드는 <strong>회원만</strong> 볼 수 있어요.{' '}
            <Link to="/signup?next=/discounts">무료 회원가입</Link> · <Link to="/login?next=/discounts">로그인</Link>
          </Notice>
        )}
        {!supabase ? (
          <Notice type="warn">시설 할인은 회원 기능(Supabase) 설정 후에 보여요.</Notice>
        ) : state.key !== key ? (
          <Notice>⏳ 할인 정보를 불러오는 중이에요...</Notice>
        ) : state.error ? (
          <Notice type="error">⚠️ {state.error}</Notice>
        ) : state.items.length === 0 ? (
          <Notice>
            아직 이 지역에 할인을 등록한 시설이 없어요.
            {' '}<Link to="/signup?type=owner">시설을 운영하시나요? 할인 등록하기 →</Link>
          </Notice>
        ) : (
          <div className="facility-list grid-2">
            {state.items.map((f) => <FacilityCard key={f.id} facility={f} />)}
          </div>
        )}
      </section>

      {/* 2. 나라에서 받는 할인 */}
      <section className="detail-block">
        <h2>🏛️ 나라에서 받는 운동비 할인</h2>
        <div className="support-list">
          {moneySupports.map((s) => (
            <article key={s.id} className="card support-card">
              <div className="support-head">
                <span className="support-emoji">{s.emoji}</span>
                <div>
                  <h3>{s.name}</h3>
                  <p className="muted small-text">{s.target}</p>
                </div>
              </div>
              <p>{s.summary}</p>
              <div className="link-buttons">
                {s.links.slice(0, 1).map((l) => (
                  <ExternalLink key={l.href} href={l.href} className="btn btn-sm btn-dark">{l.label} ↗</ExternalLink>
                ))}
                <Link to="/supports" className="btn btn-sm">자세히 →</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Notice type="warn">
        할인 내용은 시설이 직접 등록한 정보이거나 공식 안내를 요약한 것이에요. 결제·신청 전에 꼭 확인하세요.
      </Notice>
    </section>
  )
}
