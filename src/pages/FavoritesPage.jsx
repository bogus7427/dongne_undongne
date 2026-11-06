import { Link } from 'react-router-dom'
import { useFavorites } from '../hooks/useFavorites.js'
import FacilityCard from '../components/FacilityCard.jsx'
import Notice from '../components/Notice.jsx'
import DataSource from '../components/DataSource.jsx'

export default function FavoritesPage() {
  const { favorites } = useFavorites()

  return (
    <section>
      <p className="eyebrow">FAVORITES</p>
      <h1 className="section-title">즐겨찾기</h1>
      <p className="section-desc">♡를 눌러 저장한 시설이에요. 이 기기의 브라우저에만 저장돼요.</p>

      {favorites.length === 0 ? (
        <Notice>
          아직 저장한 시설이 없어요. <Link to="/search">시설 찾으러 가기 →</Link>
        </Notice>
      ) : (
        <div className="facility-list grid-2">
          {favorites.map((f) => <FacilityCard key={f.id} facility={f} />)}
        </div>
      )}

      <DataSource />
    </section>
  )
}
