import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

function ModerateLocations() {
  const [locations, setLocations] = useState({ pending: [], approved: [], rejected: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [locationPhotos, setLocationPhotos] = useState({});

  useEffect(() => {
    fetchAllLocations();
  }, []);

  const fetchAllLocations = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('locations')
      .select(`
        *,
        cities(name),
        user_profiles(username)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Ошибка загрузки:', error);
      setLoading(false);
      return;
    }
    
    console.log('Загружено локаций:', data?.length);
    console.log('Pending:', data?.filter(loc => loc.status === 'pending').length);
    
    const grouped = {
      pending: data?.filter(loc => loc.status === 'pending') || [],
      approved: data?.filter(loc => loc.status === 'approved') || [],
      rejected: data?.filter(loc => loc.status === 'rejected') || []
    };
    setLocations(grouped);
    
    // Загружаем фото для всех локаций
    for (const loc of data || []) {
      const { data: photos } = await supabase
        .from('photos')
        .select('url')
        .eq('location_id', loc.id)
        .limit(3);
      if (photos && photos.length > 0) {
        setLocationPhotos(prev => ({ ...prev, [loc.id]: photos }));
      }
    }
    
    setLoading(false);
  };

  const approveLocation = async (locationId) => {
    const { error } = await supabase
      .from('locations')
      .update({ status: 'approved' })
      .eq('id', locationId);
    
    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      alert('Локация одобрена');
      fetchAllLocations();
    }
  };

  const rejectLocation = async () => {
    if (!selectedLocation) return;
    
    if (!rejectionReason.trim()) {
      alert('Укажите причину отказа');
      return;
    }
    
    const { error } = await supabase
      .from('locations')
      .update({ 
        status: 'rejected', 
        rejection_reason: rejectionReason 
      })
      .eq('id', selectedLocation.id);
    
    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      alert('Локация отклонена');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedLocation(null);
      fetchAllLocations();
    }
  };

  const deleteLocation = async (locationId) => {
    if (!confirm('Удалить локацию? Это действие необратимо.')) return;
    
    const { data: photos } = await supabase
      .from('photos')
      .select('url')
      .eq('location_id', locationId);
    
    for (const photo of photos || []) {
      const path = photo.url.split('/').slice(-4).join('/');
      await supabase.storage.from('photos').remove([path]);
    }
    
    await supabase.from('photos').delete().eq('location_id', locationId);
    await supabase.from('location_categories').delete().eq('location_id', locationId);
    await supabase.from('favorites').delete().eq('location_id', locationId);
    await supabase.from('collection_items').delete().eq('location_id', locationId);
    await supabase.from('locations').delete().eq('id', locationId);
    
    alert('Локация удалена');
    fetchAllLocations();
  };

  const openRejectModal = (location) => {
    setSelectedLocation(location);
    setShowRejectModal(true);
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'pending':
        return { backgroundColor: '#fff8e8', color: '#f5a623', label: '⏳ На модерации' };
      case 'approved':
        return { backgroundColor: '#e8f5ec', color: '#34c759', label: '✅ Одобрено' };
      case 'rejected':
        return { backgroundColor: '#ffe8e8', color: '#ff3b30', label: '❌ Отклонено' };
      default:
        return { backgroundColor: '#f0f0f4', color: '#8e8e93', label: 'Статус неизвестен' };
    }
  };

  const tabs = [
    { key: 'pending', label: 'На модерации', count: locations.pending.length, color: '#f5a623' },
    { key: 'approved', label: 'Одобренные', count: locations.approved.length, color: '#34c759' },
    { key: 'rejected', label: 'Отклонённые', count: locations.rejected.length, color: '#ff3b30' }
  ];

  const currentLocations = locations[activeTab] || [];

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>Загрузка...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '8px' }}>Модерация локаций</h1>
        <p style={{ color: '#6e6e73' }}>Управление всеми локациями платформы</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e9ecef', paddingBottom: '12px' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 20px',
              borderRadius: '40px',
              border: 'none',
              backgroundColor: activeTab === tab.key ? tab.color : '#f0f0f4',
              color: activeTab === tab.key ? 'white' : '#1d1d1f',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? 500 : 400
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {currentLocations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#f5f5f7', borderRadius: '24px', color: '#6e6e73' }}>
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>
            {activeTab === 'pending' && '📋 Нет локаций на модерации'}
            {activeTab === 'approved' && '✅ Нет одобренных локаций'}
            {activeTab === 'rejected' && '❌ Нет отклонённых локаций'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {currentLocations.map(loc => {
            const statusStyle = getStatusBadgeStyle(loc.status);
            return (
              <div 
                key={loc.id} 
                style={{ 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '20px', 
                  padding: '24px', 
                  border: '1px solid #e9ecef',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '20px', fontWeight: 600 }}>{loc.name}</h2>
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', backgroundColor: statusStyle.backgroundColor, color: statusStyle.color }}>
                        {statusStyle.label}
                      </span>
                    </div>
                    {activeTab !== 'pending' && (
                      <button
                        onClick={() => deleteLocation(loc.id)}
                        style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#ff3b30' }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                  
                  <p style={{ color: '#4b4b4f', marginBottom: '16px', lineHeight: 1.5 }}>{loc.description || 'Описание отсутствует'}</p>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px', fontSize: '14px', color: '#6e6e73' }}>
                    <span>Координаты: {loc.lat}, {loc.lng}</span>
                    <span>Город: {loc.cities?.name}</span>
                    <span>Автор: {loc.user_profiles?.username || 'Неизвестен'}</span>
                    <span>Дата: {new Date(loc.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                  
                  {loc.status === 'rejected' && loc.rejection_reason && (
                    <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#ffe8e8', borderRadius: '12px' }}>
                      <p style={{ fontSize: '13px', color: '#ff3b30', margin: 0 }}>
                        <strong>Причина отклонения:</strong> {loc.rejection_reason}
                      </p>
                    </div>
                  )}
                  
                  {locationPhotos[loc.id] && locationPhotos[loc.id].length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontSize: '13px', color: '#6e6e73', marginBottom: '8px' }}>Фотографии:</p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {locationPhotos[loc.id].map((photo, idx) => (
                          <img 
                            key={idx} 
                            src={photo.url} 
                            alt={`Фото ${idx + 1}`} 
                            style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() => window.open(photo.url, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {activeTab === 'pending' && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e9ecef' }}>
                    <button
                      onClick={() => approveLocation(loc.id)}
                      style={{ flex: 1, padding: '10px', backgroundColor: '#34c759', color: 'white', border: 'none', borderRadius: '40px', cursor: 'pointer', fontWeight: 500 }}
                    >
                      ✅ Одобрить
                    </button>
                    <button
                      onClick={() => openRejectModal(loc)}
                      style={{ flex: 1, padding: '10px', backgroundColor: '#ff3b30', color: 'white', border: 'none', borderRadius: '40px', cursor: 'pointer', fontWeight: 500 }}
                    >
                      ❌ Отклонить
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showRejectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowRejectModal(false)}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', width: '90%', maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 600 }}>Отклонение локации</h3>
            <p style={{ marginBottom: '12px', color: '#4b4b4f' }}>Укажите причину отказа:</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Например: место не соответствует описанию, некорректные координаты и т.д."
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ccc', minHeight: '100px', marginBottom: '20px', fontSize: '14px' }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowRejectModal(false)} style={{ padding: '10px 20px', borderRadius: '40px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}>Отмена</button>
              <button onClick={rejectLocation} style={{ padding: '10px 20px', borderRadius: '40px', backgroundColor: '#ff3b30', color: 'white', border: 'none', cursor: 'pointer' }}>Отклонить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModerateLocations;