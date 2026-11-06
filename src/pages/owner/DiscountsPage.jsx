import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toKoreanError } from '../../lib/supabase.js'
import { useDb } from '../../lib/dbContext.js'
import { PERIOD_MONTHS, buildPeriodRows, discountText } from '../../utils/discounts.js'
import DiscountSection from '../../components/DiscountSection.jsx'
import Notice from '../../components/Notice.jsx'

const EMPTY_DISCOUNT = {
  kind: 'coupon', title: '', card_name: '', code: '', valueType: 'rate', value: '',
  condition: '', starts_on: '', ends_on: '',
}

// 업체용: 할인 제도 관리 (/biz/facilities/:facilityId/discounts)
export default function DiscountsPage() {
  const { db, base } = useDb() // 진짜 DB 또는 체험판 DB
  const { facilityId } = useParams()
  const [facility, setFacility] = useState(null)
  const [pricing, setPricing] = useState({ monthly_price: '', period_rates: {}, note: '' })
  const [discounts, setDiscounts] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [message, setMessage] = useState(null)

  const loadDiscounts = useCallback(async () => {
    const { data, error } = await db.from('facility_discounts').select('*')
      .eq('facility_id', facilityId).order('created_at')
    if (error) setMessage({ type: 'error', text: toKoreanError(error) })
    else setDiscounts(data)
  }, [facilityId, db])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      db.from('facilities').select('id, name, status').eq('id', facilityId).maybeSingle(),
      db.from('facility_pricing').select('*').eq('facility_id', facilityId).maybeSingle(),
      db.from('facility_discounts').select('*').eq('facility_id', facilityId).order('created_at'),
    ]).then(([f, p, d]) => {
      if (cancelled) return
      const error = f.error || p.error || d.error
      if (error) setMessage({ type: 'error', text: toKoreanError(error) })
      setFacility(f.data)
      if (p.data) setPricing({ monthly_price: p.data.monthly_price || '', period_rates: p.data.period_rates || {}, note: p.data.note || '' })
      setDiscounts(d.data || [])
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [facilityId, db])

  // ---------- 기간권 저장 ----------
  function setRate(months, value) {
    setPricing({ ...pricing, period_rates: { ...pricing.period_rates, [months]: value } })
  }

  async function savePricing(e) {
    e.preventDefault()
    const rates = {}
    for (const m of PERIOD_MONTHS) {
      const r = Number(pricing.period_rates[m])
      if (!pricing.period_rates[m]) continue
      if (!(r > 0 && r < 100)) return setMessage({ type: 'error', text: `${m}개월 할인율은 1~99 사이 숫자로 적어 주세요.` })
      rates[m] = r
    }
    const { error } = await db.from('facility_pricing').upsert({
      facility_id: facilityId,
      monthly_price: Number(pricing.monthly_price) || 0,
      period_rates: rates,
      note: pricing.note.trim(),
      updated_at: new Date().toISOString(),
    })
    setMessage(error ? { type: 'error', text: toKoreanError(error) } : { type: 'info', text: '기간권 할인을 저장했어요. ✅' })
  }

  if (!loaded) return <Notice>⏳ 불러오는 중...</Notice>

  const previewPricing = {
    monthly_price: Number(pricing.monthly_price) || 0,
    period_rates: Object.fromEntries(Object.entries(pricing.period_rates).filter(([, v]) => Number(v) > 0)),
    note: pricing.note,
  }

  return (
    <section>
      <Link to={base} className="back-link">← 대시보드</Link>
      <p className="eyebrow">DISCOUNTS</p>
      <h1 className="section-title">{facility?.name || '시설'} 할인 제도</h1>
      <p className="section-desc">
        할인 정보는 바로 반영돼요. (시설 승인을 다시 받지 않아요) 시설이 "공개 중"일 때 이용자에게 보여요.
      </p>
      {message && <Notice type={message.type}>{message.text}</Notice>}

      {/* 1. 기간권 할인 */}
      <form onSubmit={savePricing} className="form card discount-form">
        <h2>🗓️ 기간권 할인 (개월 수별 할인율)</h2>
        <label className="narrow">1개월 정가(원)
          <input type="number" min="0" step="1000" required value={pricing.monthly_price}
            onChange={(e) => setPricing({ ...pricing, monthly_price: e.target.value })} placeholder="예: 100000" />
        </label>
        <div className="period-inputs">
          {PERIOD_MONTHS.map((m) => (
            <label key={m}>
              {m}개월
              <span className="input-suffix">
                <input type="number" min="0" max="99" step="0.5" value={pricing.period_rates[m] ?? ''}
                  onChange={(e) => setRate(m, e.target.value)} placeholder="0" />
                <span>%</span>
              </span>
            </label>
          ))}
        </div>
        <p className="muted small-text">비워 두면 그 기간은 할인 없음으로 표시하지 않아요.</p>
        <label>안내 문구 <small className="muted">(선택)</small>
          <input maxLength={200} value={pricing.note} onChange={(e) => setPricing({ ...pricing, note: e.target.value })} placeholder="예: 기간권은 중도 환불 시 정가 기준으로 계산돼요." />
        </label>
        <div><button type="submit" className="btn btn-dark btn-sm">기간권 할인 저장</button></div>
        {buildPeriodRows(previewPricing).length > 0 && (
          <div className="preview-box">
            <p className="muted small-text">미리보기 (이용자 화면)</p>
            <DiscountSection pricing={previewPricing} discounts={[]} />
          </div>
        )}
      </form>

      {/* 2. 할인쿠폰 · 카드할인 */}
      <DiscountEditor facilityId={facilityId} discounts={discounts} reload={loadDiscounts} setMessage={setMessage} />
    </section>
  )
}

function DiscountEditor({ facilityId, discounts, reload, setMessage }) {
  const { db } = useDb() // 진짜 DB 또는 체험판 DB
  const [form, setForm] = useState(EMPTY_DISCOUNT)
  const [editingId, setEditingId] = useState(null)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  function startEdit(d) {
    setEditingId(d.id)
    setForm({
      kind: d.kind, title: d.title, card_name: d.card_name || '', code: d.code || '',
      valueType: d.rate ? 'rate' : 'amount', value: d.rate ?? d.amount ?? '',
      condition: d.condition || '', starts_on: d.starts_on || '', ends_on: d.ends_on || '',
    })
  }

  async function save(e) {
    e.preventDefault()
    const value = Number(form.value)
    if (form.valueType === 'rate' && !(value > 0 && value <= 100)) return setMessage({ type: 'error', text: '할인율은 1~100% 사이로 적어 주세요.' })
    if (form.valueType === 'amount' && !(value > 0)) return setMessage({ type: 'error', text: '할인 금액을 적어 주세요.' })
    if (form.starts_on && form.ends_on && form.starts_on > form.ends_on) return setMessage({ type: 'error', text: '종료일이 시작일보다 빨라요.' })

    const row = {
      kind: form.kind,
      title: form.title.trim(),
      card_name: form.kind === 'card' ? form.card_name.trim() : '',
      code: form.kind === 'coupon' ? form.code.trim() : '',
      rate: form.valueType === 'rate' ? value : null,
      amount: form.valueType === 'amount' ? Math.round(value) : null,
      condition: form.condition.trim(),
      starts_on: form.starts_on || null,
      ends_on: form.ends_on || null,
    }
    const { error } = editingId
      ? await db.from('facility_discounts').update(row).eq('id', editingId)
      : await db.from('facility_discounts').insert({ ...row, facility_id: facilityId })
    if (error) return setMessage({ type: 'error', text: toKoreanError(error) })
    setMessage({ type: 'info', text: '할인을 저장했어요. ✅' })
    setForm(EMPTY_DISCOUNT)
    setEditingId(null)
    reload()
  }

  async function toggleActive(d) {
    const { error } = await db.from('facility_discounts').update({ active: !d.active }).eq('id', d.id)
    if (error) setMessage({ type: 'error', text: toKoreanError(error) })
    else reload()
  }

  async function remove(d) {
    if (!window.confirm(`"${d.title}" 할인을 삭제할까요?`)) return
    const { error } = await db.from('facility_discounts').delete().eq('id', d.id)
    if (error) setMessage({ type: 'error', text: toKoreanError(error) })
    else reload()
  }

  return (
    <>
      <form onSubmit={save} className="form card discount-form">
        <h2>{editingId ? '✏️ 할인 수정' : '🎟️ 할인쿠폰 · 💳 카드할인 추가'}</h2>
        <div className="role-choice small">
          <button type="button" className={form.kind === 'coupon' ? 'is-active' : ''} onClick={() => setForm({ ...form, kind: 'coupon' })}>🎟️ 할인쿠폰</button>
          <button type="button" className={form.kind === 'card' ? 'is-active' : ''} onClick={() => setForm({ ...form, kind: 'card' })}>💳 카드할인</button>
        </div>
        <label>할인 이름 *
          <input required maxLength={50} value={form.title} onChange={set('title')}
            placeholder={form.kind === 'coupon' ? '예: 신규회원 첫 달 할인' : '예: 신한카드 결제 시 할인'} />
        </label>
        <div className="form-row">
          {form.kind === 'card' ? (
            <label>카드사<input maxLength={30} value={form.card_name} onChange={set('card_name')} placeholder="예: 신한카드" /></label>
          ) : (
            <label>쿠폰 코드 <small className="muted">(선택)</small><input maxLength={30} value={form.code} onChange={set('code')} placeholder="예: WELCOME10" /></label>
          )}
          <label>할인
            <span className="input-suffix">
              <input type="number" required min="0" step={form.valueType === 'rate' ? '0.5' : '1000'} value={form.value} onChange={set('value')} />
              <select value={form.valueType} onChange={set('valueType')} aria-label="할인 단위">
                <option value="rate">%</option>
                <option value="amount">원</option>
              </select>
            </span>
          </label>
        </div>
        <label>조건 <small className="muted">(선택)</small><input maxLength={100} value={form.condition} onChange={set('condition')} placeholder="예: 6개월 이상 결제 시 / 첫 등록 1회" /></label>
        <div className="form-row">
          <label>시작일<input type="date" value={form.starts_on} onChange={set('starts_on')} /></label>
          <label>종료일<input type="date" value={form.ends_on} onChange={set('ends_on')} /></label>
        </div>
        <div className="link-buttons">
          <button type="submit" className="btn btn-dark btn-sm">{editingId ? '수정 저장' : '할인 추가'}</button>
          {editingId && <button type="button" className="btn btn-sm" onClick={() => { setEditingId(null); setForm(EMPTY_DISCOUNT) }}>취소</button>}
        </div>
      </form>

      {discounts.length === 0 ? <Notice>등록한 할인쿠폰·카드할인이 없어요.</Notice> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>종류</th><th>이름</th><th>할인</th><th>조건</th><th>기간</th><th>상태</th><th></th></tr></thead>
            <tbody>
              {discounts.map((d) => (
                <tr key={d.id} className={d.active ? '' : 'row-off'}>
                  <td>{d.kind === 'coupon' ? '🎟️ 쿠폰' : `💳 ${d.card_name || '카드'}`}</td>
                  <td><strong>{d.title}</strong>{d.code && <div className="muted small-text">코드 {d.code}</div>}</td>
                  <td>{discountText(d)}</td>
                  <td>{d.condition}</td>
                  <td className="small-text">{d.starts_on || '처음'} ~ {d.ends_on || '계속'}</td>
                  <td>
                    <button type="button" className={`status-badge ${d.active ? 'status-approved' : 'status-rejected'}`} onClick={() => toggleActive(d)}>
                      {d.active ? '사용 중' : '꺼짐'}
                    </button>
                  </td>
                  <td className="row-actions">
                    <button type="button" onClick={() => startEdit(d)}>수정</button>
                    <button type="button" onClick={() => remove(d)}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
