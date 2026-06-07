import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function HomePage() {
  const [cities, setCities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCities, setFilteredCities] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('cities').select('*').then(({ data }) => setCities(data || []));
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCities([]);
      return;
    }
    const filtered = cities.filter(city =>
      city.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCities(filtered.slice(0, 5));
  }, [searchTerm, cities]);

  const handleCitySelect = (cityId) => {
    navigate(`/city/${cityId}`);
    setSearchTerm('');
    setIsSearchFocused(false);
  };

  return (
    <div style={{
      backgroundImage: 'url(/30.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      minHeight: 'calc(100vh - 80px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(8px)',
        padding: '40px',
        borderRadius: '32px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
      }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 600, marginBottom: '16px', textAlign: 'center' }}>LocoMap</h1>
        <p style={{ textAlign: 'center', marginBottom: '32px', color: '#4b4b4f' }}>Открой город для себя по-новому</p>

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: '40px', border: '1px solid #d2d2d6', overflow: 'hidden' }}>
            {/* Кастомная иконка лупы из папки public */}
            <img 
              src="/search.png" 
              alt=""
              style={{ 
                width: '30px', 
                height: '30px', 
                marginLeft: '16px',
                opacity: 0.6
              }} 
            />
            <input
              type="text"
              placeholder="Поиск города (например, Москва)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              style={{
                width: '100%',
                padding: '16px 16px 16px 12px',
                fontSize: '1rem',
                border: 'none',
                outline: 'none'
              }}
            />
          </div>

          {isSearchFocused && filteredCities.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              marginTop: '8px',
              borderRadius: '20px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
              zIndex: 10,
              overflow: 'hidden'
            }}>
              {filteredCities.map(city => (
                <div
                  key={city.id}
                  onClick={() => handleCitySelect(city.id)}
                  style={{
                    padding: '12px 20px',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                    borderBottom: '1px solid #f0f0f0'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e8e8ed'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  {city.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HomePage;