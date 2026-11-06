import { Link } from 'react-router-dom'
import { photoUrl } from '../utils/photos.js'

// 종목별 대표 색 (카드 위쪽 띠와 아이콘 배경)
const COLORS = {
  swimming: '#00a8e8', fitness: '#ff5a1f', yoga: '#9b5de5', pilates: '#f15bb5',
  badminton: '#00bb6d', tabletennis: '#ff3b3b', tennis: '#b5d900', soccer: '#1e9e3a',
  taekwondo: '#1d4ed8', hapkido: '#7c3aed', jiujitsu: '#0f766e', judo: '#2563eb',
  kickboxing: '#ea580c', boxing: '#dc2626', kendo: '#334155', muaythai: '#c2410c', mma: '#111827',
}

// 홈·무술 화면의 운동 종류 카드 하나 (위: 사진, 아래: 설명)
export default function SportCard({ sport }) {
  const img = photoUrl(sport.id, 600)
  return (
    <Link to={`/sports/${sport.id}`} className="sport-card has-photo" style={{ '--c': COLORS[sport.id] || '#0f296b' }}>
      {img && (
        <div className="sport-card-photo">
          {/* loading="lazy": 화면에 보일 때만 사진을 불러와요 */}
          <img src={img} alt={`${sport.name} 사진`} loading="lazy" decoding="async" />
        </div>
      )}
      <div className="sport-card-icon">{sport.emoji}</div>
      <p className="sport-card-en">{sport.nameEn}</p>
      <h3 className="sport-card-name">{sport.name}</h3>
      <p className="sport-card-summary">{sport.summary}</p>
    </Link>
  )
}
