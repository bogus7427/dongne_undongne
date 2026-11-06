export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <p className="footer-logo">동네운동 찾기</p>
          <p>운동을 새로 시작하는 모든 분을 위한 공공체육시설 안내</p>
        </div>
        <div className="footer-notice">
          <p>데이터 출처: 공공데이터포털(국민체육진흥공단) · 공공체육시설, 스포츠강좌이용권</p>
          <p>운영 시간·강좌는 링크된 공식 정보에서 꼭 확인하세요.</p>
          <p>사진: <a href="https://unsplash.com/?utm_source=dongne_undong&utm_medium=referral" target="_blank" rel="noopener noreferrer">Unsplash</a> 작가분들의 무료 사진</p>
        </div>
      </div>
    </footer>
  )
}
