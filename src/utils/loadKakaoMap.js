// 카카오맵 스크립트를 "한 번만" 불러오는 함수
// 여러 화면에서 불러도 스크립트는 1번만 추가되고, 같은 Promise를 돌려줍니다.
let loadingPromise = null

export function loadKakaoMap() {
  if (window.kakao?.maps?.LatLng) return Promise.resolve(window.kakao)
  if (loadingPromise) return loadingPromise

  const key = import.meta.env.VITE_KAKAO_MAP_KEY
  if (!key) {
    return Promise.reject(new Error('카카오맵 키가 없어요. .env 파일에 VITE_KAKAO_MAP_KEY를 넣고 npm run dev를 다시 실행하세요.'))
  }

  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    // autoload=false: 다 불러온 뒤 우리가 직접 kakao.maps.load()로 시작
    // libraries=clusterer,services: 마커 클러스터 + 주소/지역 찾기 기능 같이 불러오기
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=clusterer,services`
    script.onload = () => window.kakao.maps.load(() => resolve(window.kakao))
    script.onerror = () => {
      loadingPromise = null
      reject(new Error('카카오맵을 불러오지 못했어요. 키와 등록한 도메인(localhost:5173)을 확인하세요.'))
    }
    document.head.appendChild(script)
  })
  return loadingPromise
}
