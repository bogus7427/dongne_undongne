// 위치와 거리 관련 도우미 함수

// 두 좌표 사이의 거리(km) - 하버사인 공식 (지구를 공 모양으로 보고 계산)
export function getDistanceKm(a, b) {
  const R = 6371 // 지구 반지름(km)
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// 브라우저에게 내 위치를 물어봅니다. 성공하면 { lat, lng }
// 실패하면 이유를 담은 오류: code가 'denied'면 사용자가 권한을 거부한 것
export function getMyLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ code: 'unsupported', message: '이 브라우저는 위치 찾기를 지원하지 않아요.' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject({ code: 'denied', message: '위치 권한이 거부되었어요. 지역을 직접 선택해 주세요.' })
        } else {
          reject({ code: 'failed', message: '위치를 찾지 못했어요. 지역을 직접 선택해 주세요.' })
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    )
  })
}
