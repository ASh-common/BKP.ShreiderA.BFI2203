import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const { error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(isLogin ? 'Вход выполнен!' : 'Подтвердите email в письме на почте!');
      if (isLogin) navigate('/');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '450px', marginTop: '80px' }}>
      <h1>{isLogin ? 'Вход' : 'Регистрация'}</h1>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', marginBottom: '16px', padding: '12px', borderRadius: '12px', border: '1px solid #c6c6c8' }} />
        <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', marginBottom: '16px', padding: '12px', borderRadius: '12px', border: '1px solid #c6c6c8' }} />
        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#0071e3', color: 'white', borderRadius: '12px', fontSize: '1rem' }}>{isLogin ? 'Войти' : 'Зарегистрироваться'}</button>
      </form>
      <button onClick={() => setIsLogin(!isLogin)} style={{ marginTop: '16px', color: '#0071e3' }}>
        {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
      </button>
      {message && <p style={{ marginTop: '16px', color: 'red' }}>{message}</p>}
    </div>
  );
}

export default AuthPage;