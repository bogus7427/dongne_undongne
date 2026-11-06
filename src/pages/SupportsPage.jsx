import { Link, useSearchParams } from 'react-router-dom'
import supports from '../data/supports.json'
import ExternalLink from '../components/ExternalLink.jsx'
import Notice from '../components/Notice.jsx'

// 대상별 필터
const AUDIENCES = [
  { id: '', label: '전체' },
  { id: 'youth', label: '🧒 유·청소년' },
  { id: 'disabled', label: '♿ 장애인' },
  { id: 'senior', label: '👵 어르신' },
  { id: 'worker', label: '💼 직장인' },
  { id: 'everyone', label: '🙋 누구나' },
]

const CATEGORIES = {
  money: '💰 비용 지원',
  program: '🏃 무료·저렴한 프로그램',
  place: '🏟️ 이용할 수 있는 시설',
}

// 국가·지자체 운동 지원 제도 안내 (내용은 요약만, 자세한 건 공식 사이트 링크로)
export default function SupportsPage() {
  const [params, setParams] = useSearchParams()
  const audience = params.get('for') || ''
  const shown = supports.filter((s) => !audience || s.audiences.includes(audience))

  return (
    <section>
      <p className="eyebrow">SUPPORT</p>
      <h1 className="section-title">운동 지원 제도</h1>
      <p className="section-desc">운동을 시작할 때 받을 수 있는 나라·지자체의 지원을 모았어요.</p>

      <div className="filter-chips">
        {AUDIENCES.map((a) => (
          <button key={a.id} type="button" className={`chip-btn ${audience === a.id ? 'is-active' : ''}`}
            onClick={() => setParams(a.id ? { for: a.id } : {})}>
            {a.label}
          </button>
        ))}
      </div>

      {Object.entries(CATEGORIES).map(([cat, title]) => {
        const items = shown.filter((s) => s.category === cat)
        if (!items.length) return null
        return (
          <div key={cat} className="support-group">
            <h2 className="support-group-title">{title}</h2>
            <div className="support-list">
              {items.map((item) => <SupportCard key={item.id} item={item} />)}
            </div>
          </div>
        )
      })}

      <Notice type="warn">
        지원 대상·금액·신청 기간은 해마다 바뀌어요. 신청 전에 꼭 공식 사이트의 최신 공고를 확인하세요.
      </Notice>
    </section>
  )
}

function SupportCard({ item }) {
  const searchHref = item.searchQuery
    ? `https://search.naver.com/search.naver?query=${encodeURIComponent(item.searchQuery)}`
    : null
  return (
    <article className="card support-card">
      <div className="support-head">
        <span className="support-emoji">{item.emoji}</span>
        <div>
          <h3>{item.name}</h3>
          <p className="muted small-text">{item.org}</p>
        </div>
      </div>
      <p>{item.summary}</p>
      <dl className="info-list">
        <dt>대상</dt>
        <dd>{item.target}</dd>
        <dt>이용 방법</dt>
        <dd>
          <ol className="howto">{item.howTo.map((t) => <li key={t}>{t}</li>)}</ol>
        </dd>
        {item.contact && (
          <>
            <dt>문의</dt>
            <dd><a href={`tel:${item.contact}`}>{item.contact}</a></dd>
          </>
        )}
      </dl>
      <div className="link-buttons">
        {item.searchPath && (
          <Link to={item.searchPath} className="btn btn-sm btn-dark">📍 우리 동네에서 찾기</Link>
        )}
        {item.links.map((link) => (
          <ExternalLink key={link.href + link.label} href={link.href} className="btn btn-sm btn-dark">
            {link.label} ↗
          </ExternalLink>
        ))}
        {searchHref && (
          <ExternalLink href={searchHref} className="btn btn-sm">🔍 네이버에서 찾기 ↗</ExternalLink>
        )}
      </div>
    </article>
  )
}
