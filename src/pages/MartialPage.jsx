import { Link } from 'react-router-dom'
import sports from '../data/sports.json'
import SportCard from '../components/SportCard.jsx'
import Notice from '../components/Notice.jsx'

const martialArts = sports.filter((s) => s.group === 'martial')

// 무술 통합 페이지 (/martial)
export default function MartialPage() {
  return (
    <section>
      <div className="martial-hero">
        <p className="eyebrow eyebrow-light">MARTIAL ARTS</p>
        <h1>🥋 무술 통합 찾기</h1>
        <p>태권도·합기도·주짓수·유도·킥복싱·복싱·검도·무에타이·종합격투기까지<br className="only-pc" />
          배우는 내용을 보고, 우리 동네 도장·체육관을 찾아보세요.</p>
        <div className="hero-buttons">
          <Link to="/search?type=voucher&sport=martial" className="btn btn-white">📍 우리 동네 무술 도장 찾기</Link>
          <Link to="/search?sport=martial" className="btn btn-outline-light">🏟️ 공공 투기체육관 찾기</Link>
        </div>
      </div>

      <section className="section">
        <p className="eyebrow">CHOOSE</p>
        <h2 className="section-title">어떤 무술이 궁금하세요?</h2>
        <p className="section-desc">카드를 누르면 띠·단계별로 배우는 내용과 준비물, 주의할 점을 볼 수 있어요.</p>
        <div className="sport-grid">
          {martialArts.map((art) => <SportCard key={art.id} sport={art} />)}
        </div>
      </section>

      {/* 비교표 */}
      <section className="detail-block">
        <h2>한눈에 비교</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>무술</th><th>특징</th><th>이런 분께</th><th>도장 찾기</th></tr></thead>
            <tbody>
              {martialArts.map((a) => (
                <tr key={a.id}>
                  <td><Link to={`/sports/${a.id}`}><strong>{a.emoji} {a.name}</strong></Link></td>
                  <td>{a.summary}</td>
                  <td>{a.recommend[0]}</td>
                  <td><Link to={`/search?type=voucher&sport=${a.id}`} className="text-link">찾기 →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Notice>
        💳 태권도·합기도 등 무술 도장 상당수가 <strong>스포츠강좌이용권</strong> 사용처로 등록돼 있어요.{' '}
        <Link to="/supports?for=youth">대상 확인하기 →</Link>
      </Notice>
      <Notice type="warn">
        무술은 접촉이 많은 운동이에요. 이 내용은 일반적인 안내이며, 건강 상태에 따라 전문가와 상담하세요.
      </Notice>
    </section>
  )
}
