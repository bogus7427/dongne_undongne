import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import SubNav from './components/SubNav.jsx'
import MartialPage from './pages/MartialPage.jsx'
import DiscountsHubPage from './pages/DiscountsHubPage.jsx'
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
import OwnerHomePage from './pages/owner/OwnerHomePage.jsx'
import FacilityFormPage from './pages/owner/FacilityFormPage.jsx'
import MembersPage from './pages/owner/MembersPage.jsx'
import DiscountsPage from './pages/owner/DiscountsPage.jsx'
import AdminPage from './pages/admin/AdminPage.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

export default function App() {
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
          <Route path="/facility/:facilityId" element={<FacilityDetailPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/supports" element={<SupportsPage />} />
          <Route path="/voucher/:voucherId" element={<VoucherDetailPage />} />
          <Route path="/place/:placeId" element={<PlaceDetailPage />} />

          {/* 회원 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/mypage" element={<RequireAuth><MyPage /></RequireAuth>} />

          {/* 시설업체 회원 전용 */}
          <Route path="/owner" element={<RequireAuth role="owner"><OwnerHomePage /></RequireAuth>} />
          <Route path="/owner/facilities/new" element={<RequireAuth role="owner"><FacilityFormPage /></RequireAuth>} />
          <Route path="/owner/facilities/:facilityId/edit" element={<RequireAuth role="owner"><FacilityFormPage /></RequireAuth>} />
          <Route path="/owner/facilities/:facilityId/members" element={<RequireAuth role="owner"><MembersPage /></RequireAuth>} />
          <Route path="/owner/facilities/:facilityId/discounts" element={<RequireAuth role="owner"><DiscountsPage /></RequireAuth>} />

          {/* 관리자 전용 */}
          <Route path="/admin" element={<RequireAuth role="admin"><AdminPage /></RequireAuth>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
