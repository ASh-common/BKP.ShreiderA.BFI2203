import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import CityPage from './pages/CityPage';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import AdminLayout from './components/admin/AdminLayout';
import AdminRoute from './components/admin/AdminRoute';
import ModerateLocations from './pages/admin/ModerateLocations';
import ModeratePhotos from './pages/admin/ModeratePhotos';
import ManageCities from './pages/admin/ManageCities';

import './index.css';

function App() {
  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <main style={{ flex: 1 }}>
          <Routes>
            {/* Публичные маршруты */}
            <Route path="/" element={<HomePage />} />
            <Route path="/city/:id" element={<CityPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            
            {/* только для администраторов */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }>
              <Route index element={<Navigate to="/admin/locations" replace />} />
              <Route path="locations" element={<ModerateLocations />} />
              <Route path="photos" element={<ModeratePhotos />} />
              <Route path="cities" element={<ManageCities />} />
            </Route>
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;