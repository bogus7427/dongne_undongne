// Vercel 서버리스 함수: GET /api/vouchers?sido=경기도&sigungu=수원시
// 국민체육진흥공단 "스포츠강좌이용권 등록시설 정보"
// - 이 API는 지역을 "코드"로 받아요. (city_cd=시도코드, local_cd=시군구코드)
//   이름 → 코드 변환표는 src/data/voucherCodes.json 에 있어요.
import { REGIONS } from '../src/data/regions.js'
import voucherCodes from '../src/data/voucherCodes.json' with { type: 'json' }
import { cached, fetchAllItems, getQuery, PublicError, sendError, sendJson } from './_lib.js'

const PATH = 'SRVC_OD_API_FACIL_MNG/todz_api_facil_mng_i'

export default async function handler(req, res) {
  try {
    const query = getQuery(req)
    const sido = query.get('sido') || ''
    const sigungu = query.get('sigungu') || ''
    if (!REGIONS[sido]?.includes(sigungu)) {
      throw new PublicError(400, '시/도와 시/군/구를 올바르게 선택해 주세요.')
    }

    const codes = voucherCodes[sido]?.[sigungu] || [] // 예: ["41:41110"]
    const data = await cached(`vouchers|${sido}|${sigungu}`, async () => {
      const lists = await Promise.all(
        codes.map((pair) => {
          const [city_cd, local_cd] = pair.split(':')
          return fetchAllItems(PATH, { city_cd, local_cd })
        }),
      )
      // 같은 시설이 두 코드에 겹쳐 나올 수 있어서 사업자번호+시설번호로 중복 제거
      const byId = new Map()
      lists.flat().forEach((item) => {
        const v = normalize(item, sido, sigungu)
        byId.set(v.id, v)
      })
      const facilities = [...byId.values()]
      return { sido, sigungu, count: facilities.length, facilities }
    })

    return sendJson(res, 200, data, true)
  } catch (err) {
    return sendError(res, err)
  }
}

function normalize(item, sido, sigungu) {
  return {
    kind: 'voucher',
    id: `${item.brno}-${item.facil_sn}`, // 사업자등록번호-시설번호
    brno: item.brno,
    facilSn: item.facil_sn,
    name: (item.facil_nm || '이름 없음').trim(),
    sido,
    sigungu,
    address: [item.road_addr, item.faci_daddr].filter(Boolean).join(' '),
    roadAddress: item.road_addr || '', // 지도 좌표를 찾을 때 쓰는 주소
    mainEvent: item.main_event_nm || '', // 주종목
    industry: item.main_event_nm || '',  // 종목 매핑에 쓰려고 같은 값을 넣어 둬요
    facilityType: '스포츠강좌이용권 등록시설',
    lat: null, // 이 API에는 좌표가 없어요 → 상세 화면에서 주소로 찾아요
    lng: null,
    phone: '',
    homepage: '',
  }
}
