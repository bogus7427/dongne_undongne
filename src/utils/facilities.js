// 시설 데이터를 불러오고 다루는 함수 모음 (브라우저 쪽)
import { getSportIds } from '../data/sportMapping.js'
import { loadKakaoMap } from './loadKakaoMap.js'
import { REGIONS } from '../data/regions.js'
import { fetchRegistered } from './registered.js'

const CACHE_PREFIX = 'cache:v2:'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 브라우저 캐시 하루
const requests = new Map() // 같은 요청을 동시에 여러 번 보내지 않도록 진행 중인 요청 보관

// 공통: 캐시(메모리 → localStorage) 확인 후 없으면 /api 호출
function cachedFetch(cacheKey, url) {
  const key = CACHE_PREFIX + cacheKey

  // 1) 이번 접속에서 이미 부른 적 있으면 그 결과(Promise)를 그대로 사용
  if (requests.has(key)) return requests.get(key)

  // 2) localStorage에 하루 안에 저장한 결과가 있으면 사용
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    if (saved && Date.now() - saved.savedAt < CACHE_TTL) {
      const promise = Promise.resolve(saved.data)
      requests.set(key, promise)
      return promise
    }
  } catch {
    // 저장된 값이 깨져 있으면 무시하고 새로 불러요.
  }

  // 3) 서버리스 함수 호출
  const promise = fetch(url)
    .then(async (res) => {
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '정보를 불러오지 못했어요.')
      saveToStorage(key, data)
      return data
    })
    .catch((err) => {
      requests.delete(key) // 실패한 요청은 다음에 다시 시도할 수 있게 지워요.
      throw err
    })
  requests.set(key, promise)
  return promise
}

function saveToStorage(key, data) {
  const value = JSON.stringify({ savedAt: Date.now(), data })
  try {
    localStorage.setItem(key, value)
  } catch {
    // 저장 공간이 꽉 차면 예전 캐시를 지우고 한 번 더 시도
    Object.keys(localStorage)
      .filter((k) => k.startsWith('cache:') || k.startsWith('facilities:'))
      .forEach((k) => localStorage.removeItem(k))
    try { localStorage.setItem(key, value) } catch { /* 포기 */ }
  }
}

// 각 시설에 할 수 있는 종목(sportIds)을 붙여 줍니다.
function prepare(list) {
  return list.map((f) => ({ ...f, sportIds: getSportIds(f) }))
}

// 공공체육시설 (시/군/구 하나)
export function fetchFacilities(sido, sigungu) {
  const params = new URLSearchParams({ sido, sigungu })
  return cachedFetch(`facilities:${sido}:${sigungu}`, `/api/facilities?${params}`)
    .then((data) => prepare(data.facilities))
}

// 공공체육시설 + 업체가 등록한 시설(승인된 것) 합치기
export async function fetchPublicAndRegistered(sido, sigungu) {
  const [publicList, registered] = await Promise.all([
    fetchFacilities(sido, sigungu),
    fetchRegistered(sido, sigungu),
  ])
  return [...registered, ...publicList] // 등록 업체를 앞에
}

// 스포츠강좌이용권 등록시설 (시/군/구 하나)
export function fetchVouchers(sido, sigungu) {
  const params = new URLSearchParams({ sido, sigungu })
  return cachedFetch(`vouchers:${sido}:${sigungu}`, `/api/vouchers?${params}`)
    .then((data) => prepare(data.facilities))
}

// 이용권 시설 한 곳의 강좌 목록
export function fetchVoucherCourses(brno, facilSn) {
  const params = new URLSearchParams({ brno, facil_sn: facilSn })
  return cachedFetch(`courses:${brno}:${facilSn}`, `/api/voucher-courses?${params}`)
    .then((data) => data.courses)
}

// 카카오 지역 이름 → 공공데이터 API 지역 이름 (행정구역 개편 대응)
const SIDO_ALIAS = {
  광주광역시: '전남광주통합특별시',
  전라남도: '전남광주통합특별시',
  강원도: '강원특별자치도',
  전라북도: '전북특별자치도',
}

// 내 위치 주변(반경 km)에 걸치는 시/군/구 목록 찾기
// 가운데 + 8방향 끝 지점이 어느 시/군/구인지 카카오에 물어봐요.
export async function findRegionsAround(location, radiusKm) {
  const kakao = await loadKakaoMap()
  const geocoder = new kakao.maps.services.Geocoder()
  const dLat = radiusKm / 111 // 위도 1도 ≈ 111km
  const dLng = radiusKm / (111 * Math.cos((location.lat * Math.PI) / 180))
  const points = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [0.7, -0.7], [-0.7, 0.7], [-0.7, -0.7]]
    .map(([y, x]) => ({ lat: location.lat + y * dLat, lng: location.lng + x * dLng }))

  const regionOf = (p) =>
    new Promise((resolve) => {
      geocoder.coord2RegionCode(p.lng, p.lat, (result, status) => {
        if (status !== kakao.maps.services.Status.OK || !result[0]) return resolve(null)
        const raw = result[0].region_1depth_name
        const sido = SIDO_ALIAS[raw] || raw
        // "수원시 장안구" → "수원시", 세종은 시/군/구가 비어 있어서 "세종시"
        const sigungu = (result[0].region_2depth_name || '세종시').split(' ')[0]
        resolve(REGIONS[sido]?.includes(sigungu) ? { sido, sigungu } : null)
      })
    })

  const found = (await Promise.all(points.map(regionOf))).filter(Boolean)
  const unique = new Map(found.map((r) => [`${r.sido}|${r.sigungu}`, r]))
  return [...unique.values()]
}

// 여러 지역을 불러서 하나로 합치기 (중복 제거)
export async function fetchFacilitiesInRegions(regions) {
  const lists = await Promise.all(regions.map((r) => fetchPublicAndRegistered(r.sido, r.sigungu)))
  const byId = new Map()
  lists.flat().forEach((f) => byId.set(f.id, f))
  return [...byId.values()]
}

// 주소 → 좌표 (이용권 시설은 좌표가 없어서 상세 화면에서 이걸로 찾아요)
export async function geocodeAddress(address) {
  const kakao = await loadKakaoMap()
  const geocoder = new kakao.maps.services.Geocoder()
  return new Promise((resolve) => {
    geocoder.addressSearch(address, (result, status) => {
      if (status !== kakao.maps.services.Status.OK || !result[0]) return resolve(null)
      resolve({ lat: Number(result[0].y), lng: Number(result[0].x) })
    })
  })
}
