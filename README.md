# 동네운동 찾기 (DONGNE UNDONG)

운동 종류별 교육 내용을 알아보고, 전국 공공체육시설·스포츠강좌이용권 사용처·등록 업체를 지도에서 찾는 사이트입니다.

## 기술
- React + Vite, react-router-dom
- 카카오맵 JavaScript API
- Vercel 서버리스 함수(`api/`)로 공공데이터 API 호출 (키 숨김 + 캐싱)
- Supabase (회원가입·로그인, 업체 시설 등록, 회원관리, 할인)

## 로컬 실행
```bash
npm install
cp .env.example .env   # 실제 키 입력
npm run dev            # http://localhost:5173
```

## 환경변수
| 이름 | 용도 | 비고 |
|---|---|---|
| `VITE_KAKAO_MAP_KEY` | 카카오맵 JavaScript 키 | 카카오 콘솔에 localhost와 배포 도메인 둘 다 등록 |
| `DATA_GO_KR_KEY` | 공공데이터포털 Decoding 키 | 서버리스 함수에서만 사용 (`VITE_` 금지) |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon(publishable) 키 | service_role 키는 절대 넣지 않기 |

## Supabase 설정
SQL Editor에서 `supabase/schema.sql` → `supabase/discounts.sql` 순서로 실행합니다.

## 데이터 출처
- 공공데이터포털: 국민체육진흥공단 공공체육시설 상세 정보, 스포츠강좌이용권 등록시설·등록강좌 정보
- 운영 시간·강좌는 각 시설의 공식 정보에서 확인하세요.
