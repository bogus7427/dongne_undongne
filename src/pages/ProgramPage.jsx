import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/authContext.js'
import { photoUrl } from '../utils/photos.js'
import PhotoCredit from '../components/PhotoCredit.jsx'

const FEATURES = [
  { icon: '👥', title: '회원 명단', desc: '등록·수정, 수강 중/휴원/퇴원 상태, 이름·연락처 검색, 엑셀(CSV) 내려받기' },
  { icon: '✅', title: '출석 체크', desc: '날짜별로 한 번에 체크, 회원별 이번 달 출석 횟수 자동 계산' },
  { icon: '💰', title: '수강료 장부', desc: '월별 납부·미납 확인, 현금·카드·계좌이체·이용권 기록, 합계 자동 계산' },
  { icon: '💸', title: '할인 제도', desc: '3·6·9·12·18·24개월 기간권 할인율, 할인쿠폰, 카드할인 등록' },
  { icon: '📍', title: '시설 홍보', desc: '관리자 승인 후 "시설 찾기" 지도·목록에 ✔ 등록 업체로 노출' },
  { icon: '🔒', title: '안전한 보관', desc: '회원 정보는 우리 시설만 볼 수 있어요 (관리자도 못 봐요)' },
]

const STEPS = ['업체회원 가입', '내 시설 등록', '관리자 승인', '회원관리 시작']

// 🗂️ 회원관리 프로그램 소개 (/program)
export default function ProgramPage() {
  const { user, isOwner } = useAuth()

  // 회원 종류에 맞는 시작 버튼
  let cta
  if (isOwner) {
    cta = (
      <div className="hero-buttons">
        <Link to="/biz" className="btn btn-dark">🏢 시설자 모드 열기 →</Link>
        <Link to="/biz/demo" className="btn btn-outline-light">🧪 체험판 보기</Link>
      </div>
    )
  } else if (user) {
    cta = (
      <p className="program-note">
        <Link to="/biz/demo" className="btn btn-white btn-sm">🧪 체험판 보기</Link><br />
        지금은 <strong>개인회원</strong>으로 로그인돼 있어요. 업체 기능을 쓰려면 업체용 이메일로 새로 가입하거나 관리자에게 회원 종류 변경을 요청하세요.
      </p>
    )
  } else {
    cta = (
      <div className="hero-buttons">
        <Link to="/biz/demo" className="btn btn-white">🧪 가입 없이 체험해 보기</Link>
        <Link to="/signup?type=owner&next=/biz" className="btn btn-dark">무료로 시작하기 (업체회원 가입)</Link>
        <Link to="/biz/login" className="btn btn-outline-light">이미 가입했어요 · 시설자 로그인</Link>
      </div>
    )
  }

  return (
    <section>
      <div className="program-hero" style={{ '--photo': `url(${photoUrl('program', 1600)})` }}>
        <p className="eyebrow eyebrow-light">MEMBER MANAGEMENT</p>
        <h1>🗂️ 체육시설 회원관리 프로그램</h1>
        <p>도장·헬스장·필라테스·수영장 등 작은 체육시설을 위한 <strong>무료</strong> 회원관리 도구예요.<br className="only-pc" />
          회원 명단, 출석, 수강료, 할인까지 한곳에서 관리하세요.</p>
        {cta}
        <PhotoCredit photoKey="program" className="on-dark" />
      </div>

      <section className="section">
        <p className="eyebrow">FEATURES</p>
        <h2 className="section-title">이런 걸 할 수 있어요</h2>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="card feature-card">
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="detail-block">
        <h2>시작하는 방법</h2>
        <ol className="program-steps">
          {STEPS.map((s, i) => (
            <li key={s}><span>STEP {i + 1}</span><strong>{s}</strong></li>
          ))}
        </ol>
      </section>

      <p className="muted small-text">
        ※ 실제 결제·문자 발송 기능은 없어요. 받은 수강료를 기록하는 장부 기능이에요.
      </p>
    </section>
  )
}
