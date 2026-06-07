import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

function ManageCities() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    region: '',
    center_lat: '',
    center_lng: ''
  });

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Ошибка загрузки:', error);
    } else {
      setCities(data || []);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addCity = async () => {
    if (!formData.name.trim()) {
      alert('Введите название города');
      return;
    }
    
    const { error } = await supabase
      .from('cities')
      .insert([{
        name: formData.name,
        region: formData.region || null,
        center_lat: parseFloat(formData.center_lat) || 55.7558,
        center_lng: parseFloat(formData.center_lng) || 37.6176
      }]);
    
    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      alert('Город добавлен');
      setShowAddModal(false);
      setFormData({ name: '', region: '', center_lat: '', center_lng: '' });
      fetchCities();
    }
  };

  const updateCity = async () => {
    if (!editingCity) return;
    
    const { error } = await supabase
      .from('cities')
      .update({
        name: formData.name,
        region: formData.region || null,
        center_lat: parseFloat(formData.center_lat),
        center_lng: parseFloat(formData.center_lng)
      })
      .eq('id', editingCity.id);
    
    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      alert('Город обновлён');
      setEditingCity(null);
      setFormData({ name: '', region: '', center_lat: '', center_lng: '' });
      fetchCities();
    }
  };

  const deleteCity = async (cityId) => {
    if (!confirm('Удалить город? Все локации этого города также будут удалены.')) return;
    
    const { error } = await supabase
      .from('cities')
      .delete()
      .eq('id', cityId);
    
    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      alert('Город удалён');
      fetchCities();
    }
  };

  const openEditModal = (city) => {
    setEditingCity(city);
    setFormData({
      name: city.name,
      region: city.region || '',
      center_lat: city.center_lat || '',
      center_lng: city.center_lng || ''
    });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>Загрузка...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '8px' }}>Управление городами</h1>
          <p style={{ color: '#6e6e73' }}>Всего городов: {cities.length}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{ padding: '10px 24px', backgroundColor: '#0071e3', color: 'white', border: 'none', borderRadius: '40px', cursor: 'pointer', fontWeight: 500 }}
        >
          + Добавить город
        </button>
      </div>

      {cities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#f5f5f7', borderRadius: '24px', color: '#6e6e73' }}>
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>Нет добавленных городов</p>
          <p>Нажмите «Добавить город»</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
          {cities.map(city => (
            <div key={city.id} style={{ backgroundColor: '#f8f9fa', borderRadius: '16px', padding: '16px', border: '1px solid #e9ecef' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>{city.name}</h3>
                  <p style={{ fontSize: '13px', color: '#8e8e93', marginBottom: '8px' }}>{city.region || 'Регион не указан'}</p>
                  <p style={{ fontSize: '12px', color: '#6e6e73' }}>Координаты: {city.center_lat}, {city.center_lng}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => openEditModal(city)}
                    style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#0071e3' }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteCity(city.id)}
                    style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#ff3b30' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно добавления города */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAddModal(false)}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', width: '90%', maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 600 }}>Добавление города</h3>
            <input name="name" placeholder="Название города*" value={formData.name} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ccc', marginBottom: '12px' }} />
            <input name="region" placeholder="Область/регион" value={formData.region} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ccc', marginBottom: '12px' }} />
            <input name="center_lat" placeholder="Широта центра" value={formData.center_lat} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ccc', marginBottom: '12px' }} />
            <input name="center_lng" placeholder="Долгота центра" value={formData.center_lng} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ccc', marginBottom: '20px' }} />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddModal(false)} style={{ padding: '10px 20px', borderRadius: '40px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}>Отмена</button>
              <button onClick={addCity} style={{ padding: '10px 20px', borderRadius: '40px', backgroundColor: '#0071e3', color: 'white', border: 'none', cursor: 'pointer' }}>Добавить</button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования города */}
      {editingCity && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditingCity(null)}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', width: '90%', maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 600 }}>Редактирование города</h3>
            <input name="name" placeholder="Название города*" value={formData.name} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ccc', marginBottom: '12px' }} />
            <input name="region" placeholder="Область/регион" value={formData.region} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ccc', marginBottom: '12px' }} />
            <input name="center_lat" placeholder="Широта центра" value={formData.center_lat} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ccc', marginBottom: '12px' }} />
            <input name="center_lng" placeholder="Долгота центра" value={formData.center_lng} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ccc', marginBottom: '20px' }} />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingCity(null)} style={{ padding: '10px 20px', borderRadius: '40px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}>Отмена</button>
              <button onClick={updateCity} style={{ padding: '10px 20px', borderRadius: '40px', backgroundColor: '#0071e3', color: 'white', border: 'none', cursor: 'pointer' }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageCities;