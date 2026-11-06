import { REGIONS, SIDO_LIST, RADIUS_OPTIONS } from '../data/regions.js'
import sports from '../data/sports.json'

// 시설 검색 화면 위쪽의 조건 선택 영역
// value: { mode, sido, sigungu, radius, sport, sort }  onChange: 바꿀 값만 넘기면 됨
export default function SearchControls({ value, onChange, hasLocation, locating }) {
  const { mode, sido, sigungu, radius, sport, sort } = value

  return (
    <div className="search-controls">
      {/* 탭: 지역 선택 / 내 주변 */}
      <div className="mode-tabs">
        <button
          className={mode === 'region' ? 'is-active' : ''}
          onClick={() => onChange({ mode: 'region' })}
        >
          🗺️ 지역 선택
        </button>
        <button
          className={mode === 'near' ? 'is-active' : ''}
          onClick={() => onChange({ mode: 'near' })}
        >
          📍 내 주변
        </button>
      </div>

      <div className="control-row">
        {mode === 'region' ? (
          <>
            <select
              value={sido}
              onChange={(e) => onChange({ sido: e.target.value, sigungu: '' })}
              aria-label="시/도 선택"
            >
              <option value="">시/도 선택</option>
              {SIDO_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={sigungu}
              onChange={(e) => onChange({ sigungu: e.target.value })}
              disabled={!sido}
              aria-label="시/군/구 선택"
            >
              <option value="">시/군/구 선택</option>
              {(REGIONS[sido] || []).map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </>
        ) : (
          <div className="radius-group">
            {locating && <span className="muted">📡 내 위치를 찾는 중...</span>}
            {!locating && RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                className={`chip-btn ${radius === r ? 'is-active' : ''}`}
                onClick={() => onChange({ radius: r })}
              >
                {r}km
              </button>
            ))}
          </div>
        )}

        <select value={sport} onChange={(e) => onChange({ sport: e.target.value })} aria-label="운동 종류">
          <option value="">모든 운동</option>
          <optgroup label="운동">
            {sports.filter((s) => s.group !== 'martial').map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
          </optgroup>
          <optgroup label="무술">
            <option value="martial">🥋 무술 전체</option>
            {sports.filter((s) => s.group === 'martial').map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
          </optgroup>
        </select>

        <select value={sort} onChange={(e) => onChange({ sort: e.target.value })} aria-label="정렬">
          <option value="distance" disabled={!hasLocation}>
            가까운 순{!hasLocation ? ' (위치 필요)' : ''}
          </option>
          <option value="name">이름 순</option>
        </select>
      </div>
    </div>
  )
}
