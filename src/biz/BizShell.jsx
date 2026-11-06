import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDb } from '../lib/dbContext.js'
import { useAuth } from '../hooks/authContext.js'
import { resetDemo } from '../lib/demoDb.js'

// 시설자 모드 화면 틀: 위쪽 바 + 왼쪽 메뉴(내 시설별) + 본문
// bare = true 이면 메뉴 없이 가운데 본문만 (로그인 화면 등)
export default function BizShell({ bare = false, children }) {
  const { db, isDemo, base } = useDb()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const facilityId = location.pathname.match(/facilities\/([^/]+)/)?.[1]
  const [facilities, setFacilities] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)

  // 왼쪽 메뉴에 보여 줄 내 시설 목록
  useEffect(() => {
    if (bare || !db) return
    let cancelled = false
    const query = db.from('facilities').select('id, name, status')
    const scoped = isDemo ? query : query.eq('owner_id', user?.id)
    scoped.order('created_at', { ascending: true }).then(({ data }) => {
      if (!cancelled) setFacilities(data || [])
    })
    return () => { cancelled = true }
  }, [bare, db, isDemo, user?.id, facilityId])

  async function handleLogout() {
    await signOut()
    navigate('/biz/login')
  }

  function handleReset() {
    if (!window.confirm('체험판 데이터를 처음 상태로 되돌릴까요?')) return
    resetDemo()
    window.location.reload()
  }

  return (
    <div className="biz">
      <header className="biz-top">
        <button type="button" className="biz-menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="메뉴">☰</button>
        <Link to={bare ? '/biz' : base} className="biz-logo">
          <span>DONGNE</span> <strong>BIZ</strong>
          <small>시설자 모드{isDemo ? ' · 체험판' : ''}</small>
        </Link>
        <div className="biz-top-right">
          {isDemo && <button type="button" className="biz-link" onClick={handleReset}>↺ 체험판 초기화</button>}
          {!isDemo && user && <span className="biz-user">{user.email}</span>}
          <Link to="/" className="biz-link">🏠 일반 사이트</Link>
          {isDemo
            ? <Link to="/signup?type=owner&next=/biz" className="biz-cta">진짜로 시작하기</Link>
            : user && <button type="button" className="biz-link" onClick={handleLogout}>로그아웃</button>}
        </div>
      </header>

      {isDemo && (
        <div className="biz-demo-note">🧪 체험판이에요. 예시 데이터는 이 브라우저에만 저장되고 다른 사람에게 보이지 않아요.</div>
      )}

      {bare ? (
        <main className="biz-bare">{children}</main>
      ) : (
        <div className="biz-body">
          <aside className={`biz-side ${menuOpen ? 'is-open' : ''}`} onClick={() => setMenuOpen(false)}>
            <NavLink to={base} end className="biz-nav">📊 대시보드</NavLink>
            <p className="biz-side-title">내 시설</p>
            {facilities.length === 0 && <p className="biz-side-empty">등록한 시설이 없어요</p>}
            {facilities.map((f) => (
              <div key={f.id} className={`biz-facility ${String(facilityId) === String(f.id) ? 'is-current' : ''}`}>
                <strong>{f.name}</strong>
                <NavLink to={`${base}/facilities/${f.id}/members`} className="biz-nav sub">👥 회원·출석·수강료</NavLink>
                <NavLink to={`${base}/facilities/${f.id}/discounts`} className="biz-nav sub">💸 할인 제도</NavLink>
                <NavLink to={`${base}/facilities/${f.id}/edit`} className="biz-nav sub">✏️ 시설 정보</NavLink>
              </div>
            ))}
            <NavLink to={`${base}/facilities/new`} className="biz-nav add">＋ 새 시설 등록</NavLink>
          </aside>
          <main className="biz-main">
            <Outlet />
          </main>
        </div>
      )}
    </div>
  )
}
