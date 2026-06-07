import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [collections, setCollections] = useState([]);
  const [myLocations, setMyLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('favorites');
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showAddCollectionModal, setShowAddCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [editingCollection, setEditingCollection] = useState(null);
  const [editCollectionName, setEditCollectionName] = useState('');
  const [showAddToCollectionModal, setShowAddToCollectionModal] = useState(false);
  const [selectedLocationForCollection, setSelectedLocationForCollection] = useState(null);
  const [locationPhotos, setLocationPhotos] = useState({});
  const [collectionItems, setCollectionItems] = useState({});
  const [rejectionReasons, setRejectionReasons] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return navigate('/auth');
      setUser(user);
      await loadUserData(user.id);
      setLoading(false);
    });
  }, [navigate]);

  const loadUserData = async (userId) => {
    // Загружаем избранное
    const { data: favs } = await supabase
      .from('favorites')
      .select('locations(*)')
      .eq('user_id', userId);
    const favLocations = favs?.map(f => f.locations) || [];
    setFavorites(favLocations);

    // Загружаем подборки
    const { data: cols } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setCollections(cols || []);

    // Загружаем мои локации
    const { data: myLocs } = await supabase
      .from('locations')
      .select('*')
      .eq('author_id', userId)
      .order('created_at', { ascending: false });
    setMyLocations(myLocs || []);

    // Загружаем причины отклонения для моих локаций
    const reasons = {};
    for (const loc of myLocs || []) {
      if (loc.status === 'rejected' && loc.rejection_reason) {
        reasons[loc.id] = loc.rejection_reason;
      }
    }
    setRejectionReasons(reasons);

    // Загружаем фото для избранных локаций и моих локаций
    const allLocationIds = [...(favLocations || []), ...(myLocs || [])].map(l => l.id).filter(Boolean);
    const uniqueIds = [...new Set(allLocationIds)];
    
    for (const locId of uniqueIds) {
      const { data: photos } = await supabase
        .from('photos')
        .select('url')
        .eq('location_id', locId)
        .eq('status', 'approved')
        .eq('is_main', true)
        .limit(1);
      
      if (photos && photos.length > 0) {
        setLocationPhotos(prev => ({ ...prev, [locId]: photos[0].url }));
      } else {
        const { data: anyPhotos } = await supabase
          .from('photos')
          .select('url')
          .eq('location_id', locId)
          .eq('status', 'approved')
          .limit(1);
        if (anyPhotos && anyPhotos.length > 0) {
          setLocationPhotos(prev => ({ ...prev, [locId]: anyPhotos[0].url }));
        }
      }
    }

    // Загружаем элементы подборок
    if (cols && cols.length > 0) {
      for (const col of cols) {
        const { data: items } = await supabase
          .from('collection_items')
          .select('locations(*)')
          .eq('collection_id', col.id);
        
        const locations = items?.map(item => item.locations).filter(Boolean) || [];
        setCollectionItems(prev => ({ ...prev, [col.id]: locations }));
        
        // Загружаем фото для локаций в подборках
        for (const loc of locations) {
          if (loc && !locationPhotos[loc.id]) {
            const { data: photos } = await supabase
              .from('photos')
              .select('url')
              .eq('location_id', loc.id)
              .eq('status', 'approved')
              .limit(1);
            if (photos && photos.length > 0) {
              setLocationPhotos(prev => ({ ...prev, [loc.id]: photos[0].url }));
            }
          }
        }
      }
    }
  };

  const removeFavorite = async (locationId) => {
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('location_id', locationId);
    setFavorites(favorites.filter(loc => loc.id !== locationId));
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) {
      alert('Введите название подборки');
      return;
    }
    const { data, error } = await supabase
      .from('collections')
      .insert({ user_id: user.id, name: newCollectionName.trim() })
      .select()
      .single();
    
    if (error) {
      alert('Ошибка при создании подборки: ' + error.message);
    } else {
      setCollections([data, ...collections]);
      setCollectionItems(prev => ({ ...prev, [data.id]: [] }));
      setNewCollectionName('');
      setShowAddCollectionModal(false);
    }
  };

  const deleteCollection = async (collectionId) => {
    if (confirm('Удалить эту подборку?')) {
      await supabase.from('collection_items').delete().eq('collection_id', collectionId);
      await supabase.from('collections').delete().eq('id', collectionId);
      setCollections(collections.filter(c => c.id !== collectionId));
      if (selectedCollection?.id === collectionId) setSelectedCollection(null);
    }
  };

  const updateCollectionName = async (collectionId, newName) => {
    if (!newName.trim()) return;
    await supabase.from('collections').update({ name: newName.trim() }).eq('id', collectionId);
    setCollections(collections.map(c => c.id === collectionId ? { ...c, name: newName.trim() } : c));
    if (selectedCollection?.id === collectionId) {
      setSelectedCollection({ ...selectedCollection, name: newName.trim() });
    }
    setEditingCollection(null);
  };

  const addToCollection = async (collectionId, locationId) => {
    const { error } = await supabase
      .from('collection_items')
      .insert({ collection_id: collectionId, location_id: locationId });
    
    if (error) {
      alert('Ошибка при добавлении: ' + error.message);
    } else {
      const updatedLocations = await loadCollectionItems(collectionId);
      setCollectionItems(prev => ({ ...prev, [collectionId]: updatedLocations }));
      setShowAddToCollectionModal(false);
      setSelectedLocationForCollection(null);
    }
  };

  const loadCollectionItems = async (collectionId) => {
    const { data: items } = await supabase
      .from('collection_items')
      .select('locations(*)')
      .eq('collection_id', collectionId);
    
    const locations = items?.map(item => item.locations).filter(Boolean) || [];
    
    for (const loc of locations) {
      if (loc && !locationPhotos[loc.id]) {
        const { data: photos } = await supabase
          .from('photos')
          .select('url')
          .eq('location_id', loc.id)
          .eq('status', 'approved')
          .limit(1);
        if (photos && photos.length > 0) {
          setLocationPhotos(prev => ({ ...prev, [loc.id]: photos[0].url }));
        }
      }
    }
    
    return locations;
  };

  const removeFromCollection = async (collectionId, locationId) => {
    await supabase
      .from('collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('location_id', locationId);
    
    const updatedLocations = (collectionItems[collectionId] || []).filter(loc => loc.id !== locationId);
    setCollectionItems(prev => ({ ...prev, [collectionId]: updatedLocations }));
  };

  const getAvailableFavoritesForCollection = () => {
    const currentCollectionIds = new Set((collectionItems[selectedCollection?.id] || []).map(l => l.id));
    return favorites.filter(fav => !currentCollectionIds.has(fav.id));
  };

  const getCollectionPreviewImages = (collectionId) => {
    const items = collectionItems[collectionId] || [];
    return items.slice(0, 4);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Загрузка...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Шапка профиля */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '40px', paddingBottom: '24px', borderBottom: '1px solid #e8e8ed' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f0f0f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
          👤
        </div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '8px', color: '#1d1d1f' }}>{user?.email?.split('@')[0] || 'Пользователь'}</h1>
          <p style={{ color: '#6e6e73', fontSize: '14px' }}>Участник с {new Date(user?.created_at).toLocaleDateString('ru-RU')}</p>
        </div>
      </div>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: '32px', marginBottom: '32px', borderBottom: '1px solid #e8e8ed' }}>
        <button
          onClick={() => { setActiveTab('favorites'); setSelectedCollection(null); }}
          style={{
            paddingBottom: '12px',
            fontSize: '16px',
            fontWeight: activeTab === 'favorites' ? 600 : 400,
            color: activeTab === 'favorites' ? '#0071e3' : '#6e6e73',
            borderBottom: activeTab === 'favorites' ? '2px solid #0071e3' : 'none',
            background: 'none',
            cursor: 'pointer'
          }}
        >
          Избранное ({favorites.length})
        </button>
        <button
          onClick={() => { setActiveTab('collections'); setSelectedCollection(null); }}
          style={{
            paddingBottom: '12px',
            fontSize: '16px',
            fontWeight: activeTab === 'collections' ? 600 : 400,
            color: activeTab === 'collections' ? '#0071e3' : '#6e6e73',
            borderBottom: activeTab === 'collections' ? '2px solid #0071e3' : 'none',
            background: 'none',
            cursor: 'pointer'
          }}
        >
          Подборки ({collections.length})
        </button>
        <button
          onClick={() => { setActiveTab('my-locations'); setSelectedCollection(null); }}
          style={{
            paddingBottom: '12px',
            fontSize: '16px',
            fontWeight: activeTab === 'my-locations' ? 600 : 400,
            color: activeTab === 'my-locations' ? '#0071e3' : '#6e6e73',
            borderBottom: activeTab === 'my-locations' ? '2px solid #0071e3' : 'none',
            background: 'none',
            cursor: 'pointer'
          }}
        >
          Мои локации
        </button>
      </div>

      {/* ========== ИЗБРАННОЕ ========== */}
      {activeTab === 'favorites' && (
        <div>
          {favorites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#f5f5f7', borderRadius: '24px', color: '#6e6e73' }}>
              <p style={{ fontSize: '18px', marginBottom: '8px' }}>❤️ У вас пока нет избранных мест</p>
              <p>Сохраняйте локации, нажимая на сердечко в карточке места</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {favorites.map(loc => (
                <div 
                  key={loc.id} 
                  style={{ 
                    background: 'white', 
                    borderRadius: '20px', 
                    overflow: 'hidden', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)', 
                    transition: 'transform 0.2s', 
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%'
                  }} 
                  onClick={() => navigate(`/city/${loc.city_id}`)}
                >
                  <div style={{ position: 'relative', height: '180px', backgroundColor: '#f0f0f4', flexShrink: 0 }}>
                    {locationPhotos[loc.id] ? (
                      <img src={locationPhotos[loc.id]} alt={loc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>📍</div>
                    )}
                  </div>
                  <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px', color: '#1d1d1f' }}>{loc.name}</h3>
                    <p style={{ fontSize: '13px', color: '#8e8e93', marginBottom: '16px', flex: 1 }}>{categoryNames[loc.category] || loc.category}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFavorite(loc.id); }}
                      style={{ 
                        padding: '8px 16px', 
                        borderRadius: '40px', 
                        backgroundColor: '#ff6b6b', 
                        color: 'white', 
                        border: 'none', 
                        fontSize: '14px', 
                        cursor: 'pointer', 
                        transition: 'opacity 0.2s',
                        width: '100%'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                    Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== ПОДБОРКИ ========== */}
      {activeTab === 'collections' && (
        <div>
          {/* Кнопка создания подборки */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
            <button
              onClick={() => setShowAddCollectionModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#0071e3',
                color: 'white',
                border: 'none',
                borderRadius: '40px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '18px' }}>+</span> Создать подборку
            </button>
          </div>

          {selectedCollection ? (
            // Просмотр подборки
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelectedCollection(null)}
                  style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#0071e3' }}
                >
                  ←
                </button>
                {editingCollection === selectedCollection.id ? (
                  <input
                    type="text"
                    value={editCollectionName}
                    onChange={(e) => setEditCollectionName(e.target.value)}
                    onBlur={() => updateCollectionName(selectedCollection.id, editCollectionName)}
                    onKeyPress={(e) => e.key === 'Enter' && updateCollectionName(selectedCollection.id, editCollectionName)}
                    autoFocus
                    style={{ fontSize: '24px', fontWeight: 600, padding: '4px 8px', border: '1px solid #0071e3', borderRadius: '8px', outline: 'none' }}
                  />
                ) : (
                  <h2 style={{ fontSize: '24px', fontWeight: 600 }}>{selectedCollection.name}</h2>
                )}
                <button
                  onClick={() => { setEditingCollection(selectedCollection.id); setEditCollectionName(selectedCollection.name); }}
                  style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6e6e73' }}
                >
                  ✏️
                </button>
                <button
                  onClick={() => deleteCollection(selectedCollection.id)}
                  style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#ff6b6b' }}
                >
                  🗑️
                </button>
                <button
                  onClick={() => setShowAddToCollectionModal(true)}
                  style={{
                    marginLeft: 'auto',
                    padding: '8px 16px',
                    backgroundColor: '#0071e3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '40px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  + Добавить локации
                </button>
              </div>

              {(collectionItems[selectedCollection.id] || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#f5f5f7', borderRadius: '24px', color: '#6e6e73' }}>
                  <p style={{ fontSize: '18px', marginBottom: '8px' }}>📁 Подборка пуста</p>
                  <p>Добавьте локации из избранного</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                  {(collectionItems[selectedCollection.id] || []).map(loc => (
                    <div key={loc.id} style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', position: 'relative', cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }} onClick={() => navigate(`/city/${loc.city_id}`)}>
                      <div style={{ position: 'relative', height: '180px', backgroundColor: '#f0f0f4', flexShrink: 0 }}>
                        {locationPhotos[loc.id] ? (
                          <img src={locationPhotos[loc.id]} alt={loc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>📍</div>
                        )}
                      </div>
                      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px', color: '#1d1d1f' }}>{loc.name}</h3>
                        <p style={{ fontSize: '13px', color: '#8e8e93', marginBottom: '16px', flex: 1 }}>{categoryNames[loc.category] || loc.category}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromCollection(selectedCollection.id, loc.id); }}
                          style={{ padding: '8px 16px', borderRadius: '40px', backgroundColor: '#ff6b6b', color: 'white', border: 'none', fontSize: '14px', cursor: 'pointer', width: '100%' }}
                        >
                        Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Список подборок
            <div>
              {collections.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#f5f5f7', borderRadius: '24px', color: '#6e6e73' }}>
                  <p style={{ fontSize: '18px', marginBottom: '8px' }}>📁 У вас пока нет подборок</p>
                  <p>Создайте подборку, чтобы группировать локации</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                  {collections.map(col => {
                    const previewLocations = getCollectionPreviewImages(col.id);
                    return (
                      <div
                        key={col.id}
                        onClick={() => setSelectedCollection(col)}
                        style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'transform 0.2s' }}
                      >
                        {/* Превью подборки */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2px', backgroundColor: '#e8e8ed', height: '160px' }}>
                          {previewLocations.length === 0 ? (
                            <div style={{ gridColumn: 'span 2', backgroundColor: '#f0f0f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>📁</div>
                          ) : (
                            [...previewLocations, ...Array(4 - previewLocations.length).fill(null)].slice(0, 4).map((loc, idx) => (
                              <div key={idx} style={{ backgroundColor: '#f0f0f4', overflow: 'hidden' }}>
                                {loc && locationPhotos[loc.id] ? (
                                  <img src={locationPhotos[loc.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: '#c6c6c8' }}>📍</div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                        <div style={{ padding: '16px' }}>
                          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px', color: '#1d1d1f' }}>{col.name}</h3>
                          <p style={{ fontSize: '13px', color: '#8e8e93' }}>{collectionItems[col.id]?.length || 0} локаций</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========== МОИ ЛОКАЦИИ ========== */}
      {activeTab === 'my-locations' && (
        <div>
          {myLocations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#f5f5f7', borderRadius: '24px', color: '#6e6e73' }}>
              <p style={{ fontSize: '18px', marginBottom: '8px' }}>📝 Вы ещё не добавили ни одной локации</p>
              <p>Нажмите «Добавить локацию» на странице города</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {myLocations.map(loc => {
                let statusText = '';
                let statusColor = '';
                let statusBg = '';
                switch (loc.status) {
                  case 'pending':
                    statusText = '⏳ На модерации';
                    statusColor = '#f5a623';
                    statusBg = '#fff8e8';
                    break;
                  case 'approved':
                    statusText = '✅ Одобрено';
                    statusColor = '#34c759';
                    statusBg = '#e8f5ec';
                    break;
                  case 'rejected':
                    statusText = '❌ Отклонено';
                    statusColor = '#ff3b30';
                    statusBg = '#ffe8e8';
                    break;
                  default:
                    statusText = 'Статус неизвестен';
                    statusColor = '#8e8e93';
                    statusBg = '#f0f0f4';
                }
                return (
                  <div key={loc.id} style={{ display: 'flex', gap: '16px', background: 'white', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', alignItems: 'center' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '12px', backgroundColor: '#f0f0f4', overflow: 'hidden', flexShrink: 0 }}>
                      {locationPhotos[loc.id] ? (
                        <img src={locationPhotos[loc.id]} alt={loc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>📍</div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px', color: '#1d1d1f' }}>{loc.name}</h3>
                      <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', backgroundColor: statusBg, fontSize: '12px', fontWeight: 500, color: statusColor, marginBottom: '8px' }}>
                        {statusText}
                      </div>
                      {loc.status === 'rejected' && rejectionReasons[loc.id] && (
                        <p style={{ fontSize: '13px', color: '#ff3b30', marginTop: '8px' }}>
                          Причина: {rejectionReasons[loc.id]}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Модальное окно создания подборки */}
      {showAddCollectionModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAddCollectionModal(false)}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', width: '90%', maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 600 }}>Новая подборка</h3>
            <input
              type="text"
              placeholder="Название подборки"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ccc', marginBottom: '20px', fontSize: '16px' }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddCollectionModal(false)} style={{ padding: '10px 20px', borderRadius: '40px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}>Отмена</button>
              <button onClick={createCollection} style={{ padding: '10px 20px', borderRadius: '40px', backgroundColor: '#0071e3', color: 'white', border: 'none', cursor: 'pointer' }}>Создать</button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно добавления локаций в подборку */}
      {showAddToCollectionModal && selectedCollection && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAddToCollectionModal(false)}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 600 }}>Добавить в «{selectedCollection.name}»</h3>
            {getAvailableFavoritesForCollection().length === 0 ? (
              <p style={{ color: '#6e6e73', textAlign: 'center', padding: '32px' }}>Нет доступных локаций для добавления</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {getAvailableFavoritesForCollection().map(loc => (
                  <div key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', border: '1px solid #e8e8ed' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '8px', backgroundColor: '#f0f0f4', overflow: 'hidden', flexShrink: 0 }}>
                      {locationPhotos[loc.id] ? (
                        <img src={locationPhotos[loc.id]} alt={loc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📍</div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontWeight: 600, marginBottom: '4px' }}>{loc.name}</h4>
                      <p style={{ fontSize: '12px', color: '#8e8e93' }}>{categoryNames[loc.category] || loc.category}</p>
                    </div>
                    <button
                      onClick={() => addToCollection(selectedCollection.id, loc.id)}
                      style={{ padding: '8px 16px', borderRadius: '40px', backgroundColor: '#0071e3', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                      Добавить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const categoryNames = {
  1: 'Архитектура',
  2: 'Природа',
  3: 'Достопримечательности',
  4: 'Кафе',
  5: 'Фото-локации',
};

export default ProfilePage;