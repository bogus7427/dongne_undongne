import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import sports from '../data/sports.json'
import { fetchFacilities } from '../utils/facilities.js'
import KakaoMap from '../components/KakaoMap.jsx'
import Notice from '../components/Notice.jsx'
import DataSource from '../components/DataSource.jsx'
import FacilityLinks from '../components/FacilityLinks.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'

export default function FacilityDetailPage() {
  // 주소 예: /facility/abc123?sido=서울특별시&sigungu=강남구
  const { facilityId } = useParams()
  const [params] = useSearchParams()
  const sido = params.get('sido') || ''
  const sigungu = params.get('sigungu') || ''
  const navigate = useNavigate()

  const requestKey = sido && sigungu ? `${sido}|${sigungu}` : ''
  const [data, setData] = useState({ key: '', items: [], error: '' })
  const loading = requestKey !== '' && data.key !== requestKey

  // 그 지역 목록을 불러와서(대부분 캐시에 있음) id로 시설을 찾아요.
  useEffect(() => {
    if (!requestKey) return
    let cancelled = false
    fetchFacilities(sido, sigungu)
      .then((items) => { if (!cancelled) setData({ key: requestKey, items, error: '' }) })
      .catch((err) => { if (!cancelled) setData({ key: requestKey, items: [], error: err.message }) })
    return () => { cancelled = true }
  }, [requestKey, sido, sigungu])

  const facility = data.items.find((f) => f.id === facilityId)
  const mapItems = useMemo(() => (facility ? [facility] : []), [facility])

  if (loading) return <Notice>⏳ 시설 정보를 불러오는 중이에요...</Notice>
  if (data.error) return <Notice type="error">⚠️ {data.error}</Notice>
  if (!facility) {
    return (
      <Notice type="error">
        시설 정보를 찾을 수 없어요. <Link to="/search">시설 찾기로 돌아가기</Link>
      </Notice>
    )
  }

  const sportList = facility.sportIds
    .map((id) => sports.find((s) => s.id === id))
    .filter(Boolean)

  return (
    <article className="facility-detail">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>← 목록으로</button>

      <p className="eyebrow">FACILITY</p>
      <div className="detail-title-row">
        <h1 className="section-title">{facility.name}</h1>
        <FavoriteButton facility={facility} withText />
      </div>

      <div className="facility-detail-grid">
        {facility.lat && facility.lng ? (
          <KakaoMap facilities={mapItems} height={360} />
        ) : (
          <div className="map-placeholder small">📍 이 시설은 좌표 정보가 없어 지도에 표시할 수 없어요.</div>
        )}

        <div className="card">
          <dl className="info-list">
            <dt>주소</dt>
            <dd>{facility.address || '정보 없음'}</dd>
            <dt>연락처</dt>
            <dd>
              {facility.phone
                ? <a href={`tel:${facility.phone}`}>{facility.phone}</a>
                : '정보 없음'}
            </dd>
            <dt>시설 유형</dt>
            <dd>{facility.facilityType || '정보 없음'}</dd>
            {facility.manager && (
              <>
                <dt>담당 부서</dt>
                <dd>{facility.manager}</dd>
              </>
            )}
          </dl>

          <h2 className="sub-title">할 수 있는 운동</h2>
          <div className="chips">
            {sportList.length === 0 && <span className="muted">8개 종목과 연결된 정보가 없어요 ({facility.facilityType})</span>}
            {sportList.map((s) => (
              <Link key={s.id} to={`/sports/${s.id}`} className="chip chip-link">
                {s.emoji} {s.name}
              </Link>
            ))}
          </div>

          <h2 className="sub-title">더 알아보기</h2>
          <FacilityLinks facility={facility} />
        </div>
      </div>

      <DataSource />
    </article>
  )
}
