import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Navigate } from 'react-router-dom';

function AdminRoute({ children }) {
  const [isAdmin, setIsAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      
      setIsAdmin(data?.is_admin === true);
      setLoading(false);
    };
    
    checkAdmin();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Загрузка...</div>;
  }
  
  return isAdmin ? children : <Navigate to="/" />;
}

export default AdminRoute;