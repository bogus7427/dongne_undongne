import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import banners from '../data/banners.json'
import ExternalLink from './ExternalLink.jsx'

const TYPE_LABEL = { info: '스포츠 정보', martial: '무술', gear: '용품' }

// 모든 페이지 위쪽: [🏠 홈] [← 뒤로] [💸 할인제도]
// + 오른쪽에 스크롤을 따라 움직이는 "추천 사이트" 배너
export default function SubNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/'

  // 앱 안에서 이동한 적이 있으면 뒤로, 바로 들어온 경우엔 홈으로
  function goBack() {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/')
  }

  return (
    <>
      <div className="subnav">
        <div className="container subnav-inner">
          {!isHome && (
            <>
              <Link to="/" className="subnav-btn" aria-label="홈으로">🏠 홈</Link>
              <button type="button" className="subnav-btn" onClick={goBack} aria-label="뒤로 가기">← 뒤로</button>
            </>
          )}
          <NavLink to="/discounts" className="subnav-btn subnav-discount">💸 할인제도</NavLink>
          <NavLink to="/supports" className="subnav-btn">🎁 지원 제도</NavLink>
          <NavLink to="/martial" className="subnav-btn hide-mobile">🥋 무술</NavLink>
        </div>
      </div>
      <SideBanner />
    </>
  )
}

// 오른쪽 고정 배너 (position: fixed → 스크롤해도 화면 오른쪽에 계속 떠 있어요)
// 화면이 좁으면 오른쪽 아래 버튼으로 열고 닫아요.
function SideBanner() {
  const [open, setOpen] = useState(false)
  const groups = Object.keys(TYPE_LABEL).map((type) => ({ type, items: banners.filter((b) => b.type === type) }))

  return (
    <>
      <aside className={`side-banner ${open ? 'is-open' : ''}`} aria-label="추천 사이트">
        <div className="side-banner-head">
          <strong>🔗 추천 사이트</strong>
          <button type="button" className="side-banner-close" onClick={() => setOpen(false)} aria-label="닫기">✕</button>
        </div>
        {groups.map(({ type, items }) => (
          <div key={type} className="side-banner-group">
            <p className={`banner-type banner-${type}`}>{TYPE_LABEL[type]}</p>
            {items.map((b) => (
              <ExternalLink key={b.id} href={b.href} className="side-banner-item">
                <span className="banner-icon">{b.icon}</span>
                <span>
                  <strong>{b.label}</strong>
                  <small>{b.text}</small>
                </span>
              </ExternalLink>
            ))}
          </div>
        ))}
        <p className="side-banner-note">외부 사이트로 연결돼요 ↗</p>
      </aside>
      <button type="button" className="side-banner-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        🔗 추천 사이트
      </button>
    </>
  )
}
