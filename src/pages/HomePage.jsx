import { Link } from 'react-router-dom'
import sports from '../data/sports.json'
import SportCard from '../components/SportCard.jsx'

const basicSports = sports.filter((s) => s.group !== 'martial')
const martialCount = sports.length - basicSports.length

export default function HomePage() {
  return (
    <>
      {/* 1. 큰 소개 영역 (히어로) */}
      <section className="hero">
        <p className="eyebrow">FIND YOUR SPORTS</p>
        <h1 className="hero-title">
          운동, 어디서부터<br />시작할지 고민될 때
        </h1>
        <p className="hero-desc">
          운동별로 무엇을 배우는지 알아보고,<br className="only-pc" />
          가까운 공공체육시설을 지도에서 찾아보세요.
        </p>
        <div className="hero-buttons">
          <Link to="/search?mode=near" className="btn btn-dark">📍 내 주변 찾기</Link>
          <Link to="/search?mode=region" className="btn">🗺️ 지역 선택</Link>
        </div>

        {/* 숫자 통계 줄 */}
        <ul className="stats">
          <li><strong>{sports.length}</strong><span>운동 종목</span></li>
          <li><strong>17</strong><span>시·도 전국</span></li>
          <li><strong>3</strong><span>단계별 안내</span></li>
          <li><strong>0원</strong><span>이용 요금</span></li>
        </ul>
      </section>

      {/* 2. 운동 종류 카드 */}
      <section className="section">
        <p className="eyebrow">SPORTS</p>
        <h2 className="section-title">어떤 운동을 시작해 볼까요?</h2>
        <p className="section-desc">카드를 누르면 배우는 내용과 준비물을 볼 수 있어요.</p>
        <div className="sport-grid">
          {basicSports.map((sport) => (
            <SportCard key={sport.id} sport={sport} />
          ))}
          {/* 무술은 하나로 묶어서 */}
          <Link to="/martial" className="sport-card sport-card-martial">
            <div className="sport-card-icon">🥋</div>
            <p className="sport-card-en">MARTIAL ARTS</p>
            <h3 className="sport-card-name">무술 통합</h3>
            <p className="sport-card-summary">태권도·합기도·주짓수·유도·킥복싱 등 {martialCount}종</p>
          </Link>
        </div>
      </section>

      {/* 3. 국가 지원 제도 */}
      <section className="section support-teaser">
        <p className="eyebrow">SUPPORT</p>
        <h2 className="section-title">운동비, 나라에서 지원받을 수 있어요</h2>
        <p className="section-desc">스포츠강좌이용권, 무료 체력 측정 등 받을 수 있는 지원을 확인해 보세요.</p>
        <Link to="/supports" className="btn">지원 제도 보러 가기 →</Link>
      </section>

      {/* 4. 아래쪽 안내 띠 */}
      <section className="cta-band">
        <div>
          <p className="eyebrow eyebrow-light">PUBLIC SPORTS FACILITY</p>
          <h2>우리 동네 공공체육시설, 지금 찾아보세요</h2>
        </div>
        <Link to="/search?mode=region" className="btn btn-white">시설 찾으러 가기 →</Link>
      </section>
    </>
  )
}
