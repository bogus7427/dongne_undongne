// 목록 페이지 나누기 버튼
// page: 현재 페이지(1부터), totalPages: 전체 페이지 수, onChange: 페이지 바꾸는 함수
export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  // 현재 페이지 주변 5개만 번호로 보여 줍니다.
  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const end = Math.min(totalPages, start + 4)
  const pages = []
  for (let p = start; p <= end; p++) pages.push(p)

  return (
    <nav className="pagination" aria-label="페이지 이동">
      <button onClick={() => onChange(page - 1)} disabled={page === 1}>‹ 이전</button>
      {pages.map((p) => (
        <button
          key={p}
          className={p === page ? 'is-active' : ''}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages}>다음 ›</button>
    </nav>
  )
}
