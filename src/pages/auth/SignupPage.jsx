import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { supabase, SUPABASE_MISSING_MESSAGE, toKoreanError } from '../../lib/supabase.js'
import { useAuth } from '../../hooks/authContext.js'
import Notice from '../../components/Notice.jsx'

// 회원가입: 개인회원 / 시설업체 회원
export default function SignupPage() {
  const [params] = useSearchParams()
  const { user } = useAuth()
  const rawNext = params.get('next') || ''
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : ''
  const [form, setForm] = useState({
    role: params.get('type') === 'owner' ? 'owner' : 'user',
    name: '', phone: '', email: '', password: '', password2: '', agree: false,
  })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!supabase) return <Notice type="warn">{SUPABASE_MISSING_MESSAGE}</Notice>
  if (user && !done) return <Navigate to={next || '/mypage'} replace />

  const set = (key) => (e) =>
    setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) return setError('비밀번호는 8자 이상으로 만들어 주세요.')
    if (form.password !== form.password2) return setError('비밀번호 확인이 일치하지 않아요.')
    if (!form.agree) return setError('개인정보 수집·이용에 동의해 주세요.')

    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        // 이 값으로 DB의 profiles가 자동 생성돼요. (schema.sql의 handle_new_user)
        data: { name: form.name.trim(), phone: form.phone.trim(), role: form.role },
        emailRedirectTo: `${window.location.origin}/login${next ? `?next=${encodeURIComponent(next)}` : ''}`,
      },
    })
    setBusy(false)
    if (error) return setError(toKoreanError(error))
    // 이메일 인증을 켜 두면 session이 없어요 → 메일 확인 안내
    setDone(data.session ? 'loggedIn' : 'checkEmail')
  }

  if (done) {
    return (
      <section className="auth-box">
        <h1 className="section-title">가입을 환영해요! 🎉</h1>
        {done === 'checkEmail' ? (
          <Notice>📧 <strong>{form.email}</strong>로 인증 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.</Notice>
        ) : (
          <Notice>가입과 로그인이 완료됐어요.</Notice>
        )}
        <div className="link-buttons" style={{ marginTop: 16 }}>
          {next && <Link to={next} className="btn btn-dark">보던 화면으로 돌아가기 →</Link>}
          {form.role === 'owner'
            ? <Link to="/biz/facilities/new" className="btn btn-dark">🏢 시설자 모드에서 시설 등록 →</Link>
            : <Link to="/search" className="btn btn-dark">시설 찾으러 가기 →</Link>}
          <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="btn">로그인</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="auth-box">
      <p className="eyebrow">SIGN UP</p>
      <h1 className="section-title">회원가입</h1>

      {/* 회원 종류 선택 */}
      <div className="role-choice">
        <button type="button" className={form.role === 'user' ? 'is-active' : ''}
          onClick={() => setForm({ ...form, role: 'user' })}>
          <span>🙋</span><strong>개인회원</strong><small>운동할 곳을 찾고 즐겨찾기를 저장해요</small>
        </button>
        <button type="button" className={form.role === 'owner' ? 'is-active' : ''}
          onClick={() => setForm({ ...form, role: 'owner' })}>
          <span>🏢</span><strong>시설업체 회원</strong><small>내 시설을 등록하고 회원을 관리해요</small>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <label>
          {form.role === 'owner' ? '담당자 이름' : '이름'}
          <input required maxLength={30} value={form.name} onChange={set('name')} />
        </label>
        <label>
          연락처 <small className="muted">(선택)</small>
          <input type="tel" maxLength={20} placeholder="010-0000-0000" value={form.phone} onChange={set('phone')} />
        </label>
        <label>
          이메일
          <input type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
        </label>
        <label>
          비밀번호 <small className="muted">(8자 이상)</small>
          <input type="password" required autoComplete="new-password" value={form.password} onChange={set('password')} />
        </label>
        <label>
          비밀번호 확인
          <input type="password" required autoComplete="new-password" value={form.password2} onChange={set('password2')} />
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={form.agree} onChange={set('agree')} />
          <span>
            [필수] 개인정보 수집·이용 동의 — 수집 항목: 이름, 이메일, 연락처(선택) / 목적: 회원 식별, 서비스 제공 /
            보관: 탈퇴 시까지
          </span>
        </label>
        {error && <Notice type="error">{error}</Notice>}
        <button type="submit" className="btn btn-dark btn-block" disabled={busy}>
          {busy ? '가입 중...' : form.role === 'owner' ? '업체회원 가입하기' : '개인회원 가입하기'}
        </button>
      </form>
      <p className="auth-switch">이미 회원이신가요? <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}>로그인</Link></p>
    </section>
  )
}
