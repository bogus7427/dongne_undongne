import { useFavorites } from '../hooks/useFavorites.js'

// ♡ / ♥ 즐겨찾기 버튼
export default function FavoriteButton({ facility, withText = false }) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const saved = isFavorite(facility.id)

  return (
    <button
      type="button"
      className={`fav-btn ${saved ? 'is-saved' : ''} ${withText ? 'with-text' : ''}`}
      onClick={() => toggleFavorite(facility)}
      aria-pressed={saved}
      aria-label={saved ? '즐겨찾기 해제' : '즐겨찾기 추가'}
    >
      {saved ? '♥' : '♡'}
      {withText && <span>{saved ? ' 저장됨' : ' 즐겨찾기'}</span>}
    </button>
  )
}
