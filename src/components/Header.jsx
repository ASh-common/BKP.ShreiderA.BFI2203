import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';

function Header() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(0,0,0,0.05)',
      padding: '12px 24px',
      zIndex: 100,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <Link 
        to="/" 
        style={{ 
          textDecoration: 'none', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px' 
        }}
      >
        <img 
          src="/logo.png" 
          alt="LocoMap Logo" 
          style={{ 
            height: '64px', 
            width: 'auto', 
            display: 'block' 
          }} 
        />
        <span style={{ 
          fontSize: '1.5rem', 
          fontWeight: 600, 
          color: '#1d1d1f' 
        }}>
          LocoMap
        </span>
      </Link>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {user ? (
          <>
            <Link to="/profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <img 
                src="/account.png" 
                alt="Профиль" 
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%',
                  objectFit: 'cover'
                }} 
              />
            </Link>
            <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#e0e0e0ff', borderRadius: '20px' }}>Выйти</button>
          </>
        ) : (
          <Link to="/auth" style={{ textDecoration: 'none', padding: '8px 16px', backgroundColor: '#0071e3', color: 'white', borderRadius: '20px' }}>
            Войти
          </Link>
        )}
      </div>
    </header>
  );
}

export default Header;