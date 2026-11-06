import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchPublicAndRegistered, fetchFacilitiesInRegions, fetchVouchers, findRegionsAround } from '../utils/facilities.js'
import { getDistanceKm, getMyLocation } from '../utils/location.js'
import SearchControls from '../components/SearchControls.jsx'
import FacilityCard from '../components/FacilityCard.jsx'
import KakaoMap from '../components/KakaoMap.jsx'
import Pagination from '../components/Pagination.jsx'
import Notice from '../components/Notice.jsx'
import DataSource from '../components/DataSource.jsx'

const PAGE_SIZE = 10 // 한 페이지에 보여 줄 시설 수

export default function SearchPage() {
  // 검색 조건은 주소(?mode=near&radius=3...)에 저장해요.
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') === 'near' ? 'near' : 'region'
  const sido = params.get('sido') || ''
  const sigungu = params.get('sigungu') || ''
  const radius = Number(params.get('radius')) || 3
  const sport = params.get('sport') || ''
  const page = Number(params.get('page')) || 1
  // 어떤 시설을 볼지: public = 공공체육시설, voucher = 스포츠강좌이용권 등록시설
  const type = params.get('type') === 'voucher' ? 'voucher' : 'public'

  const [myLocation, setMyLocation] = useState(null) // { lat, lng }
  const [locationError, setLocationError] = useState('')
  // 불러온 결과: 어떤 요청(key)의 결과인지 같이 기억해요.
  const [data, setData] = useState({ key: '', items: [], error: '' })

  const sort = params.get('sort') || (myLocation ? 'distance' : 'name')

  function updateParams(changes) {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([key, val]) => {
      if (val === '' || val == null) next.delete(key)
      else next.set(key, val)
    })
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  // ---------- 1) "내 주변" 모드: 위치 요청 ----------
  const locating = mode === 'near' && !myLocation && !locationError
  useEffect(() => {
    if (!locating) return
    let cancelled = false
    getMyLocation()
      .then((loc) => { if (!cancelled) setMyLocation(loc) })
      .catch((err) => {
        if (cancelled) return
        setLocationError(err.message) // 거부·실패 → 안내 후 지역 선택으로
        const next = new URLSearchParams(params)
        next.set('mode', 'region')
        setParams(next, { replace: true })
      })
    return () => { cancelled = true }
  }, [locating, params, setParams])

  // ---------- 2) 데이터 불러오기 ----------
  // 지금 조건에서 필요한 요청을 글자 하나(requestKey)로 표현해요. 없으면 '' (요청 안 함)
  let requestKey = ''
  // 이용권 시설은 좌표가 없어서 "지역 선택"에서만 볼 수 있어요.
  if (mode === 'region' && sido && sigungu) requestKey = `${type}|region|${sido}|${sigungu}`
  if (mode === 'near' && myLocation && type === 'public') requestKey = `near|${myLocation.lat}|${myLocation.lng}|${radius}`
  const loading = requestKey !== '' && data.key !== requestKey

  useEffect(() => {
    if (!requestKey) return
    let cancelled = false
    const load = mode === 'region'
      ? (type === 'voucher' ? fetchVouchers(sido, sigungu) : fetchPublicAndRegistered(sido, sigungu))
      : findRegionsAround(myLocation, radius).then((regions) => {
          if (regions.length === 0) throw new Error('내 위치의 지역을 찾지 못했어요. 지역을 직접 선택해 주세요.')
          return fetchFacilitiesInRegions(regions)
        })
    load
      .then((items) => { if (!cancelled) setData({ key: requestKey, items, error: '' }) })
      .catch((err) => { if (!cancelled) setData({ key: requestKey, items: [], error: err.message }) })
    return () => { cancelled = true }
    // requestKey 안에 mode·지역·위치·반경이 모두 들어 있어서 이것만 지켜보면 돼요.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  // ---------- 3) 거리·필터·정렬 ----------
  const results = useMemo(() => {
    if (!requestKey || data.key !== requestKey) return []
    let list = data.items
    if (myLocation) {
      list = list.map((f) => ({
        ...f,
        distance: f.lat && f.lng ? getDistanceKm(myLocation, f) : null,
      }))
    }
    if (mode === 'near') list = list.filter((f) => f.distance != null && f.distance <= radius)
    if (sport) list = list.filter((f) => f.sportIds.includes(sport))

    const sorted = [...list]
    if (sort === 'distance' && myLocation) {
      // 거리 정보가 없는 시설은 맨 뒤로
      sorted.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    }
    return sorted
  }, [requestKey, data, mode, radius, sport, sort, myLocation])

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function changePage(p) {
    updateParams({ page: p })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function emptyMessage() {
    if (type === 'voucher' && mode === 'near') return '💳 이용권 시설은 위치 좌표가 없어 "지역 선택"으로 찾아 주세요.'
    if (mode === 'region' && !sido) return '위에서 시/도를 먼저 선택해 주세요.'
    if (mode === 'region' && !sigungu) return '시/군/구까지 선택하면 시설을 찾아 드려요.'
    if (mode === 'near' && locating) return '내 위치를 찾고 있어요...'
    if (mode === 'near') return `반경 ${radius}km 안에 조건에 맞는 시설이 없어요. 반경을 넓혀 보세요.`
    return '조건에 맞는 시설이 없어요. 다른 지역이나 운동을 선택해 보세요.'
  }

  return (
    <section>
      <p className="eyebrow">SEARCH</p>
      <h1 className="section-title">체육시설 찾기</h1>

      {locationError && <Notice type="warn">📍 {locationError}</Notice>}

      <SearchControls
        value={{ mode, sido, sigungu, radius, sport, sort }}
        onChange={(changes) => {
          if (changes.mode === 'near') setLocationError('')
          updateParams(changes)
        }}
        hasLocation={!!myLocation}
        locating={locating}
      />

      {/* 시설 종류 탭 */}
      <div className="type-tabs" role="tablist">
        <button role="tab" aria-selected={type === 'public'} className={type === 'public' ? 'is-active' : ''}
          onClick={() => updateParams({ type: '' })}>
          🏟️ 공공체육시설
        </button>
        <button role="tab" aria-selected={type === 'voucher'} className={type === 'voucher' ? 'is-active' : ''}
          onClick={() => updateParams({ type: 'voucher' })}>
          💳 스포츠강좌이용권 사용처
        </button>
      </div>
      {type === 'voucher' && (
        <p className="muted small-text type-help">
          스포츠강좌이용권을 쓸 수 있는 등록 시설(민간 포함)이에요. 위치 좌표가 없어 지도에는 상세 화면에서만 표시돼요.
        </p>
      )}

      <div className="search-layout">
        <div className="map-sticky">
          <KakaoMap
            facilities={results}
            myLocation={mode === 'near' ? myLocation : null}
            radiusKm={radius}
          />
        </div>

        <div>
          {loading ? (
            <Notice>⏳ 시설 정보를 불러오는 중이에요...</Notice>
          ) : data.error && data.key === requestKey ? (
            <Notice type="error">⚠️ {data.error}</Notice>
          ) : (
            <>
              <p className="result-count">검색 결과 <strong>{results.length}</strong>곳</p>
              {results.length === 0 ? (
                <Notice>{emptyMessage()}</Notice>
              ) : (
                <>
                  <div className="facility-list">
                    {pageItems.map((f) => <FacilityCard key={f.id} facility={f} />)}
                  </div>
                  <Pagination page={currentPage} totalPages={totalPages} onChange={changePage} />
                </>
              )}
            </>
          )}
        </div>
      </div>

      <DataSource />
    </section>
  )
}
