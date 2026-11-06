import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="not-found">
      <p className="eyebrow">404</p>
      <h1 className="section-title">페이지를 찾을 수 없어요</h1>
      <Link to="/" className="btn btn-dark">홈으로 가기</Link>
    </section>
  )
}
