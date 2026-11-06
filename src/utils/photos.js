// Unsplash 무료 사진 도우미
// - 사진 목록: src/data/photos.json (사진을 바꾸려면 거기서 id·작가·링크만 바꾸면 돼요)
// - images.unsplash.com 주소 뒤에 w(가로 크기)를 붙이면 그 크기로 줄여서 보내 줘요 → 빠르게 로딩
import photos from '../data/photos.json'

export function getPhoto(key) {
  return photos[key] || null
}

export function photoUrl(key, width = 800) {
  const p = photos[key]
  if (!p) return ''
  return `https://images.unsplash.com/${p.id}?w=${width}&q=70&auto=format&fit=crop`
}
