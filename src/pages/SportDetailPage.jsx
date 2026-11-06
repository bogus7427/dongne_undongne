import { Link, useParams } from 'react-router-dom'
import sports from '../data/sports.json'
import supports from '../data/supports.json'
import Notice from '../components/Notice.jsx'

export default function SportDetailPage() {
  // 주소 /sports/swimming 에서 "swimming" 을 꺼냅니다.
  const { sportId } = useParams()
  const sport = sports.find((s) => s.id === sportId)
  // 이 운동(무술이면 '무술 전체' 포함)에 쓸 수 있는 지원 제도
  const relatedSupports = supports.filter(
    (sp) => sp.sportIds.includes(sportId) || (sport?.group === 'martial' && sp.sportIds.includes('martial')),
  )

  if (!sport) {
    return (
      <Notice type="error">
        해당 운동 정보를 찾을 수 없어요. <Link to="/">홈으로 돌아가기</Link>
      </Notice>
    )
  }

  return (
    <article className="sport-detail">
      {/* 상단 소개 */}
      <header className="sport-hero">
        <div className="sport-hero-icon">{sport.emoji}</div>
        <div>
          <p className="eyebrow">{sport.nameEn}</p>
          <h1 className="section-title">{sport.name}</h1>
          <p className="sport-intro">{sport.intro}</p>
          {sport.group === 'martial' ? (
            <div className="hero-buttons">
              <Link to={`/search?type=voucher&sport=${sport.id}`} className="btn btn-dark">📍 우리 동네 {sport.name} 도장 찾기 →</Link>
              <Link to="/martial" className="btn">🥋 다른 무술 보기</Link>
            </div>
          ) : (
            <Link to={`/search?sport=${sport.id}`} className="btn btn-dark">
              이 운동 할 수 있는 곳 찾기 →
            </Link>
          )}
        </div>
      </header>

      {/* 단계 (입문/초급/중급) */}
      <section className="detail-block">
        <h2>단계별로 배워요</h2>
        <ol className="levels">
          {sport.levels.map((level, i) => (
            <li key={level.name} className="level">
              <span className="level-step">STEP {i + 1}</span>
              <strong>{level.name}</strong>
              <p>{level.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 정보 4칸 */}
      <div className="info-grid">
        <section className="card">
          <h2>📚 배우는 내용</h2>
          <ul>{sport.learn.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
        <section className="card">
          <h2>🎒 준비물</h2>
          <ul>{sport.items.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
        <section className="card">
          <h2>🙋 이런 분께 추천해요</h2>
          <ul>{sport.recommend.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
        <section className="card card-warn">
          <h2>⚠️ 주의할 점</h2>
          <ul>{sport.caution.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      </div>

      {/* 이 운동에 쓸 수 있는 지원 제도 */}
      {relatedSupports.length > 0 && (
        <div className="support-hint">
          💳 {sport.name} 강좌에 쓸 수 있는 지원 제도가 있어요:{' '}
          {relatedSupports.map((sp) => sp.name).join(', ')}
          {' '}<Link to="/supports">자세히 보기 →</Link>
          {' · '}<Link to={`/search?type=voucher&sport=${sport.id}`}>이용권 사용처 찾기 →</Link>
        </div>
      )}

      <Notice type="warn">
        이 내용은 일반적인 안내이며, 건강 상태에 따라 전문가와 상담하세요.
      </Notice>
    </article>
  )
}
