import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function CitiesPage() {
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchCities()
  }, [])

  async function fetchCities() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name')
      
      if (error) throw error
      setCities(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{ padding: '20px' }}>Загрузка городов...</div>
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Ошибка: {error}</div>

  return (
    <div style={{ padding: '20px' }}>
      <Link to="/">← На главную</Link>
      <h1>Выберите город</h1>
      <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
        {cities.map(city => (
          <Link 
            key={city.id} 
            to={`/city/${city.id}`}
            style={{ 
              display: 'block', 
              padding: '20px', 
              border: '1px solid #ccc', 
              borderRadius: '10px',
              textDecoration: 'none',
              color: 'black',
              backgroundColor: 'white'
            }}
          >
            <h2>{city.name}</h2>
            <p>{city.region}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default CitiesPage