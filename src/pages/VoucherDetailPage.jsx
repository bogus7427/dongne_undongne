import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import sports from '../data/sports.json'
import { fetchVoucherCourses, fetchVouchers, geocodeAddress } from '../utils/facilities.js'
import KakaoMap from '../components/KakaoMap.jsx'
import Notice from '../components/Notice.jsx'
import DataSource from '../components/DataSource.jsx'
import FacilityLinks from '../components/FacilityLinks.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import ExternalLink from '../components/ExternalLink.jsx'

// 스포츠강좌이용권 등록시설 상세: 시설 정보 + 등록 강좌 목록
// 주소 예: /voucher/1234567890-1?sido=경기도&sigungu=수원시
export default function VoucherDetailPage() {
  const { voucherId } = useParams()
  const [params] = useSearchParams()
  const sido = params.get('sido') || ''
  const sigungu = params.get('sigungu') || ''
  const navigate = useNavigate()

  // 1) 시설 정보 (그 지역 목록에서 찾기 - 대부분 캐시에 있음)
  const listKey = sido && sigungu ? `${sido}|${sigungu}` : ''
  const [list, setList] = useState({ key: '', items: [], error: '' })
  useEffect(() => {
    if (!listKey) return
    let cancelled = false
    fetchVouchers(sido, sigungu)
      .then((items) => { if (!cancelled) setList({ key: listKey, items, error: '' }) })
      .catch((err) => { if (!cancelled) setList({ key: listKey, items: [], error: err.message }) })
    return () => { cancelled = true }
  }, [listKey, sido, sigungu])
  const facility = list.items.find((f) => f.id === voucherId)

  // 2) 강좌 목록
  const [courses, setCourses] = useState({ key: '', items: [], error: '' })
  useEffect(() => {
    if (!facility) return
    let cancelled = false
    fetchVoucherCourses(facility.brno, facility.facilSn)
      .then((items) => { if (!cancelled) setCourses({ key: facility.id, items, error: '' }) })
      .catch((err) => { if (!cancelled) setCourses({ key: facility.id, items: [], error: err.message }) })
    return () => { cancelled = true }
  }, [facility])

  // 3) 주소로 좌표 찾기 (이 API에는 좌표가 없어요)
  const [position, setPosition] = useState({ key: '', value: null })
  useEffect(() => {
    if (!facility?.roadAddress) return
    let cancelled = false
    geocodeAddress(facility.roadAddress)
      .then((value) => { if (!cancelled) setPosition({ key: facility.id, value }) })
      .catch(() => { if (!cancelled) setPosition({ key: facility.id, value: null }) })
    return () => { cancelled = true }
  }, [facility])

  const mapItems = useMemo(
    () => (facility && position.value ? [{ ...facility, ...position.value }] : []),
    [facility, position.value],
  )

  if (listKey && list.key !== listKey) return <Notice>⏳ 시설 정보를 불러오는 중이에요...</Notice>
  if (list.error) return <Notice type="error">⚠️ {list.error}</Notice>
  if (!facility) {
    return (
      <Notice type="error">
        시설 정보를 찾을 수 없어요. <Link to="/search?type=voucher">이용권 사용처 찾기로 돌아가기</Link>
      </Notice>
    )
  }

  const sportList = facility.sportIds.map((id) => sports.find((s) => s.id === id)).filter(Boolean)
  const coursesLoading = courses.key !== facility.id

  return (
    <article className="facility-detail">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>← 목록으로</button>

      <p className="eyebrow">SPORTS VOUCHER</p>
      <div className="detail-title-row">
        <h1 className="section-title">{facility.name}</h1>
        <FavoriteButton facility={facility} withText />
      </div>
      <p className="voucher-banner">
        💳 <strong>스포츠강좌이용권</strong>으로 수강료를 결제할 수 있는 등록 시설이에요.{' '}
        <Link to="/supports">지원 대상 보기 →</Link>
      </p>

      <div className="facility-detail-grid">
        {position.value ? (
          <KakaoMap facilities={mapItems} height={360} />
        ) : (
          <div className="map-placeholder small">
            {position.key === facility.id ? '📍 주소로 위치를 찾지 못했어요.' : '📍 지도를 준비하고 있어요...'}
          </div>
        )}

        <div className="card">
          <dl className="info-list">
            <dt>주소</dt>
            <dd>{facility.address || '정보 없음'}</dd>
            <dt>주종목</dt>
            <dd>{facility.mainEvent || '정보 없음'}</dd>
          </dl>

          {sportList.length > 0 && (
            <>
              <h2 className="sub-title">관련 운동 안내</h2>
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

      {/* 등록 강좌 목록 */}
      <section className="detail-block courses">
        <h2>등록된 강좌 {coursesLoading ? '' : `(${courses.items.length})`}</h2>
        {coursesLoading && <Notice>⏳ 강좌 정보를 불러오는 중이에요...</Notice>}
        {!coursesLoading && courses.error && <Notice type="error">⚠️ {courses.error}</Notice>}
        {!coursesLoading && !courses.error && courses.items.length === 0 && (
          <Notice>등록된 강좌 정보가 없어요. 시설에 직접 문의해 주세요.</Notice>
        )}
        <div className="course-list">
          {courses.items.map((c) => (
            <details key={c.id} className="card course-card">
              <summary>
                <span className="chip">{c.sport}</span>
                <strong className="course-name">{c.name}</strong>
                <span className="course-meta">
                  {c.days && <span>📅 {c.days}</span>}
                  {c.time && <span>🕒 {c.time}</span>}
                  {c.price && <span className="course-price">{c.price.toLocaleString()}원</span>}
                </span>
              </summary>
              {c.description && <p className="course-desc">{c.description}</p>}
            </details>
          ))}
        </div>
        <p className="muted small-text">
          강좌 정보는 등록 당시 기준이에요. 실제 일정·금액은{' '}
          <ExternalLink href="https://svoucher.kspo.or.kr">스포츠강좌이용권 공식 사이트</ExternalLink>나 시설에서 확인하세요.
        </p>
      </section>

      <DataSource />
    </article>
  )
}
