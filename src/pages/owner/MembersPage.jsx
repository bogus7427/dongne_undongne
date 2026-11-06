import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, toKoreanError } from '../../lib/supabase.js'
import Notice from '../../components/Notice.jsx'

// 오늘 날짜 "2026-11-06", 이번 달 "2026-11"
const today = () => new Date().toLocaleDateString('sv-SE')
const thisMonth = () => today().slice(0, 7)

const MEMBER_STATUS = { active: '수강 중', paused: '휴원', left: '퇴원' }
const EMPTY_MEMBER = { name: '', phone: '', course: '', monthly_fee: '', joined_on: '', memo: '' }

// 업체용 회원 관리: 회원 명단 / 출석 / 수강료
export default function MembersPage() {
  const { facilityId } = useParams()
  const [tab, setTab] = useState('members')
  const [facility, setFacility] = useState(null)
  const [members, setMembers] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  const loadMembers = useCallback(async () => {
    const { data, error } = await supabase.from('members').select('*')
      .eq('facility_id', facilityId).order('created_at', { ascending: true })
    if (error) setError(toKoreanError(error))
    else setMembers(data)
    setLoaded(true)
  }, [facilityId])

  useEffect(() => {
    let cancelled = false
    supabase.from('facilities').select('id, name, status').eq('id', facilityId).maybeSingle()
      .then(({ data }) => { if (!cancelled) setFacility(data) })
    // 처음 한 번 회원 목록 불러오기 (결과는 비동기로 들어와요)
    supabase.from('members').select('*').eq('facility_id', facilityId).order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(toKoreanError(error))
        else setMembers(data)
        setLoaded(true)
      })
    return () => { cancelled = true }
  }, [facilityId])

  return (
    <section>
      <Link to="/owner" className="back-link">← 내 시설 관리</Link>
      <p className="eyebrow">MEMBERS</p>
      <h1 className="section-title">{facility?.name || '시설'} 회원 관리</h1>

      <div className="type-tabs" role="tablist">
        {[['members', '👥 회원 명단'], ['attendance', '✅ 출석'], ['payments', '💰 수강료']].map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {error && <Notice type="error">{error}</Notice>}
      {!loaded ? <Notice>⏳ 불러오는 중...</Notice> : (
        <>
          {tab === 'members' && <MemberList facilityId={facilityId} members={members} reload={loadMembers} />}
          {tab === 'attendance' && <AttendanceTab facilityId={facilityId} members={members} />}
          {tab === 'payments' && <PaymentsTab facilityId={facilityId} members={members} />}
        </>
      )}

      <p className="muted small-text privacy-note">
        🔒 회원 정보는 이 시설 업체만 볼 수 있어요. 꼭 필요한 정보만 저장하고, 주민등록번호 같은 민감한 정보는 입력하지 마세요.
      </p>
    </section>
  )
}

// ---------------- 회원 명단 ----------------
function MemberList({ facilityId, members, reload }) {
  const [form, setForm] = useState(EMPTY_MEMBER)
  const [editingId, setEditingId] = useState(null) // null이면 새 회원 추가
  const [filter, setFilter] = useState('active')
  const [keyword, setKeyword] = useState('')
  const [error, setError] = useState('')

  const shown = members.filter(
    (m) => (filter === 'all' || m.status === filter) && (!keyword || m.name.includes(keyword) || (m.phone || '').includes(keyword)),
  )

  function startEdit(m) {
    setEditingId(m.id)
    setForm({ name: m.name, phone: m.phone || '', course: m.course || '', monthly_fee: m.monthly_fee || '', joined_on: m.joined_on || '', memo: m.memo || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function save(e) {
    e.preventDefault()
    setError('')
    const row = {
      name: form.name.trim(), phone: form.phone.trim(), course: form.course.trim(),
      monthly_fee: Number(form.monthly_fee) || 0, joined_on: form.joined_on || today(), memo: form.memo.trim(),
    }
    const { error } = editingId
      ? await supabase.from('members').update(row).eq('id', editingId)
      : await supabase.from('members').insert({ ...row, facility_id: facilityId })
    if (error) return setError(toKoreanError(error))
    setForm(EMPTY_MEMBER)
    setEditingId(null)
    reload()
  }

  async function changeStatus(m, status) {
    const { error } = await supabase.from('members').update({ status }).eq('id', m.id)
    if (error) setError(toKoreanError(error))
    else reload()
  }

  async function remove(m) {
    if (!window.confirm(`${m.name} 회원과 출석·수강료 기록을 삭제할까요?`)) return
    const { error } = await supabase.from('members').delete().eq('id', m.id)
    if (error) setError(toKoreanError(error))
    else reload()
  }

  // 엑셀에서 열 수 있는 CSV 파일로 내려받기
  function downloadCsv() {
    const header = ['이름', '연락처', '강좌', '월 수강료', '등록일', '상태', '메모']
    const rows = shown.map((m) => [m.name, m.phone, m.course, m.monthly_fee, m.joined_on, MEMBER_STATUS[m.status], m.memo])
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }) // 맨 앞의 BOM 문자: 엑셀에서 한글이 깨지지 않게
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `회원명단_${today()}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div>
      <form onSubmit={save} className="form card member-form">
        <h2>{editingId ? '✏️ 회원 정보 수정' : '➕ 새 회원 등록'}</h2>
        <div className="form-row">
          <label>이름 *<input required maxLength={30} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>연락처<input type="tel" maxLength={20} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        </div>
        <div className="form-row">
          <label>강좌/반<input maxLength={40} value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} placeholder="예: 저녁 7시반" /></label>
          <label>월 수강료(원)<input type="number" min="0" step="1000" value={form.monthly_fee} onChange={(e) => setForm({ ...form, monthly_fee: e.target.value })} /></label>
          <label>등록일<input type="date" value={form.joined_on} onChange={(e) => setForm({ ...form, joined_on: e.target.value })} /></label>
        </div>
        <label>메모<input maxLength={200} value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} /></label>
        {error && <Notice type="error">{error}</Notice>}
        <div className="link-buttons">
          <button type="submit" className="btn btn-dark btn-sm">{editingId ? '수정 저장' : '회원 추가'}</button>
          {editingId && <button type="button" className="btn btn-sm" onClick={() => { setEditingId(null); setForm(EMPTY_MEMBER) }}>취소</button>}
        </div>
      </form>

      <div className="table-tools">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="상태 필터">
          <option value="active">수강 중</option><option value="paused">휴원</option>
          <option value="left">퇴원</option><option value="all">전체</option>
        </select>
        <input placeholder="이름·연락처 검색" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <span className="muted">{shown.length}명</span>
        <button type="button" className="btn btn-sm" onClick={downloadCsv} disabled={!shown.length}>⬇ 엑셀(CSV)</button>
      </div>

      {shown.length === 0 ? <Notice>해당하는 회원이 없어요.</Notice> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>이름</th><th>연락처</th><th>강좌</th><th>월 수강료</th><th>등록일</th><th>상태</th><th></th></tr></thead>
            <tbody>
              {shown.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.name}</strong>{m.memo && <div className="muted small-text">{m.memo}</div>}</td>
                  <td>{m.phone}</td>
                  <td>{m.course}</td>
                  <td>{m.monthly_fee ? `${m.monthly_fee.toLocaleString()}원` : '-'}</td>
                  <td>{m.joined_on}</td>
                  <td>
                    <select value={m.status} onChange={(e) => changeStatus(m, e.target.value)} aria-label="상태">
                      {Object.entries(MEMBER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="row-actions">
                    <button type="button" onClick={() => startEdit(m)}>수정</button>
                    <button type="button" onClick={() => remove(m)}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------- 출석 ----------------
function AttendanceTab({ facilityId, members }) {
  const [date, setDate] = useState(today())
  const [state, setState] = useState({ key: '', checked: new Set(), monthCount: {} })
  const [error, setError] = useState('')
  const active = members.filter((m) => m.status === 'active')
  const key = `${facilityId}|${date}`

  const load = useCallback(async () => {
    const month = date.slice(0, 7)
    const [y, mo] = month.split('-').map(Number)
    const end = new Date(y, mo, 1).toLocaleDateString('sv-SE') // 다음 달 1일
    // 이 달의 출석 기록을 한 번에 불러와서 "오늘 출석"과 "이번 달 출석 횟수"를 같이 계산
    const { data, error } = await supabase.from('attendance').select('member_id, date')
      .eq('facility_id', facilityId).gte('date', `${month}-01`).lt('date', end)
    if (error) return setError(toKoreanError(error))
    const checked = new Set(data.filter((r) => r.date === date).map((r) => r.member_id))
    const monthCount = {}
    data.forEach((r) => { monthCount[r.member_id] = (monthCount[r.member_id] || 0) + 1 })
    setState({ key: `${facilityId}|${date}`, checked, monthCount })
  }, [facilityId, date])

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => { if (!cancelled) load() })
    return () => { cancelled = true }
  }, [load])

  async function toggle(member) {
    setError('')
    const isChecked = state.checked.has(member.id)
    const { error } = isChecked
      ? await supabase.from('attendance').delete().eq('member_id', member.id).eq('date', date)
      : await supabase.from('attendance').insert({ facility_id: facilityId, member_id: member.id, date })
    if (error) setError(toKoreanError(error))
    else load()
  }

  return (
    <div>
      <div className="table-tools">
        <label>날짜 <input type="date" value={date} onChange={(e) => setDate(e.target.value || today())} /></label>
        <span className="muted">출석 {state.key === key ? state.checked.size : '-'} / {active.length}명</span>
      </div>
      {error && <Notice type="error">{error}</Notice>}
      {active.length === 0 ? <Notice>수강 중인 회원이 없어요. "회원 명단"에서 먼저 등록해 주세요.</Notice> : (
        <div className="attendance-grid">
          {active.map((m) => {
            const on = state.checked.has(m.id)
            return (
              <button key={m.id} type="button" className={`attendance-btn ${on ? 'is-on' : ''}`} onClick={() => toggle(m)} aria-pressed={on}>
                <span className="check">{on ? '✅' : '⬜'}</span>
                <strong>{m.name}</strong>
                <small>{m.course ? `${m.course} · ` : ''}이번 달 {state.monthCount[m.id] || 0}회</small>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------- 수강료 ----------------
function PaymentsTab({ facilityId, members }) {
  const [month, setMonth] = useState(thisMonth())
  const [payments, setPayments] = useState({ key: '', byMember: {} })
  const [error, setError] = useState('')
  const targets = members.filter((m) => m.status === 'active')

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('payments').select('*').eq('facility_id', facilityId).eq('month', month)
    if (error) return setError(toKoreanError(error))
    setPayments({ key: month, byMember: Object.fromEntries(data.map((p) => [p.member_id, p])) })
  }, [facilityId, month])

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => { if (!cancelled) load() })
    return () => { cancelled = true }
  }, [load])

  async function markPaid(member, method) {
    setError('')
    const { error } = await supabase.from('payments').upsert(
      { facility_id: facilityId, member_id: member.id, month, amount: member.monthly_fee || 0, method, paid_on: today() },
      { onConflict: 'member_id,month' },
    )
    if (error) setError(toKoreanError(error))
    else load()
  }

  async function cancelPaid(member) {
    if (!window.confirm(`${member.name} 회원의 ${month} 납부 기록을 취소할까요?`)) return
    const { error } = await supabase.from('payments').delete().eq('member_id', member.id).eq('month', month)
    if (error) setError(toKoreanError(error))
    else load()
  }

  const summary = useMemo(() => {
    const paid = targets.filter((m) => payments.byMember[m.id])
    return {
      paidCount: paid.length,
      unpaidCount: targets.length - paid.length,
      total: paid.reduce((sum, m) => sum + (payments.byMember[m.id].amount || 0), 0),
    }
  }, [targets, payments])

  return (
    <div>
      <div className="table-tools">
        <label>월 <input type="month" value={month} onChange={(e) => setMonth(e.target.value || thisMonth())} /></label>
        <span className="pay-summary">
          납부 <strong>{summary.paidCount}</strong> · 미납 <strong className="text-danger">{summary.unpaidCount}</strong> ·
          합계 <strong>{summary.total.toLocaleString()}원</strong>
        </span>
      </div>
      {error && <Notice type="error">{error}</Notice>}
      {targets.length === 0 ? <Notice>수강 중인 회원이 없어요.</Notice> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>이름</th><th>강좌</th><th>월 수강료</th><th>상태</th><th>처리</th></tr></thead>
            <tbody>
              {targets.map((m) => {
                const p = payments.byMember[m.id]
                return (
                  <tr key={m.id} className={p ? '' : 'row-unpaid'}>
                    <td><strong>{m.name}</strong></td>
                    <td>{m.course}</td>
                    <td>{m.monthly_fee ? `${m.monthly_fee.toLocaleString()}원` : '-'}</td>
                    <td>{p ? <span className="status-badge status-approved">납부 ({p.method || '기타'}, {p.paid_on})</span> : <span className="status-badge status-rejected">미납</span>}</td>
                    <td className="row-actions">
                      {p ? (
                        <button type="button" onClick={() => cancelPaid(m)}>납부 취소</button>
                      ) : (
                        ['현금', '카드', '계좌이체', '이용권'].map((method) => (
                          <button key={method} type="button" onClick={() => markPaid(m, method)}>{method}</button>
                        ))
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small-text">※ 실제 결제는 되지 않아요. 받은 수강료를 기록하는 장부예요.</p>
    </div>
  )
}
