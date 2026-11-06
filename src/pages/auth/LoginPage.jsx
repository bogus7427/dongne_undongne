import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, SUPABASE_MISSING_MESSAGE, toKoreanError } from '../../lib/supabase.js'
import { useAuth } from '../../hooks/authContext.js'
import Notice from '../../components/Notice.jsx'

export default function LoginPage() {
  const [params] = useSearchParams()
  // 로그인 후 돌아갈 곳 (우리 사이트 안의 주소만 허용)
  const rawNext = params.get('next') || '/mypage'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/mypage'
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
      <p className="eyebrow">LOGIN</p>
      <h1 className="section-title">로그인</h1>
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
        아직 회원이 아니신가요? <Link to="/signup">회원가입</Link>
      </p>
    </section>
  )
}
