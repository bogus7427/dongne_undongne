import { useEffect, useMemo, useState } from 'react'
import { useDb } from '../../lib/dbContext.js'
import { supabase, toKoreanError } from '../../lib/supabase.js'
import { maskName, maskPhone, maskMoney, formatMoney } from '../../utils/mask.js'
import Notice from '../../components/Notice.jsx'

const today = () => new Date().toLocaleDateString('sv-SE')
const thisMonth = () => today().slice(0, 7)

// 자주 쓰는 문구. #{이름} #{시설} #{월} #{금액} 은 받는 사람마다 자동으로 바뀌어요.
const TEMPLATES = [
  { id: 'fee', label: '💰 수강료 안내', text: '[#{시설}] #{이름}님, #{월}월 수강료 #{금액} 납부를 부탁드려요. 늘 감사합니다.' },
  { id: 'absent', label: '🙋 결석 안부', text: '[#{시설}] #{이름}님, 오늘 수업에 안 보이셔서 연락드려요. 다음 수업에서 만나요!' },
  { id: 'closed', label: '📢 휴관 안내', text: '[#{시설}] 안내드립니다. ○월 ○일은 시설 사정으로 휴관합니다. 이용에 참고 부탁드려요.' },
  { id: 'free', label: '✏️ 직접 쓰기', text: '' },
]

const TARGETS = [
  { id: 'active', label: '수강 중 전체' },
  { id: 'unpaid', label: '이번 달 미납' },
  { id: 'absent', label: '오늘 결석' },
  { id: 'pick', label: '직접 고르기' },
]

// 문자 길이(바이트) 계산: 한글 2, 영문·숫자 1 → 90바이트 넘으면 장문(LMS)
function byteLength(text) {
  let n = 0
  for (const ch of text) n += ch.charCodeAt(0) > 127 ? 2 : 1
  return n
}

// 한 사람에게 갈 실제 문구
function fillTemplate(text, { member, facilityName }) {
  return text
    .replaceAll('#{이름}', member.name)
    .replaceAll('#{시설}', facilityName || '')
    .replaceAll('#{월}', String(Number(thisMonth().slice(5))))
    .replaceAll('#{금액}', formatMoney(member.monthly_fee))
}

// 💬 문자 보내기 (SMS·LMS)
export default function MessageTab({ facilityId, facilityName, members, reveal }) {
  const { db, isDemo } = useDb()
  const [target, setTarget] = useState('active')
  const [picked, setPicked] = useState(new Set())
  const [templateId, setTemplateId] = useState('fee')
  const [text, setText] = useState(TEMPLATES[0].text)
  const [extra, setExtra] = useState({ key: '', unpaid: new Set(), present: new Set() })
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  const active = useMemo(() => members.filter((m) => m.status === 'active'), [members])
  const show = (m) => (reveal ? m.name : maskName(m.name))

  // "이번 달 미납", "오늘 결석"을 고르려면 납부·출석 기록이 필요해요
  const extraKey = `${facilityId}|${thisMonth()}|${today()}`
  useEffect(() => {
    let cancelled = false
    Promise.all([
      db.from('payments').select('member_id').eq('facility_id', facilityId).eq('month', thisMonth()),
      db.from('attendance').select('member_id').eq('facility_id', facilityId).eq('date', today()),
    ]).then(([p, a]) => {
      if (cancelled) return
      const paid = new Set((p.data || []).map((r) => r.member_id))
      setExtra({
        key: extraKey,
        unpaid: new Set(active.filter((m) => !paid.has(m.id)).map((m) => m.id)),
        present: new Set((a.data || []).map((r) => r.member_id)),
      })
    })
    return () => { cancelled = true }
  }, [db, facilityId, active, extraKey])

  const recipients = useMemo(() => {
    if (target === 'unpaid') return active.filter((m) => extra.unpaid.has(m.id))
    if (target === 'absent') return active.filter((m) => !extra.present.has(m.id))
    if (target === 'pick') return members.filter((m) => picked.has(m.id))
    return active
  }, [target, active, members, picked, extra])
  const withPhone = recipients.filter((m) => String(m.phone || '').replace(/\D/g, '').length >= 10)

  function chooseTemplate(id) {
    setTemplateId(id)
    setText(TEMPLATES.find((t) => t.id === id).text)
  }

  function togglePick(id) {
    const next = new Set(picked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setPicked(next)
  }

  const sample = withPhone[0] || active[0]
  const preview = sample ? fillTemplate(text, { member: sample, facilityName }) : text
  const bytes = byteLength(preview)

  async function send() {
    setResult(null)
    if (!text.trim()) return setResult({ type: 'error', text: '보낼 내용을 적어 주세요.' })
    if (!withPhone.length) return setResult({ type: 'error', text: '연락처가 있는 받는 사람이 없어요.' })
    if (withPhone.length > 100) return setResult({ type: 'error', text: '한 번에 100명까지 보낼 수 있어요.' })
    if (!agree) return setResult({ type: 'error', text: '발송 전 확인 사항에 체크해 주세요.' })
    if (!window.confirm(`${withPhone.length}명에게 문자를 보낼까요?`)) return

    // 체험판: 실제로 보내지 않고 결과만 보여 줘요
    if (isDemo) {
      setResult({ type: 'info', text: `🧪 체험판이라 실제로 보내지 않았어요. 진짜라면 ${withPhone.length}명에게 발송돼요.` })
      return
    }

    setBusy(true)
    try {
      const { data } = await supabase.auth.getSession()
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` },
        body: JSON.stringify({
          facilityId,
          memberIds: withPhone.map((m) => m.id),
          text,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || '발송에 실패했어요.')
      setResult({ type: 'info', text: `✅ ${json.requested}명 발송 요청 완료${json.failed ? ` (실패 ${json.failed}명)` : ''}` })
    } catch (err) {
      setResult({ type: 'error', text: toKoreanError(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="message-tab">
      <div className="message-grid">
        {/* 왼쪽: 받는 사람 */}
        <div className="card">
          <h2 className="sub-title">1. 받는 사람</h2>
          <div className="filter-chips">
            {TARGETS.map((t) => (
              <button key={t.id} type="button" className={`chip-btn ${target === t.id ? 'is-active' : ''}`} onClick={() => setTarget(t.id)}>
                {t.label}
                {t.id === 'unpaid' && extra.key === extraKey && ` (${extra.unpaid.size})`}
              </button>
            ))}
          </div>
          <ul className="recipient-list">
            {(target === 'pick' ? members.filter((m) => m.status !== 'left') : recipients).map((m) => {
              const hasPhone = String(m.phone || '').replace(/\D/g, '').length >= 10
              return (
                <li key={m.id}>
                  {target === 'pick' && (
                    <input type="checkbox" checked={picked.has(m.id)} onChange={() => togglePick(m.id)} aria-label={`${show(m)} 선택`} />
                  )}
                  <strong>{show(m)}</strong>
                  <span className={hasPhone ? 'muted' : 'text-danger'}>{hasPhone ? (reveal ? m.phone : maskPhone(m.phone)) : '연락처 없음'}</span>
                </li>
              )
            })}
          </ul>
          <p className="muted small-text">보낼 수 있는 사람: <strong>{withPhone.length}</strong>명 (연락처 없는 회원은 빠져요)</p>
        </div>

        {/* 오른쪽: 내용 */}
        <div className="card">
          <h2 className="sub-title">2. 내용 <small className="muted">📱 문자 (SMS·LMS)</small></h2>
          <div className="filter-chips">
            {TEMPLATES.map((t) => (
              <button key={t.id} type="button" className={`chip-btn ${templateId === t.id ? 'is-active' : ''}`} onClick={() => chooseTemplate(t.id)}>{t.label}</button>
            ))}
          </div>
          <textarea className="message-input" rows={5} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="보낼 내용을 적어 주세요. #{이름} #{시설} #{월} #{금액} 을 넣으면 사람마다 바뀌어요." />
          <p className="muted small-text">
            {bytes}바이트 · {bytes > 90 ? '장문(LMS)' : '단문(SMS)'} · 쓸 수 있는 자리표시: #{'{'}이름{'}'} #{'{'}시설{'}'} #{'{'}월{'}'} #{'{'}금액{'}'}
          </p>

          <div className="phone-preview">
            <p className="muted small-text">미리보기 ({sample ? show(sample) : '예시'}님에게 가는 문구)</p>
            <div className="bubble">
              {/* 가림 상태면 미리보기 속 이름·금액도 * 처리 */}
              {reveal || !sample
                ? preview
                : preview.replaceAll(sample.name, maskName(sample.name)).replaceAll(formatMoney(sample.monthly_fee), maskMoney(sample.monthly_fee))}
            </div>
          </div>

          <label className="checkbox agree">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>수업·수강료 같은 <strong>안내 목적</strong>이에요. 광고성 내용은 회원의 수신 동의를 받았고, 문구 앞에 (광고)와 수신거부 방법을 넣고, 밤 9시~아침 8시에는 보내지 않을게요.</span>
          </label>
          {result && <Notice type={result.type}>{result.text}</Notice>}
          <button type="button" className="btn btn-dark btn-block" onClick={send} disabled={busy}>
            {busy ? '보내는 중...' : `${withPhone.length}명에게 문자 보내기`}
          </button>
          {isDemo && <p className="muted small-text">🧪 체험판에서는 실제로 보내지지 않아요.</p>}
        </div>
      </div>
    </div>
  )
}
