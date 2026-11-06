// Vercel 서버리스 함수: GET /api/voucher-courses?brno=1234567890&facil_sn=1
// 국민체육진흥공단 "스포츠강좌이용권 등록강좌 정보" - 시설 한 곳의 강좌 목록
import { cached, fetchAllItems, getQuery, PublicError, sendError, sendJson } from './_lib.js'

const PATH = 'SRVC_OD_API_FACIL_COURSE/todz_api_facil_course_i'
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

export default async function handler(req, res) {
  try {
    const query = getQuery(req)
    const brno = query.get('brno') || ''
    const facilSn = query.get('facil_sn') || ''
    // 사업자번호는 숫자 10자리, 시설번호는 숫자만 허용
    if (!/^\d{10}$/.test(brno) || !/^\d{1,5}$/.test(facilSn)) {
      throw new PublicError(400, '시설 정보가 올바르지 않아요.')
    }

    const data = await cached(`courses|${brno}|${facilSn}`, async () => {
      const items = await fetchAllItems(PATH, { brno, facil_sn: facilSn }, { maxCalls: 3 })
      const courses = items.map((item) => ({
        id: item.course_no,
        name: (item.course_nm || '').trim(),
        sport: item.item_nm || '',
        days: toDays(item.lectr_weekday_val),
        time: item.start_tm && item.equip_tm ? `${item.start_tm}~${item.equip_tm}` : '',
        price: Number(item.settl_amt) || null,
        description: (item.course_seta_desc_cn || '').trim(),
      }))
      return { count: courses.length, courses }
    })

    return sendJson(res, 200, data, true)
  } catch (err) {
    return sendError(res, err)
  }
}

// "1111100" → "월·화·수·목·금" (월요일부터 일요일까지 1이면 수업 있는 날)
function toDays(value) {
  return String(value || '')
    .split('')
    .map((v, i) => (v === '1' ? WEEKDAYS[i] : null))
    .filter(Boolean)
    .join('·')
}
