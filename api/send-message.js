// Vercel 서버리스 함수: POST /api/send-message
// 문자(SMS·LMS) 보내기 - 발송 대행사 "솔라피(SOLAPI)" 사용
//
// 안전장치
// 1) 로그인한 업체회원의 토큰으로 Supabase에 물어봐서, 그 시설의 "주인"인지 확인해요.
// 2) 전화번호는 브라우저에서 받지 않고, 서버가 DB에서 직접 꺼내요. (남의 번호로 보낼 수 없게)
// 3) 한 번에 최대 100명.
// 4) API 키는 서버에만 있어요. (.env / Vercel 환경변수)
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { PublicError, sendError, sendJson } from './_lib.js'

const MAX_RECIPIENTS = 100
const SOLAPI_URL = 'https://api.solapi.com/messages/v4/send-many/detail'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') throw new PublicError(405, 'POST 로만 보낼 수 있어요.')

    const env = process.env
    if (!env.SOLAPI_API_KEY || !env.SOLAPI_API_SECRET || !env.SOLAPI_SENDER) {
      throw new PublicError(500, '문자 발송 설정이 아직 없어요. 환경변수(SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER)를 넣어 주세요.')
    }
    if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
      throw new PublicError(500, '회원 기능(Supabase) 설정이 필요해요.')
    }

    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!token) throw new PublicError(401, '로그인이 필요해요.')

    const body = await readJson(req)
    const { facilityId, memberIds = [], text = '' } = body
    if (!facilityId || !Array.isArray(memberIds) || memberIds.length === 0) throw new PublicError(400, '받는 사람을 골라 주세요.')
    if (memberIds.length > MAX_RECIPIENTS) throw new PublicError(400, `한 번에 ${MAX_RECIPIENTS}명까지 보낼 수 있어요.`)
    if (!String(text).trim() || String(text).length > 1000) throw new PublicError(400, '내용은 1~1000자로 적어 주세요.')

    // 로그인한 사람의 권한으로 Supabase 사용 → DB 보안 규칙(RLS)이 그대로 적용돼요
    const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    })
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData?.user) throw new PublicError(401, '로그인이 만료됐어요. 다시 로그인해 주세요.')

    const { data: facility } = await supabase.from('facilities').select('id, name, owner_id').eq('id', facilityId).maybeSingle()
    if (!facility || facility.owner_id !== userData.user.id) throw new PublicError(403, '내 시설의 회원에게만 보낼 수 있어요.')

    const { data: members, error: memberError } = await supabase
      .from('members').select('id, name, phone, monthly_fee')
      .eq('facility_id', facilityId).in('id', memberIds)
    if (memberError) throw memberError

    const month = String(new Date().getMonth() + 1)
    const messages = (members || [])
      .map((m) => ({ m, to: String(m.phone || '').replace(/\D/g, '') }))
      .filter(({ to }) => /^01\d{8,9}$/.test(to))
      .map(({ m, to }) => {
        const filled = fill(text, m, facility.name, month)
        return { to, from: env.SOLAPI_SENDER.replace(/\D/g, ''), text: filled } // 90바이트 넘으면 솔라피가 알아서 장문(LMS)으로
      })
    if (!messages.length) throw new PublicError(400, '보낼 수 있는 휴대폰 번호가 없어요.')

    const result = await solapiSend(messages, env.SOLAPI_API_KEY, env.SOLAPI_API_SECRET)
    const failed = Array.isArray(result?.failedMessageList) ? result.failedMessageList.length : 0

    // 발송 기록 남기기 (실패해도 발송 결과에는 영향 없음)
    await supabase.from('message_logs').insert({
      facility_id: facilityId,
      channel: 'sms',
      recipient_count: messages.length,
      failed_count: failed,
      text: String(text).slice(0, 1000),
      created_by: userData.user.id,
    }).then(() => {}, () => {})

    return sendJson(res, 200, { requested: messages.length, failed })
  } catch (err) {
    return sendError(res, err)
  }
}

function fill(text, m, facilityName, month) {
  return String(text)
    .replaceAll('#{이름}', m.name)
    .replaceAll('#{시설}', facilityName || '')
    .replaceAll('#{월}', month)
    .replaceAll('#{금액}', m.monthly_fee ? `${Number(m.monthly_fee).toLocaleString()}원` : '')
}

// 솔라피 인증: HMAC-SHA256(시크릿, 날짜+솔트)
async function solapiSend(messages, apiKey, apiSecret) {
  const date = new Date().toISOString()
  const salt = crypto.randomBytes(16).toString('hex')
  const signature = crypto.createHmac('sha256', apiSecret).update(date + salt).digest('hex')
  const response = await fetch(SOLAPI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
    },
    body: JSON.stringify({ messages }),
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    console.error('SOLAPI error', response.status, json)
    throw new PublicError(502, `발송 대행사 오류: ${json.errorMessage || response.status}`)
  }
  return json
}

// 요청 본문(JSON) 읽기 - Vercel에서는 이미 읽혀 있을 수 있어서 둘 다 처리
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    throw new PublicError(400, '요청 형식이 올바르지 않아요.')
  }
}
