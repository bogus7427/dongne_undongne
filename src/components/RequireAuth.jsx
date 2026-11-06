import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/authContext.js'
import { supabase, SUPABASE_MISSING_MESSAGE } from '../lib/supabase.js'
import Notice from './Notice.jsx'

// 로그인이 필요한 화면을 감싸는 컴포넌트
// role="owner" 면 업체회원만, role="admin" 이면 관리자만 들어올 수 있어요.
export default function RequireAuth({ role, children }) {
  const { ready, user, isOwner, isAdmin } = useAuth()
  const location = useLocation()

  if (!supabase) return <Notice type="warn">{SUPABASE_MISSING_MESSAGE}</Notice>
  if (!ready) return <Notice>⏳ 로그인 정보를 확인하고 있어요...</Notice>
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (role === 'owner' && !isOwner) {
    return <Notice type="warn">시설업체 회원만 쓸 수 있는 메뉴예요. <Link to="/signup?type=owner">업체회원으로 가입하기 →</Link></Notice>
  }
  if (role === 'admin' && !isAdmin) return <Notice type="error">관리자만 볼 수 있는 화면이에요.</Notice>
  return children
}
