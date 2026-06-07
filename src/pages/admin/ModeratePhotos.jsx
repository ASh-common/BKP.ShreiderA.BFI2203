import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

function ModeratePhotos() {
  const [photos, setPhotos] = useState({ pending: [], approved: [], rejected: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchAllPhotos();
  }, []);

  const fetchAllPhotos = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('photos')
      .select(`
        *,
        locations(name, city_id)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Ошибка загрузки:', error);
      setLoading(false);
      return;
    }
    
    const grouped = {
      pending: data?.filter(photo => photo.status === 'pending') || [],
      approved: data?.filter(photo => photo.status === 'approved') || [],
      rejected: data?.filter(photo => photo.status === 'rejected') || []
    };
    setPhotos(grouped);
    setLoading(false);
  };

  const approvePhoto = async (photoId) => {
    const { error } = await supabase
      .from('photos')
      .update({ status: 'approved' })
      .eq('id', photoId);
    
    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      alert('Фото одобрено');
      fetchAllPhotos();
    }
  };

  const rejectPhoto = async (photoId) => {
    const { error } = await supabase
      .from('photos')
      .update({ status: 'rejected' })
      .eq('id', photoId);
    
    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      alert('Фото отклонено');
      fetchAllPhotos();
    }
  };

  const deletePhoto = async (photo) => {
    if (!confirm('Удалить фото?')) return;
    
    // Удаляем из Storage
    const path = photo.url.split('/').slice(-4).join('/');
    await supabase.storage.from('photos').remove([path]);
    
    // Удаляем из БД
    await supabase.from('photos').delete().eq('id', photo.id);
    
    alert('Фото удалено');
    fetchAllPhotos();
  };

  const tabs = [
    { key: 'pending', label: 'На модерации', count: photos.pending.length, color: '#f5a623' },
    { key: 'approved', label: 'Одобренные', count: photos.approved.length, color: '#34c759' },
    { key: 'rejected', label: 'Отклонённые', count: photos.rejected.length, color: '#ff3b30' }
  ];

  const currentPhotos = photos[activeTab] || [];

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>Загрузка...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '8px' }}>Модерация фотографий</h1>
        <p style={{ color: '#6e6e73' }}>Управление всеми фотографиями платформы</p>
      </div>

      {/* Вкладки */}
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

      {currentPhotos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#f5f5f7', borderRadius: '24px', color: '#6e6e73' }}>
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>
            {activeTab === 'pending' && '🖼 Нет фотографий на модерации'}
            {activeTab === 'approved' && '✅ Нет одобренных фотографий'}
            {activeTab === 'rejected' && '❌ Нет отклонённых фотографий'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {currentPhotos.map(photo => (
            <div key={photo.id} style={{ backgroundColor: '#f8f9fa', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e9ecef', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ height: '200px', backgroundColor: '#f0f0f4', overflow: 'hidden' }}>
                <img src={photo.url} alt="Фото" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontWeight: 500, marginBottom: '4px' }}>{photo.locations?.name || 'Локация не найдена'}</p>
                <p style={{ fontSize: '13px', color: '#8e8e93', marginBottom: '12px', flex: 1 }}>ID фото: {photo.id}</p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {activeTab === 'pending' ? (
                    <>
                      <button
                        onClick={() => approvePhoto(photo.id)}
                        style={{ flex: 1, padding: '8px', backgroundColor: '#34c759', color: 'white', border: 'none', borderRadius: '40px', cursor: 'pointer' }}
                      >
                        ✅ Одобрить
                      </button>
                      <button
                        onClick={() => rejectPhoto(photo.id)}
                        style={{ flex: 1, padding: '8px', backgroundColor: '#ff3b30', color: 'white', border: 'none', borderRadius: '40px', cursor: 'pointer' }}
                      >
                        ❌ Отклонить
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => deletePhoto(photo)}
                      style={{ flex: 1, padding: '8px', backgroundColor: '#ff6b6b', color: 'white', border: 'none', borderRadius: '40px', cursor: 'pointer' }}
                    >
                    Удалить
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ModeratePhotos;