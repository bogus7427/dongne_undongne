import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toKoreanError } from '../../lib/supabase.js'
import { useDb } from '../../lib/dbContext.js'
import { useAuth } from '../../hooks/authContext.js'
import { REGIONS, SIDO_LIST } from '../../data/regions.js'
import sports from '../../data/sports.json'
import { geocodeAddress } from '../../utils/facilities.js'
import Notice from '../../components/Notice.jsx'

const EMPTY = {
  name: '', sido: '', sigungu: '', address: '', phone: '', homepage: '',
  main_event: '', sport_ids: [], description: '',
}

// 시설 등록(/biz/facilities/new) · 수정(/biz/facilities/:facilityId/edit)
export default function FacilityFormPage() {
  const { facilityId } = useParams()
  const isEdit = Boolean(facilityId)
  const { user } = useAuth()
  const { db, isDemo, base } = useDb() // 진짜 DB 또는 체험판 DB
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [loaded, setLoaded] = useState(!isEdit)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // 수정이면 기존 값 불러오기
  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    db.from('facilities').select('*').eq('id', facilityId).maybeSingle().then(({ data, error }) => {
      if (cancelled) return
      if (error || !data) setError(error ? toKoreanError(error) : '시설을 찾을 수 없어요.')
      else setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, data[k] ?? EMPTY[k]])))
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [isEdit, facilityId, db])

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const toggleSport = (id) =>
    setForm({
      ...form,
      sport_ids: form.sport_ids.includes(id) ? form.sport_ids.filter((s) => s !== id) : [...form.sport_ids, id],
    })

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.homepage && !/^https:\/\//.test(form.homepage)) {
      return setError('홈페이지 주소는 https:// 로 시작해야 해요. (없으면 비워 두세요)')
    }
    setBusy(true)
    // 주소로 지도 좌표 찾기 (카카오 도메인 등록 전에는 실패할 수 있어요 → 좌표 없이 저장)
    const position = await geocodeAddress(form.address).catch(() => null)
    const row = {
      ...form,
      name: form.name.trim(),
      address: form.address.trim(),
      lat: position?.lat ?? null,
      lng: position?.lng ?? null,
    }
    const query = isEdit
      ? db.from('facilities').update(row).eq('id', facilityId)
      : db.from('facilities').insert({ ...row, owner_id: user?.id ?? 'demo-owner', status: isDemo ? 'approved' : 'pending' })
    const { error } = await query
    setBusy(false)
    if (error) return setError(toKoreanError(error))
    navigate(base, { replace: true })
  }

  async function handleDelete() {
    if (!window.confirm('이 시설과 등록된 회원·출석·수강료 기록이 모두 삭제돼요. 정말 삭제할까요?')) return
    const { error } = await db.from('facilities').delete().eq('id', facilityId)
    if (error) return setError(toKoreanError(error))
    navigate(base, { replace: true })
  }

  if (!loaded) return <Notice>⏳ 불러오는 중...</Notice>

  return (
    <section className="form-page">
      <Link to={base} className="back-link">← 대시보드</Link>
      <p className="eyebrow">{isEdit ? 'EDIT' : 'REGISTER'}</p>
      <h1 className="section-title">{isEdit ? '시설 정보 수정' : '시설 등록'}</h1>
      <Notice>저장하면 <strong>관리자 확인(승인 대기)</strong> 후 시설 찾기에 공개돼요.</Notice>

      <form onSubmit={handleSubmit} className="form card">
        <label>시설 이름 *<input required maxLength={60} value={form.name} onChange={set('name')} placeholder="예: 동네필라테스 강남점" /></label>
        <div className="form-row">
          <label>시/도 *
            <select required value={form.sido} onChange={(e) => setForm({ ...form, sido: e.target.value, sigungu: '' })}>
              <option value="">선택</option>
              {SIDO_LIST.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>시/군/구 *
            <select required value={form.sigungu} onChange={set('sigungu')} disabled={!form.sido}>
              <option value="">선택</option>
              {(REGIONS[form.sido] || []).map((g) => <option key={g}>{g}</option>)}
            </select>
          </label>
        </div>
        <label>도로명 주소 *<input required maxLength={120} value={form.address} onChange={set('address')} placeholder="예: 서울특별시 강남구 테헤란로 123 2층" /></label>
        <div className="form-row">
          <label>연락처<input type="tel" maxLength={20} value={form.phone} onChange={set('phone')} placeholder="02-000-0000" /></label>
          <label>홈페이지 (https://)<input type="url" maxLength={200} value={form.homepage} onChange={set('homepage')} placeholder="https://" /></label>
        </div>
        <label>주종목<input maxLength={30} value={form.main_event} onChange={set('main_event')} placeholder="예: 필라테스, 태권도" /></label>

        <fieldset className="sport-checks">
          <legend>할 수 있는 운동 (해당하는 것 모두)</legend>
          {sports.map((s) => (
            <label key={s.id} className={`chip-btn ${form.sport_ids.includes(s.id) ? 'is-active' : ''}`}>
              <input type="checkbox" checked={form.sport_ids.includes(s.id)} onChange={() => toggleSport(s.id)} />
              {s.emoji} {s.name}
            </label>
          ))}
        </fieldset>

        <label>소개 <small className="muted">(운영 시간, 강좌, 특징 등)</small>
          <textarea rows={5} maxLength={1000} value={form.description} onChange={set('description')} />
        </label>

        {error && <Notice type="error">{error}</Notice>}
        <div className="link-buttons">
          <button type="submit" className="btn btn-dark" disabled={busy}>{busy ? '저장 중...' : isEdit ? '수정하고 다시 승인 요청' : '등록 신청'}</button>
          {isEdit && <button type="button" className="btn btn-danger" onClick={handleDelete}>시설 삭제</button>}
        </div>
      </form>
    </section>
  )
}
