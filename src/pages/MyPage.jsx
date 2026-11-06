import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/authContext.js'
import { useFavorites } from '../hooks/useFavorites.js'
import { supabase, toKoreanError } from '../lib/supabase.js'
import Notice from '../components/Notice.jsx'

const ROLE_NAME = { user: '개인회원', owner: '시설업체 회원', admin: '관리자' }

export default function MyPage() {
  const { user, profile, isOwner, isAdmin, signOut } = useAuth()
  const { favorites } = useFavorites()
  const [form, setForm] = useState({ name: profile?.name || '', phone: profile?.phone || '' })
  const [message, setMessage] = useState(null)

  async function save(e) {
    e.preventDefault()
    const { error } = await supabase.from('profiles')
      .update({ name: form.name.trim(), phone: form.phone.trim() })
      .eq('id', user.id)
    setMessage(error ? { type: 'error', text: toKoreanError(error) } : { type: 'info', text: '저장했어요. ✅' })
  }

  return (
    <section>
      <p className="eyebrow">MY PAGE</p>
      <h1 className="section-title">마이페이지</h1>

      <div className="info-grid">
        <div className="card">
          <h2>👤 내 정보</h2>
          <p className="muted">{user.email} · <strong>{ROLE_NAME[profile?.role] || '회원'}</strong></p>
          <form onSubmit={save} className="form">
            <label>이름<input required maxLength={30} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>연락처<input type="tel" maxLength={20} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            {message && <Notice type={message.type}>{message.text}</Notice>}
            <div className="link-buttons">
              <button type="submit" className="btn btn-dark btn-sm">저장</button>
              <button type="button" className="btn btn-sm" onClick={signOut}>로그아웃</button>
            </div>
          </form>
        </div>

        <div className="card">
          <h2>⚡ 바로가기</h2>
          <div className="quick-links">
            <Link to="/favorites" className="btn btn-sm">♥ 즐겨찾기 ({favorites.length})</Link>
            <Link to="/search" className="btn btn-sm">🔍 시설 찾기</Link>
            {isOwner && <Link to="/owner" className="btn btn-sm btn-dark">🏢 내 시설·회원 관리</Link>}
            {isAdmin && <Link to="/admin" className="btn btn-sm btn-dark">🛡️ 관리자: 시설 승인</Link>}
          </div>
          {!isOwner && (
            <p className="muted small-text">
              시설을 운영하시나요? 업체회원은 시설 등록과 회원 관리를 할 수 있어요.
              (회원 종류 변경은 관리자에게 문의해 주세요)
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
