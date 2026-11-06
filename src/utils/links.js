// 시설 정보로 외부 링크 목록을 만드는 함수
// - 내용을 가져오지 않고 "링크로만" 연결해요.
// - 공식 홈페이지는 https:// 로 시작하는 올바른 주소일 때만 보여 줘요.
//   (http:// 이거나 비어 있거나 형식이 틀리면 검색 링크만)

export function getSafeHomepage(url) {
  const text = String(url || '').trim()
  if (!text.startsWith('https://')) return null
  try {
    const parsed = new URL(text)
    return parsed.protocol === 'https:' && parsed.hostname.includes('.') ? parsed.href : null
  } catch {
    return null
  }
}

export function buildFacilityLinks(facility) {
  // 검색어: "시설명 + 시군구" (예: "포이테니스장 강남구")
  const query = `${facility.name} ${facility.sigungu}`.trim()
  const q = encodeURIComponent(query)

  const links = []
  const homepage = getSafeHomepage(facility.homepage)
  if (homepage) {
    links.push({ key: 'home', label: '공식 홈페이지', icon: '🏠', href: homepage, primary: true })
  }
  links.push(
    { key: 'kakao', label: '카카오맵', icon: '🗺️', href: `https://map.kakao.com/?q=${q}` },
    { key: 'naver', label: '네이버 검색', icon: '🔍', href: `https://search.naver.com/search.naver?query=${q}` },
    { key: 'blog', label: '네이버 블로그', icon: '📝', href: `https://search.naver.com/search.naver?where=blog&query=${q}` },
  )
  return links
}

// 시설 상세 페이지 주소 (지역 정보를 같이 넣어야 상세 화면에서 다시 찾을 수 있어요)
// 이용권 시설(kind: 'voucher')은 상세 화면이 달라요.
export function facilityPath(facility) {
  const base = { voucher: '/voucher', registered: '/place' }[facility.kind] || '/facility'
  return `${base}/${facility.id}?${new URLSearchParams({ sido: facility.sido, sigungu: facility.sigungu })}`
}
