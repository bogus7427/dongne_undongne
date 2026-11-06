// 🏢 시설자 모드 (/biz ...)
// 일반 사이트와 따로, 체육시설 업체회원이 쓰는 업무용 화면이에요.
import { Routes, Route } from 'react-router-dom'
import './biz.css'
import { DbContext } from '../lib/dbContext.js'
import { supabase } from '../lib/supabase.js'
import { demoDb } from '../lib/demoDb.js'
import RequireAuth from '../components/RequireAuth.jsx'
import LoginPage from '../pages/auth/LoginPage.jsx'
import BizShell from './BizShell.jsx'
import BizDashboard from './BizDashboard.jsx'
import FacilityFormPage from '../pages/owner/FacilityFormPage.jsx'
import MembersPage from '../pages/owner/MembersPage.jsx'
import DiscountsPage from '../pages/owner/DiscountsPage.jsx'

const REAL = { db: supabase, isDemo: false, base: '/biz' }
const DEMO = { db: demoDb, isDemo: true, base: '/biz/demo' }

// 시설자 모드 안의 화면들 (진짜·체험판 공통)
function bizRoutes() {
  return (
    <>
      <Route index element={<BizDashboard />} />
      <Route path="facilities/new" element={<FacilityFormPage />} />
      <Route path="facilities/:facilityId/edit" element={<FacilityFormPage />} />
      <Route path="facilities/:facilityId/members" element={<MembersPage />} />
      <Route path="facilities/:facilityId/discounts" element={<DiscountsPage />} />
    </>
  )
}

export default function BizApp() {
  return (
    <Routes>
      {/* 시설자 로그인 */}
      <Route path="/biz/login" element={<BizShell bare><LoginPage defaultNext="/biz" ownerMode /></BizShell>} />

      {/* 체험판: 로그인 없이 */}
      <Route path="/biz/demo" element={<DbContext.Provider value={DEMO}><BizShell /></DbContext.Provider>}>
        {bizRoutes()}
      </Route>

      {/* 진짜: 업체회원만 */}
      <Route
        path="/biz"
        element={
          <DbContext.Provider value={REAL}>
            <RequireAuth role="owner"><BizShell /></RequireAuth>
          </DbContext.Provider>
        }
      >
        {bizRoutes()}
      </Route>

      <Route path="*" element={<BizShell bare><p>페이지를 찾을 수 없어요.</p></BizShell>} />
    </Routes>
  )
}
