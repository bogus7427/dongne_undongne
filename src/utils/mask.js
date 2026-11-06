// 개인정보 가리기 (화면에 보일 때만 가려요. 저장된 값은 그대로예요)

// 김민준 → 김*준, 이현 → 이*, 남궁민수 → 남**수
export function maskName(name = '') {
  const s = String(name).trim()
  if (s.length <= 1) return s
  if (s.length === 2) return `${s[0]}*`
  return `${s[0]}${'*'.repeat(s.length - 2)}${s[s.length - 1]}`
}

// 010-1234-5678 → 010-****-5678
export function maskPhone(phone = '') {
  const digits = String(phone).replace(/\D/g, '')
  if (digits.length < 8) return phone ? '***' : ''
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`
}

// 120000 → ***,***원
export function maskMoney(amount) {
  if (!amount) return '-'
  // 숫자 자리만 *로 바꿔서 쉼표 위치는 그대로: 120,000 → ***,***
  return `${Number(amount).toLocaleString().replace(/\d/g, '*')}원`
}

export function formatMoney(amount) {
  return amount ? `${Number(amount).toLocaleString()}원` : '-'
}
