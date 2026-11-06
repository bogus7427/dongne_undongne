// API의 "업종명(fcob_nm) / 시설유형명(ftype_nm) / 주종목"과 우리 종목(sports.json의 id)을 연결하는 표
//
// 실제 API에서 확인한 값 예시:
//   공공체육시설: 간이운동장, 테니스장, 수영장, 생활체육관, 구기체육관, 축구장, 투기체육관 ...
//   이용권 시설 주종목: 태권도, 합기도, 유도, 복싱, 검도, 주짓수, 필라테스, 헬스, 수영 ...
//
// 아래 단어가 들어 있으면 그 운동을 할 수 있다고 봐요.
export const SPORT_KEYWORDS = {
  swimming: ['수영'],
  fitness: ['체력단련', '헬스', '피트니스', '생활체육관', '국민체육센터', '스포츠센터', '종합체육시설'],
  yoga: ['요가'],
  pilates: ['필라테스'],
  badminton: ['배드민턴', '생활체육관', '구기체육관', '다목적체육관'],
  tabletennis: ['탁구', '생활체육관', '구기체육관'],
  tennis: ['테니스'],
  soccer: ['축구', '풋살'],
}

// 무술 종목 (sports.json 에서 group: "martial")
export const MARTIAL_KEYWORDS = {
  taekwondo: ['태권도'],
  hapkido: ['합기도'],
  jiujitsu: ['주짓수', '주지츠', '유술'],
  judo: ['유도'],
  kickboxing: ['킥복싱'],
  boxing: ['복싱'],
  kendo: ['검도'],
  muaythai: ['무에타이'],
  mma: ['종합격투기', 'MMA', 'mma'],
}

// "무술 전체"로 묶이는 추가 단어 (공공시설의 "투기체육관" 등)
const MARTIAL_EXTRA = ['투기', '무술', '무도', '격투', '도장']

export const MARTIAL_ALL = 'martial' // 검색에서 "🥋 무술 전체" 필터 값

const hasAny = (text, words) => words.some((w) => text.includes(w))

// 시설 하나를 넣으면 할 수 있는 종목 id 목록을 돌려줍니다.
// - 이용권 시설: 주종목(industry)으로 판단, 무술은 시설 이름도 함께 봐요 (예: "OO킥복싱", 주종목은 "복싱")
// - 공공시설: 업종명 + 시설유형명 + 시설 이름 ("부산 수영구"의 '수영'은 빼고 봐요)
export function getSportIds(facility) {
  const name = String(facility.name || '')
  const base = facility.kind === 'voucher'
    ? String(facility.industry || '')
    : [facility.industry, facility.facilityType, name.replaceAll('수영구', '')].join(' ')
  const martialText = `${base} ${name}`

  const ids = Object.keys(SPORT_KEYWORDS).filter((id) => hasAny(base, SPORT_KEYWORDS[id]))

  const martialIds = Object.keys(MARTIAL_KEYWORDS).filter((id) => {
    // "킥복싱"만 있는 곳은 복싱으로 따로 세지 않아요.
    if (id === 'boxing') return hasAny(martialText.replaceAll('킥복싱', ''), MARTIAL_KEYWORDS.boxing)
    return hasAny(martialText, MARTIAL_KEYWORDS[id])
  })
  ids.push(...martialIds)
  if (martialIds.length || hasAny(base, MARTIAL_EXTRA)) ids.push(MARTIAL_ALL)
  return ids
}
