import { Link } from 'react-router-dom'

// 홈 화면의 운동 종류 카드 하나
export default function SportCard({ sport }) {
  return (
    <Link to={`/sports/${sport.id}`} className="sport-card">
      <div className="sport-card-icon">{sport.emoji}</div>
      <p className="sport-card-en">{sport.nameEn}</p>
      <h3 className="sport-card-name">{sport.name}</h3>
      <p className="sport-card-summary">{sport.summary}</p>
    </Link>
  )
}
