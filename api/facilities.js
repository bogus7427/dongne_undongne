// Vercel 서버리스 함수: GET /api/facilities?sido=서울특별시&sigungu=강남구
// 국민체육진흥공단 "공공체육시설 상세 정보"
// - 브라우저 대신 서버에서 API를 불러요. → API 키가 브라우저에 노출되지 않아요.
// - 선택한 시/군/구 단위로만 요청해요. (전국을 한 번에 부르지 않음)
// - 같은 지역은 저장해 둔 결과를 다시 써요. (서버 메모리 + Vercel CDN 캐시)
import { REGIONS } from '../src/data/regions.js'
import { cached, fetchAllItems, getQuery, makeId, PublicError, sendError, sendJson } from './_lib.js'

const PATH = 'SRVC_SFMS_FACIL_INFO/TODZ_SFMS_FACIL_INFO'

export default async function handler(req, res) {
  try {
    const query = getQuery(req)
    const sido = query.get('sido') || ''
    const sigungu = query.get('sigungu') || ''
    if (!REGIONS[sido]?.includes(sigungu)) {
      throw new PublicError(400, '시/도와 시/군/구를 올바르게 선택해 주세요.')
    }

    const data = await cached(`facilities|${sido}|${sigungu}`, async () => {
      // ① 시/군/구가 관리하는 시설
      const local = await fetchAllItems(PATH, { fmng_cp_nm: sido, fmng_cpb_nm: sigungu })
      // ② 시/도가 직접 관리하는 시설(소유 시군구 칸에 시/도 이름이 들어 있음) 중 주소가 이 시/군/구인 곳
      const sidoOwned = await cached(`facilities-sido|${sido}`, () =>
        fetchAllItems(PATH, { fmng_cp_nm: sido, fmng_cpb_nm: sido }),
      )
      const extra = sidoOwned.filter(
        (item) => item.addr_cpb_nm === sigungu || String(item.faci_road_addr || '').includes(` ${sigungu} `),
      )

      const facilities = [...local, ...extra]
        .filter((item) => !isClosed(item))
        .map((item) => normalize(item, sido, sigungu))
      return { sido, sigungu, count: facilities.length, facilities }
    })

    return sendJson(res, 200, data, true)
  } catch (err) {
    return sendError(res, err)
  }
}

// 시설상태: 00 = 정상운영, 99 = 폐업 (상태 이름이 오는 경우도 대비)
function isClosed(item) {
  return item.faci_stat_cd === '99' || String(item.faci_stat_nm || '').includes('폐업')
}

// API 원본 → 우리 앱에서 쓰는 모양으로 바꾸기
function normalize(item, sido, sigungu) {
  const lat = Number(item.faci_lat)
  const lng = Number(item.faci_lot) // API에서는 경도를 faci_lot 이라고 불러요
  const address =
    item.faci_road_addr ||
    [item.addr_ctpv_nm, item.addr_cpb_nm, item.addr_emd_nm].filter(Boolean).join(' ')
  return {
    kind: 'public',
    id: makeId(`${item.faci_nm}|${address}|${item.faci_lat}|${item.faci_lot}`),
    name: item.faci_nm || '이름 없음',
    sido,
    sigungu,
    address,
    phone: item.faci_mng_user_telno || '',
    manager: item.fmng_dept_nm || '',
    lat: Number.isFinite(lat) && lat !== 0 ? lat : null,
    lng: Number.isFinite(lng) && lng !== 0 ? lng : null,
    industry: item.fcob_nm || '',      // 업종명
    facilityType: item.ftype_nm || '', // 시설유형명
    homepage: (item.faci_homepage || '').trim(),
  }
}
