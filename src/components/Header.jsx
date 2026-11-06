import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/authContext.js'

export default function Header() {
  const { user, isOwner } = useAuth()

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          <span className="logo-en">DONGNE UNDONG</span>
          <span className="logo-ko">동네운동 찾기</span>
        </Link>
        <nav className="nav">
          <NavLink to="/search">시설 찾기</NavLink>
          <NavLink to="/martial" className="hide-mobile">무술</NavLink>
          <NavLink to="/discounts" className="hide-mobile">할인제도</NavLink>
          <NavLink to="/supports" className="hide-mobile">지원 제도</NavLink>
          <NavLink to="/favorites" className="hide-mobile">즐겨찾기</NavLink>
          {isOwner && <NavLink to="/biz">🏢 시설자 모드</NavLink>}
        </nav>
        {user ? (
          <Link to="/mypage" className="btn btn-sm header-account">마이페이지</Link>
        ) : (
          <Link to="/login" className="btn btn-dark btn-sm header-account">로그인</Link>
        )}
      </div>
    </header>
  )
}
