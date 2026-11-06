// 여러 서버리스 함수가 같이 쓰는 도우미 (파일 이름이 _로 시작하면 Vercel이 API 주소로 만들지 않아요)

const BASE = 'https://apis.data.go.kr/B551014'

// 서버 메모리 캐시 (같은 서버가 살아 있는 동안 재사용)
const memoryCache = new Map()
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6시간

export async function cached(key, loader) {
  const hit = memoryCache.get(key)
  if (hit && Date.now() - hit.savedAt < CACHE_TTL) return hit.data
  const data = await loader()
  memoryCache.set(key, { savedAt: Date.now(), data })
  return data
}

// 공공데이터 API 호출: 여러 페이지면 끝까지 이어서 받아 배열로 돌려줘요.
// path 예: 'SRVC_SFMS_FACIL_INFO/TODZ_SFMS_FACIL_INFO'
export async function fetchAllItems(path, query, { rowsPerCall = 1000, maxCalls = 10 } = {}) {
  const serviceKey = process.env.DATA_GO_KR_KEY
  if (!serviceKey) throw new PublicError(500, '서버에 공공데이터 API 키(DATA_GO_KR_KEY)가 설정되지 않았어요.')

  const items = []
  for (let pageNo = 1; pageNo <= maxCalls; pageNo++) {
    // Decoding 키를 URLSearchParams로 넘기면 알아서 한 번만 인코딩돼요.
    const params = new URLSearchParams({
      serviceKey,
      pageNo: String(pageNo),
      numOfRows: String(rowsPerCall),
      resultType: 'json',
      ...query,
    })
    const response = await fetch(`${BASE}/${path}?${params}`)
    if (!response.ok) throw new Error(`공공데이터 API 응답 오류 (${response.status})`)
    const json = await response.json()

    const header = json?.response?.header
    if (header && header.resultCode !== '00') throw new Error(header.resultMsg || '공공데이터 API 오류')

    const body = json?.response?.body
    // 결과가 1건이면 배열이 아니라 객체로 올 수 있어서 [].concat으로 항상 배열로 만들어요.
    const page = [].concat(body?.items?.item || [])
    items.push(...page)
    if (items.length >= Number(body?.totalCount || 0) || page.length < rowsPerCall) break
  }
  return items
}

// 사용자에게 그대로 보여 줘도 되는 오류
export class PublicError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function getQuery(req) {
  return new URL(req.url, 'http://localhost').searchParams
}

export function sendJson(res, status, data, cacheable = false) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  // Vercel CDN이 하루 동안 같은 요청의 응답을 저장해 두고 다시 써요.
  res.setHeader('Cache-Control', cacheable ? 'public, s-maxage=86400, stale-while-revalidate=3600' : 'no-store')
  res.end(JSON.stringify(data))
}

export function sendError(res, err) {
  if (err instanceof PublicError) return sendJson(res, err.status, { error: err.message })
  console.error(err)
  return sendJson(res, 502, { error: '정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' })
}

// 문자열로 짧은 고유 id 만들기 (같은 값이면 항상 같은 id)
export function makeId(text) {
  let hash = 5381
  for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0
  return hash.toString(36)
}
