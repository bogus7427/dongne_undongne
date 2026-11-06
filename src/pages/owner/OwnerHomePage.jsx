import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, toKoreanError } from '../../lib/supabase.js'
import { useAuth } from '../../hooks/authContext.js'
import { STATUS_LABEL } from '../../data/status.js'
import Notice from '../../components/Notice.jsx'

// 업체회원 홈: 내가 등록한 시설 목록
export default function OwnerHomePage() {
  const { user } = useAuth()
  const [state, setState] = useState({ loaded: false, items: [], error: '' })

  useEffect(() => {
    let cancelled = false
    supabase.from('facilities').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        setState({ loaded: true, items: data || [], error: error ? toKoreanError(error) : '' })
      })
    return () => { cancelled = true }
  }, [user.id])

  return (
    <section>
      <p className="eyebrow">MY FACILITIES</p>
      <div className="detail-title-row">
        <h1 className="section-title">내 시설 관리</h1>
        <Link to="/owner/facilities/new" className="btn btn-dark">+ 시설 등록</Link>
      </div>
      <p className="section-desc">등록한 시설은 관리자 확인 후 "시설 찾기"에 공개돼요. 정보를 고치면 다시 확인을 받아요.</p>

      {!state.loaded && <Notice>⏳ 불러오는 중...</Notice>}
      {state.error && <Notice type="error">{state.error}</Notice>}
      {state.loaded && !state.error && state.items.length === 0 && (
        <Notice>아직 등록한 시설이 없어요. <Link to="/owner/facilities/new">첫 시설 등록하기 →</Link></Notice>
      )}

      <div className="facility-list grid-2">
        {state.items.map((f) => (
          <div key={f.id} className="card owner-card">
            <div className="facility-card-top">
              <span className="region-badge">{f.sido} {f.sigungu}</span>
              <span className={`status-badge ${STATUS_LABEL[f.status].className}`}>{STATUS_LABEL[f.status].text}</span>
            </div>
            <h3 className="facility-name">{f.name}</h3>
            <p className="facility-address">{f.address}</p>
            {f.status === 'rejected' && f.reject_reason && (
              <Notice type="error">반려 사유: {f.reject_reason}</Notice>
            )}
            <div className="link-buttons">
              <Link to={`/owner/facilities/${f.id}/members`} className="btn btn-sm btn-dark">👥 회원 관리</Link>
              <Link to={`/owner/facilities/${f.id}/discounts`} className="btn btn-sm">💸 할인 제도</Link>
              <Link to={`/owner/facilities/${f.id}/edit`} className="btn btn-sm">✏️ 정보 수정</Link>
              <Link to={`/place/${f.id}`} className="btn btn-sm">미리보기</Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
