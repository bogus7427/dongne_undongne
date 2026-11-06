import { Link } from 'react-router-dom'
import sports from '../data/sports.json'
import FavoriteButton from './FavoriteButton.jsx'
import { facilityPath } from '../utils/links.js'

// 시설 목록에 나오는 카드 하나
// 카드 전체를 누르면 상세로 가고, ♡ 버튼은 따로 눌러져요. (링크 안에 버튼을 넣지 않으려고 이렇게 만들었어요)
export default function FacilityCard({ facility }) {
  const sportList = (facility.sportIds || [])
    .map((id) => sports.find((s) => s.id === id))
    .filter(Boolean)

  return (
    <div className="card facility-card">
      <div className="facility-card-top">
        <span className="badges">
          <span className="region-badge">{facility.sido} {facility.sigungu}</span>
          {facility.kind === 'voucher' && <span className="voucher-badge">💳 이용권</span>}
          {facility.kind === 'registered' && <span className="registered-badge">✔ 등록 업체</span>}
          {facility.maxDiscount ? (
            <span className="discount-badge">💸 최대 {facility.maxDiscount}% 할인</span>
          ) : facility.hasDiscount && (
            <span className="discount-badge">💸 할인 있음 · 🔒 회원 공개</span>
          )}
        </span>
        <div className="facility-card-right">
          {facility.distance != null && (
            <span className="distance">{facility.distance.toFixed(1)}km</span>
          )}
          <FavoriteButton facility={facility} />
        </div>
      </div>
      <h3 className="facility-name">
        <Link to={facilityPath(facility)} className="stretched-link">{facility.name}</Link>
      </h3>
      <p className="facility-address">{facility.address || facility.facilityType}</p>
      <div className="chips">
        {sportList.map((s) => (
          <span key={s.id} className="chip">{s.emoji} {s.name}</span>
        ))}
        {/* 8개 종목에 없는 종목(태권도, 복싱 등)은 그대로 보여 줘요 */}
        {sportList.length === 0 && facility.mainEvent && <span className="chip">{facility.mainEvent}</span>}
      </div>
    </div>
  )
}
