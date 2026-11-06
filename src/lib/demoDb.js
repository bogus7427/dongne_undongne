// 체험(데모)용 가짜 데이터베이스
// - Supabase와 똑같은 모양으로 쓸 수 있게 만든 작은 흉내 버전이에요.
//   db.from('members').select('*').eq('facility_id', 'demo').order('created_at')
// - 데이터는 내 브라우저(localStorage)에만 저장돼요.

const KEY = 'demo-db:v1'
export const DEMO_FACILITY_ID = 'demo'

const monthOf = (offset = 0) => {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  return d.toLocaleDateString('sv-SE').slice(0, 7)
}
const uid = () => Math.random().toString(36).slice(2, 10)

// 처음 보여 줄 예시 데이터
function seed() {
  const names = [
    ['김민준', '초등부 4시반', 120000], ['이서연', '초등부 4시반', 120000], ['박도윤', '초등부 5시반', 120000],
    ['최하은', '중등부 6시반', 140000], ['정시우', '중등부 6시반', 140000], ['강지아', '성인부 8시', 150000],
    ['조현우', '성인부 8시', 150000], ['윤수아', '초등부 5시반', 120000], ['장예준', '성인부 8시', 150000],
    ['임하린', '중등부 6시반', 140000],
  ]
  const members = names.map(([name, course, fee], i) => ({
    id: `m${i + 1}`, facility_id: DEMO_FACILITY_ID, name,
    phone: `010-0000-${String(1001 + i)}`, course, monthly_fee: fee,
    joined_on: `2026-0${(i % 9) + 1}-0${(i % 8) + 1}`,
    status: i === 8 ? 'paused' : 'active', memo: i === 0 ? '형제 할인 적용' : '',
    created_at: new Date(2026, 0, i + 1).toISOString(),
  }))

  // 이번 달 출석 기록 (회원마다 다르게)
  const attendance = []
  const now = new Date()
  for (let day = 1; day <= now.getDate(); day++) {
    const date = new Date(now.getFullYear(), now.getMonth(), day).toLocaleDateString('sv-SE')
    members.forEach((m, i) => {
      if (m.status === 'active' && (day + i) % 3 !== 0) attendance.push({ id: uid(), facility_id: DEMO_FACILITY_ID, member_id: m.id, date })
    })
  }

  // 이번 달 수강료: 7명 납부, 나머지 미납 / 지난달은 모두 납부
  const methods = ['카드', '계좌이체', '현금', '이용권']
  const payments = []
  members.forEach((m, i) => {
    payments.push({ id: uid(), facility_id: DEMO_FACILITY_ID, member_id: m.id, month: monthOf(-1), amount: m.monthly_fee, method: methods[i % 4], paid_on: `${monthOf(-1)}-05` })
    if (i < 7) payments.push({ id: uid(), facility_id: DEMO_FACILITY_ID, member_id: m.id, month: monthOf(0), amount: m.monthly_fee, method: methods[i % 4], paid_on: `${monthOf(0)}-03` })
  })

  return {
    facilities: [{ id: DEMO_FACILITY_ID, name: '동네태권도 (체험용 예시)', status: 'approved' }],
    members,
    attendance,
    payments,
    facility_pricing: [{ facility_id: DEMO_FACILITY_ID, monthly_price: 120000, period_rates: { 3: 5, 6: 10, 12: 20 }, note: '형제가 함께 등록하면 추가 할인돼요.' }],
    facility_discounts: [
      { id: uid(), facility_id: DEMO_FACILITY_ID, kind: 'coupon', title: '신규회원 첫 달 할인', code: 'WELCOME', card_name: '', rate: 20, amount: null, condition: '첫 등록 1회', starts_on: null, ends_on: null, active: true, created_at: new Date().toISOString() },
      { id: uid(), facility_id: DEMO_FACILITY_ID, kind: 'card', title: '신한카드 결제 할인', code: '', card_name: '신한카드', rate: null, amount: 10000, condition: '6개월 이상 결제 시', starts_on: null, ends_on: null, active: true, created_at: new Date().toISOString() },
    ],
  }
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    if (saved) return saved
  } catch { /* 깨졌으면 새로 */ }
  const data = seed()
  save(data)
  return data
}
function save(data) { localStorage.setItem(KEY, JSON.stringify(data)) }

export function resetDemo() { save(seed()) }

// Supabase 쿼리처럼 이어서 쓸 수 있는 객체
class Query {
  constructor(table) {
    this.table = table
    this.filters = []
    this.action = 'select'
    this.payload = null
    this.single = false
    this.sort = null
    this.max = null
    this.conflict = null
  }
  select() { if (this.action === 'select') this.action = 'select'; return this }
  eq(col, val) { this.filters.push((r) => String(r[col]) === String(val)); return this }
  gte(col, val) { this.filters.push((r) => r[col] >= val); return this }
  lt(col, val) { this.filters.push((r) => r[col] < val); return this }
  in(col, vals) { this.filters.push((r) => vals.map(String).includes(String(r[col]))); return this }
  order(col, opts = {}) { this.sort = { col, asc: opts.ascending !== false }; return this }
  limit(n) { this.max = n; return this }
  maybeSingle() { this.single = true; return this }
  insert(rows) { this.action = 'insert'; this.payload = [].concat(rows); return this }
  update(patch) { this.action = 'update'; this.payload = patch; return this }
  delete() { this.action = 'delete'; return this }
  upsert(row, opts = {}) { this.action = 'upsert'; this.payload = row; this.conflict = opts.onConflict; return this }

  run() {
    const db = load()
    const rows = db[this.table] || (db[this.table] = [])
    const match = (r) => this.filters.every((f) => f(r))

    if (this.action === 'insert') {
      const created = this.payload.map((r) => ({ id: uid(), created_at: new Date().toISOString(), status: 'active', active: true, ...r }))
      // 출석처럼 같은 날 중복이면 무시
      if (this.table === 'attendance') {
        const dup = created.some((c) => rows.some((r) => r.member_id === c.member_id && r.date === c.date))
        if (dup) return { data: null, error: null }
      }
      rows.push(...created)
      save(db)
      return { data: created, error: null }
    }
    if (this.action === 'update') {
      rows.forEach((r) => { if (match(r)) Object.assign(r, this.payload) })
      save(db)
      return { data: null, error: null }
    }
    if (this.action === 'delete') {
      db[this.table] = rows.filter((r) => !match(r))
      save(db)
      return { data: null, error: null }
    }
    if (this.action === 'upsert') {
      const keys = (this.conflict || (this.table === 'facility_pricing' ? 'facility_id' : 'id')).split(',')
      const found = rows.find((r) => keys.every((k) => String(r[k]) === String(this.payload[k])))
      if (found) Object.assign(found, this.payload)
      else rows.push({ id: uid(), ...this.payload })
      save(db)
      return { data: null, error: null }
    }

    let data = rows.filter(match)
    if (this.sort) {
      const { col, asc } = this.sort
      data = [...data].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1))
    }
    if (this.max) data = data.slice(0, this.max)
    data = JSON.parse(JSON.stringify(data))
    return { data: this.single ? data[0] || null : data, error: null }
  }

  // await 할 수 있게 (Promise처럼 동작)
  then(resolve, reject) {
    try { resolve(this.run()) } catch (e) { reject?.(e) }
  }
}

export const demoDb = { from: (table) => new Query(table) }
