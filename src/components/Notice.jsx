// 안내 문구 상자 (결과 없음, 오류, 주의사항 등)
// type: 'info' | 'warn' | 'error'
export default function Notice({ type = 'info', children }) {
  return <div className={`notice notice-${type}`}>{children}</div>
}
