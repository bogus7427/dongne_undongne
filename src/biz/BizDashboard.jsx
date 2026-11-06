import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDb } from '../lib/dbContext.js'
import { useAuth } from '../hooks/authContext.js'
import { toKoreanError } from '../lib/supabase.js'
import { STATUS_LABEL } from '../data/status.js'
import Notice from '../components/Notice.jsx'

const today = () => new Date().toLocaleDateString('sv-SE')

// 시설자 모드 첫 화면: 내 시설마다 오늘의 숫자 요약
export default function BizDashboard() {
  const { db, isDemo, base } = useDb()
  const { user } = useAuth()
  const [state, setState] = useState({ loaded: false, items: [], error: '' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      const query = db.from('facilities').select('*')
      const { data: facilities, error } = await (isDemo ? query : query.eq('owner_id', user?.id))
        .order('created_at', { ascending: false })
      if (error) throw error

      const date = today()
      const month = date.slice(0, 7)
      // 시설마다 회원·오늘 출석·이번 달 납부를 불러와서 숫자 계산
      return Promise.all((facilities || []).map(async (f) => {
        const [members, attendance, payments] = await Promise.all([
          db.from('members').select('id, status').eq('facility_id', f.id),
          db.from('attendance').select('member_id').eq('facility_id', f.id).eq('date', date),
          db.from('payments').select('member_id').eq('facility_id', f.id).eq('month', month),
        ])
        const active = (members.data || []).filter((m) => m.status === 'active')
        const paid = new Set((payments.data || []).map((p) => p.member_id))
        return {
          ...f,
          activeCount: active.length,
          todayCount: (attendance.data || []).length,
          unpaidCount: active.filter((m) => !paid.has(m.id)).length,
        }
      }))
    }
    load()
      .then((items) => { if (!cancelled) setState({ loaded: true, items, error: '' }) })
      .catch((err) => { if (!cancelled) setState({ loaded: true, items: [], error: toKoreanError(err) }) })
    return () => { cancelled = true }
  }, [db, isDemo, user?.id])

  return (
    <section>
      <div className="biz-page-head">
        <div>
          <p className="eyebrow">DASHBOARD</p>
          <h1 className="biz-title">오늘의 시설 현황</h1>
          <p className="muted">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
        </div>
        <Link to={`${base}/facilities/new`} className="btn btn-dark">＋ 시설 등록</Link>
      </div>

      {!state.loaded && <Notice>⏳ 불러오는 중...</Notice>}
      {state.error && <Notice type="error">{state.error}</Notice>}
      {state.loaded && !state.error && state.items.length === 0 && (
        <Notice>아직 등록한 시설이 없어요. <Link to={`${base}/facilities/new`}>첫 시설 등록하기 →</Link></Notice>
      )}

      {state.items.map((f) => (
        <div key={f.id} className="card biz-facility-card">
          <div className="facility-card-top">
            <h2>{f.name}</h2>
            {STATUS_LABEL[f.status] && (
              <span className={`status-badge ${STATUS_LABEL[f.status].className}`}>{STATUS_LABEL[f.status].text}</span>
            )}
          </div>
          {f.status === 'rejected' && f.reject_reason && <Notice type="error">반려 사유: {f.reject_reason}</Notice>}
          {f.status === 'pending' && <p className="muted small-text">승인 전이에요. 회원관리는 지금 바로 쓸 수 있고, 승인되면 "시설 찾기"에 공개돼요.</p>}

          <div className="biz-stats">
            <Link to={`${base}/facilities/${f.id}/members`} className="biz-stat">
              <span>수강 중 회원</span><strong>{f.activeCount}<small>명</small></strong>
            </Link>
            <Link to={`${base}/facilities/${f.id}/members?tab=attendance`} className="biz-stat">
              <span>오늘 출석</span><strong>{f.todayCount}<small> / {f.activeCount}</small></strong>
            </Link>
            <Link to={`${base}/facilities/${f.id}/members?tab=payments`} className={`biz-stat ${f.unpaidCount ? 'warn' : ''}`}>
              <span>이번 달 미납</span><strong>{f.unpaidCount}<small>명</small></strong>
            </Link>
          </div>

          <div className="link-buttons">
            <Link to={`${base}/facilities/${f.id}/members`} className="btn btn-sm btn-dark">👥 회원 관리</Link>
            <Link to={`${base}/facilities/${f.id}/discounts`} className="btn btn-sm">💸 할인 제도</Link>
            <Link to={`${base}/facilities/${f.id}/edit`} className="btn btn-sm">✏️ 시설 정보</Link>
            {!isDemo && <Link to={`/place/${f.id}`} className="btn btn-sm">미리보기 ↗</Link>}
          </div>
        </div>
      ))}
    </section>
  )
}
