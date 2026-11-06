import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, SUPABASE_MISSING_MESSAGE, toKoreanError } from '../../lib/supabase.js'
import { useAuth } from '../../hooks/authContext.js'
import Notice from '../../components/Notice.jsx'

export default function LoginPage({ defaultNext = '/mypage', ownerMode = false }) {
  const [params] = useSearchParams()
  // 로그인 후 돌아갈 곳 (우리 사이트 안의 주소만 허용)
  const rawNext = params.get('next') || defaultNext
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : defaultNext
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!supabase) return <Notice type="warn">{SUPABASE_MISSING_MESSAGE}</Notice>
  if (user) return <Navigate to={next} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword(form)
    setBusy(false)
    if (error) setError(toKoreanError(error))
    else navigate(next, { replace: true })
  }

  return (
    <section className="auth-box">
      <p className="eyebrow">{ownerMode ? 'BIZ LOGIN' : 'LOGIN'}</p>
      <h1 className="section-title">{ownerMode ? '🏢 시설자 로그인' : '로그인'}</h1>
      {ownerMode && <p className="muted">체육시설 업체회원 전용이에요. 회원·출석·수강료·할인을 관리해요.</p>}
      <form onSubmit={handleSubmit} className="form">
        <label>
          이메일
          <input type="email" required autoComplete="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>
          비밀번호
          <input type="password" required autoComplete="current-password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        {error && <Notice type="error">{error}</Notice>}
        <button type="submit" className="btn btn-dark btn-block" disabled={busy}>
          {busy ? '로그인 중...' : '로그인'}
        </button>
      </form>
      <p className="auth-switch">
        아직 회원이 아니신가요? <Link to={ownerMode ? '/signup?type=owner&next=/biz' : '/signup'}>{ownerMode ? '업체회원 가입' : '회원가입'}</Link>
        {ownerMode && <> · <Link to="/biz/demo">가입 없이 체험해 보기</Link></>}
      </p>
    </section>
  )
}
