// 즐겨찾기: localStorage에 저장하고, 여러 화면이 같은 값을 보도록 해 주는 훅
import { useSyncExternalStore } from 'react'

const KEY = 'favorites:v1'
const EVENT = 'favorites-change'

// 저장할 때는 화면에 필요한 값만 남겨요. (API를 다시 부르지 않아도 즐겨찾기 화면을 그릴 수 있게)
const FIELDS = ['kind', 'brno', 'facilSn', 'mainEvent', 'roadAddress', 'id', 'name', 'sido', 'sigungu', 'address', 'phone', 'lat', 'lng', 'industry', 'facilityType', 'homepage', 'sportIds']

let cachedRaw = null
let cachedList = []

function read() {
  const raw = localStorage.getItem(KEY) || '[]'
  if (raw !== cachedRaw) {
    // 값이 바뀌었을 때만 새 배열을 만들어요. (같은 배열을 돌려줘야 React가 쓸데없이 다시 그리지 않아요)
    cachedRaw = raw
    try { cachedList = JSON.parse(raw) } catch { cachedList = [] }
  }
  return cachedList
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list))
  window.dispatchEvent(new Event(EVENT)) // 같은 탭의 다른 화면들에게 알림
}

function subscribe(callback) {
  window.addEventListener(EVENT, callback)
  window.addEventListener('storage', callback) // 다른 탭에서 바뀐 경우
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, read)

  const isFavorite = (id) => favorites.some((f) => f.id === id)

  const toggleFavorite = (facility) => {
    const list = read()
    if (list.some((f) => f.id === facility.id)) {
      write(list.filter((f) => f.id !== facility.id))
    } else {
      const slim = Object.fromEntries(FIELDS.map((k) => [k, facility[k]]))
      write([{ ...slim, savedAt: Date.now() }, ...list])
    }
  }

  return { favorites, isFavorite, toggleFavorite }
}
