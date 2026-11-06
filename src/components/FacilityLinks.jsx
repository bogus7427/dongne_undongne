import { buildFacilityLinks } from '../utils/links.js'
import ExternalLink from './ExternalLink.jsx'

// 시설 상세의 링크 버튼 모음
export default function FacilityLinks({ facility }) {
  const links = buildFacilityLinks(facility)
  const hasHomepage = links.some((l) => l.key === 'home')

  return (
    <div>
      <div className="link-buttons">
        {links.map((link) => (
          <ExternalLink
            key={link.key}
            href={link.href}
            className={`btn btn-sm ${link.primary ? 'btn-dark' : ''}`}
          >
            {link.icon} {link.label} ↗
          </ExternalLink>
        ))}
      </div>
      {!hasHomepage && (
        <p className="muted small-text">
          확인된 공식 홈페이지(https)가 없어 검색 링크로 안내해요.
        </p>
      )}
    </div>
  )
}
