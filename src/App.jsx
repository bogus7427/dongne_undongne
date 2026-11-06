import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import SubNav from './components/SubNav.jsx'
import MartialPage from './pages/MartialPage.jsx'
import DiscountsHubPage from './pages/DiscountsHubPage.jsx'
import ProgramPage from './pages/ProgramPage.jsx'
import HomePage from './pages/HomePage.jsx'
import SportDetailPage from './pages/SportDetailPage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import FacilityDetailPage from './pages/FacilityDetailPage.jsx'
import FavoritesPage from './pages/FavoritesPage.jsx'
import SupportsPage from './pages/SupportsPage.jsx'
import VoucherDetailPage from './pages/VoucherDetailPage.jsx'
import PlaceDetailPage from './pages/PlaceDetailPage.jsx'
import LoginPage from './pages/auth/LoginPage.jsx'
import SignupPage from './pages/auth/SignupPage.jsx'
import MyPage from './pages/MyPage.jsx'
import AdminPage from './pages/admin/AdminPage.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import BizApp from './biz/BizApp.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

// /owner/facilities/1/members → /biz/facilities/1/members
function OwnerRedirect() {
  const location = useLocation()
  return <Navigate to={location.pathname.replace(/^\/owner/, '/biz') + location.search} replace />
}

export default function App() {
  const location = useLocation()
  // 🏢 시설자 모드는 일반 사이트 틀(헤더·배너·푸터) 없이 따로 보여 줘요
  if (location.pathname.startsWith('/biz')) return <BizApp />

  return (
    <div className="app">
      <Header />
      <SubNav />
      <main className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sports/:sportId" element={<SportDetailPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/martial" element={<MartialPage />} />
          <Route path="/discounts" element={<DiscountsHubPage />} />
          <Route path="/program" element={<ProgramPage />} />
          <Route path="/program/demo/*" element={<Navigate to="/biz/demo" replace />} />
          <Route path="/facility/:facilityId" element={<FacilityDetailPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/supports" element={<SupportsPage />} />
          <Route path="/voucher/:voucherId" element={<VoucherDetailPage />} />
          <Route path="/place/:placeId" element={<PlaceDetailPage />} />

          {/* 회원 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/mypage" element={<RequireAuth><MyPage /></RequireAuth>} />

          {/* 예전 업체 주소(/owner...)는 시설자 모드(/biz...)로 */}
          <Route path="/owner/*" element={<OwnerRedirect />} />

          {/* 관리자 전용 */}
          <Route path="/admin" element={<RequireAuth role="admin"><AdminPage /></RequireAuth>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
