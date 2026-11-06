import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, toKoreanError } from '../../lib/supabase.js'
import { STATUS_LABEL } from '../../data/status.js'
import Notice from '../../components/Notice.jsx'

// 관리자: 업체가 등록한 시설 승인·반려
export default function AdminPage() {
  const [status, setStatus] = useState('pending')
  const [state, setState] = useState({ key: '', items: [], error: '' })

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('facilities')
      .select('*, owner:profiles(name, email, phone)')
      .eq('status', status).order('updated_at', { ascending: false }).limit(200)
    setState({ key: status, items: data || [], error: error ? toKoreanError(error) : '' })
  }, [status])

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => { if (!cancelled) load() })
    return () => { cancelled = true }
  }, [load])

  async function decide(f, nextStatus) {
    let reason = ''
    if (nextStatus === 'rejected') {
      reason = window.prompt('반려 사유를 적어 주세요. (업체에게 보여요)', '주소 또는 연락처를 확인할 수 없어요.')
      if (reason === null) return
    }
    const { error } = await supabase.from('facilities').update({ status: nextStatus, reject_reason: reason }).eq('id', f.id)
    if (error) setState((s) => ({ ...s, error: toKoreanError(error) }))
    else load()
  }

  return (
    <section>
      <p className="eyebrow">ADMIN</p>
      <h1 className="section-title">등록 시설 승인 관리</h1>

      <div className="type-tabs" role="tablist">
        {Object.entries(STATUS_LABEL).map(([key, { text }]) => (
          <button key={key} role="tab" aria-selected={status === key} className={status === key ? 'is-active' : ''} onClick={() => setStatus(key)}>
            {text}
          </button>
        ))}
      </div>

      {state.key !== status && <Notice>⏳ 불러오는 중...</Notice>}
      {state.error && <Notice type="error">{state.error}</Notice>}
      {state.key === status && !state.error && state.items.length === 0 && <Notice>해당하는 시설이 없어요.</Notice>}

      <div className="facility-list">
        {state.items.map((f) => (
          <div key={f.id} className="card admin-card">
            <div className="facility-card-top">
              <span className="region-badge">{f.sido} {f.sigungu}</span>
              <span className="muted small-text">{new Date(f.updated_at).toLocaleString('ko-KR')}</span>
            </div>
            <h3 className="facility-name">{f.name} <small className="muted">· {f.main_event}</small></h3>
            <dl className="info-list">
              <dt>주소</dt><dd>{f.address} {f.lat ? '📍' : <span className="muted">(좌표 없음)</span>}</dd>
              <dt>연락처</dt><dd>{f.phone || '-'}</dd>
              <dt>홈페이지</dt><dd>{f.homepage || '-'}</dd>
              <dt>신청자</dt><dd>{f.owner?.name} ({f.owner?.email}) {f.owner?.phone}</dd>
              {f.description && (<><dt>소개</dt><dd className="pre-line">{f.description}</dd></>)}
              {f.reject_reason && (<><dt>반려 사유</dt><dd>{f.reject_reason}</dd></>)}
            </dl>
            <div className="link-buttons">
              {f.status !== 'approved' && <button type="button" className="btn btn-sm btn-dark" onClick={() => decide(f, 'approved')}>✅ 승인(공개)</button>}
              {f.status !== 'rejected' && <button type="button" className="btn btn-sm btn-danger" onClick={() => decide(f, 'rejected')}>반려</button>}
              <Link to={`/place/${f.id}`} className="btn btn-sm">미리보기</Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
