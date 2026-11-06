import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadKakaoMap } from '../utils/loadKakaoMap.js'
import { facilityPath } from '../utils/links.js'

// 시설 목록을 받아 지도에 마커로 보여 주는 컴포넌트
// - facilities: 표시할 시설 배열 (lat, lng 필요)
// - myLocation: 내 위치 { lat, lng } (있으면 파란 점 + 반경 원 표시)
// - radiusKm: 반경 원 크기(km)
// - height: 지도 높이
export default function KakaoMap({ facilities = [], myLocation = null, radiusKm = 3, height = 520 }) {
  const boxRef = useRef(null)       // 지도가 그려질 div
  const mapRef = useRef(null)       // 만든 지도 객체 보관
  const clustererRef = useRef(null) // 마커 클러스터 보관
  const infoRef = useRef(null)      // 말풍선 보관
  const extraRef = useRef([])       // 내 위치 점·원 보관 (다시 그릴 때 지우려고)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  // 1) 처음 한 번: 지도 만들기
  useEffect(() => {
    let cancelled = false
    loadKakaoMap()
      .then((kakao) => {
        if (cancelled || !boxRef.current) return
        mapRef.current = new kakao.maps.Map(boxRef.current, {
          center: new kakao.maps.LatLng(37.5665, 126.978), // 기본: 서울시청
          level: 7,
        })
        mapRef.current.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT)
        clustererRef.current = new kakao.maps.MarkerClusterer({
          map: mapRef.current,
          averageCenter: true,
          minLevel: 6, // 이 정도 이상 축소하면 마커를 묶어서 숫자로 표시
        })
        infoRef.current = new kakao.maps.InfoWindow({ removable: true })
        setReady(true)
      })
      .catch((e) => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [])

  // 2) 시설 목록·내 위치가 바뀔 때마다: 마커 다시 그리기
  useEffect(() => {
    if (!ready) return
    const kakao = window.kakao
    const map = mapRef.current
    clustererRef.current.clear()
    infoRef.current.close()
    extraRef.current.forEach((item) => item.setMap(null))
    extraRef.current = []

    const bounds = new kakao.maps.LatLngBounds()
    let hasPoint = false

    // 내 위치: 파란 원(반경) + 가운데 점
    if (myLocation) {
      const center = new kakao.maps.LatLng(myLocation.lat, myLocation.lng)
      const circle = new kakao.maps.Circle({
        map, center, radius: radiusKm * 1000,
        strokeWeight: 2, strokeColor: '#0f296b', strokeOpacity: 0.6,
        fillColor: '#0f296b', fillOpacity: 0.06,
      })
      const dot = new kakao.maps.CustomOverlay({
        map, position: center, content: '<div class="my-location-dot"></div>',
      })
      extraRef.current.push(circle, dot)
      bounds.extend(circle.getBounds().getSouthWest())
      bounds.extend(circle.getBounds().getNorthEast())
      hasPoint = true
    }

    const valid = facilities.filter((f) => f.lat && f.lng)
    const markers = valid.map((f) => {
      const position = new kakao.maps.LatLng(f.lat, f.lng)
      if (!myLocation) bounds.extend(position) // 내 위치가 있으면 원 기준으로 맞춤
      hasPoint = true
      const marker = new kakao.maps.Marker({ position, title: f.name })

      // 마커를 누르면 말풍선, 말풍선의 버튼을 누르면 상세 페이지로
      kakao.maps.event.addListener(marker, 'click', () => {
        const box = document.createElement('div')
        box.className = 'map-info'
        const title = document.createElement('strong')
        title.textContent = f.name
        const btn = document.createElement('button')
        btn.textContent = '상세 보기 →'
        btn.onclick = () => navigate(facilityPath(f))
        box.append(title, btn)
        infoRef.current.setContent(box)
        infoRef.current.open(map, marker)
      })
      return marker
    })
    clustererRef.current.addMarkers(markers)

    if (!hasPoint) return
    if (!myLocation && valid.length === 1) {
      map.setLevel(3)
      map.setCenter(new kakao.maps.LatLng(valid[0].lat, valid[0].lng))
    } else {
      map.setBounds(bounds) // 모든 마커(또는 반경 원)가 보이게 자동 확대/축소
    }
  }, [ready, facilities, myLocation, radiusKm, navigate])

  if (error) {
    return <div className="map-placeholder" style={{ minHeight: height }}>⚠️ {error}</div>
  }
  return <div ref={boxRef} className="kakao-map" style={{ height }} />
}
