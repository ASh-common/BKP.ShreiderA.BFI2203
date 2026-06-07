import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const menuItems = [
    { path: '/admin/locations', label: 'Локации на модерации', icon: '📋' },
    { path: '/admin/photos', label: 'Фотографии на модерации', icon: '🖼' },
    { path: '/admin/cities', label: 'Управление городами', icon: '🏙' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Боковое меню */}
      <aside style={{ 
        width: '280px', 
        backgroundColor: '#f8f9fa', 
        borderRight: '1px solid #e9ecef',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '32px', color: '#1d1d1f' }}>
            Админ панель
          </h2>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: location.pathname === item.path ? '#e8f0fe' : 'transparent',
                  color: location.pathname === item.path ? '#0071e3' : '#1d1d1f',
                  textDecoration: 'none',
                  fontWeight: location.pathname === item.path ? 500 : 400,
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (location.pathname !== item.path) {
                    e.currentTarget.style.backgroundColor = '#f0f0f4';
                  }
                }}
                onMouseLeave={(e) => {
                  if (location.pathname !== item.path) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div style={{ padding: '24px', borderTop: '1px solid #e9ecef' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#ff3b30',
              fontSize: '14px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffe8e8'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span style={{ fontSize: '20px' }}>🚪</span> Выйти
          </button>
        </div>
      </aside>
      
      {/* Основное содержание */}
      <main style={{ flex: 1, padding: '32px', backgroundColor: '#ffffff', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;