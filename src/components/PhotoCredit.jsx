import { getPhoto } from '../utils/photos.js'
import ExternalLink from './ExternalLink.jsx'

// 사진 작가 표시: "Photo: 작가 / Unsplash" (Unsplash 권장 방식)
export default function PhotoCredit({ photoKey, className = '' }) {
  const p = getPhoto(photoKey)
  if (!p) return null
  return (
    <span className={`photo-credit ${className}`}>
      Photo: <ExternalLink href={`${p.page}?utm_source=dongne_undong&utm_medium=referral`}>{p.author}</ExternalLink>
      {' / '}
      <ExternalLink href="https://unsplash.com/?utm_source=dongne_undong&utm_medium=referral">Unsplash</ExternalLink>
    </span>
  )
}
