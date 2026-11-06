import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import sports from '../data/sports.json'
import { fetchRegisteredById } from '../utils/registered.js'
import KakaoMap from '../components/KakaoMap.jsx'
import Notice from '../components/Notice.jsx'
import FacilityLinks from '../components/FacilityLinks.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import DiscountSection from '../components/DiscountSection.jsx'
import { useAuth } from '../hooks/authContext.js'

// 업체가 직접 등록한 시설 상세 (/place/:placeId)
export default function PlaceDetailPage() {
  const { placeId } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState({ key: '', facility: null, error: '' })
  const { user } = useAuth()
  const userId = user?.id || 'guest' // 로그인·로그아웃하면 할인 정보를 다시 불러와요

  useEffect(() => {
    let cancelled = false
    fetchRegisteredById(placeId)
      .then((facility) => { if (!cancelled) setState({ key: `${placeId}|${userId}`, facility, error: '' }) })
      .catch((err) => { if (!cancelled) setState({ key: `${placeId}|${userId}`, facility: null, error: err.message }) })
    return () => { cancelled = true }
  }, [placeId, userId])

  const facility = state.facility
  const mapItems = useMemo(() => (facility?.lat ? [facility] : []), [facility])

  if (state.key !== `${placeId}|${userId}`) return <Notice>⏳ 시설 정보를 불러오는 중이에요...</Notice>
  if (state.error) return <Notice type="error">⚠️ {state.error}</Notice>
  if (!facility) return <Notice type="error">시설을 찾을 수 없어요. <Link to="/search">시설 찾기로</Link></Notice>

  const sportList = facility.sportIds.map((id) => sports.find((s) => s.id === id)).filter(Boolean)

  return (
    <article className="facility-detail">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>← 목록으로</button>
      <p className="eyebrow">REGISTERED PLACE</p>
      <div className="detail-title-row">
        <h1 className="section-title">{facility.name}</h1>
        {facility.status === 'approved' && <FavoriteButton facility={facility} withText />}
      </div>
      {facility.status !== 'approved' && (
        <Notice type="warn">아직 공개되지 않은 시설이에요. (상태: {facility.status === 'pending' ? '승인 대기' : '반려'})</Notice>
      )}

      <div className="facility-detail-grid">
        {mapItems.length ? (
          <KakaoMap facilities={mapItems} height={360} />
        ) : (
          <div className="map-placeholder small">📍 위치 좌표가 아직 없어요.</div>
        )}
        <div className="card">
          <dl className="info-list">
            <dt>주소</dt><dd>{facility.address}</dd>
            <dt>연락처</dt>
            <dd>{facility.phone ? <a href={`tel:${facility.phone}`}>{facility.phone}</a> : '정보 없음'}</dd>
            <dt>주종목</dt><dd>{facility.mainEvent || '정보 없음'}</dd>
          </dl>
          {facility.description && <p className="place-desc">{facility.description}</p>}
          {sportList.length > 0 && (
            <>
              <h2 className="sub-title">할 수 있는 운동</h2>
              <div className="chips">
                {sportList.map((s) => (
                  <Link key={s.id} to={`/sports/${s.id}`} className="chip chip-link">{s.emoji} {s.name}</Link>
                ))}
              </div>
            </>
          )}
          <h2 className="sub-title">더 알아보기</h2>
          <FacilityLinks facility={facility} />
        </div>
      </div>

      <DiscountSection pricing={facility.pricing} discounts={facility.discounts}
        locked={facility.discountLocked} counts={facility.discountCounts} />

      <div className="data-source">
        <p>이 정보는 시설업체가 직접 등록하고 관리자가 확인한 내용이에요.</p>
        <p>⚠️ 운영 시간·강좌는 링크된 공식 정보에서 꼭 확인하세요.</p>
      </div>
    </article>
  )
}
