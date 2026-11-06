// 모든 외부 링크는 이 컴포넌트로 만들어요.
// target="_blank": 새 탭으로 열기
// rel="noopener noreferrer": 새 탭의 사이트가 우리 페이지를 조작하거나 정보를 가져가지 못하게 막기
export default function ExternalLink({ href, className = '', children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  )
}
