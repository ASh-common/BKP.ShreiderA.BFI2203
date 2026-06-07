import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'leaflet/dist/leaflet.css';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// Функция для создания цветного маркера
const getMarkerIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<svg width="25" height="41" viewBox="0 0 25 41" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21.9 12.5 41 12.5 41C12.5 41 25 21.9 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="12.5" cy="12.5" r="4" fill="white"/>
    </svg>`,
    iconSize: [25, 41],
    iconAnchor: [12.5, 41],
    popupAnchor: [0, -34],
  });
};

// Компонент для отображения попапа при наведении
function MarkerWithHover({ location, children, map }) {
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [photoUrl, setPhotoUrl] = useState(null);

  useEffect(() => {
    const fetchPhoto = async () => {
      if (location.id) {
        const { data } = await supabase
          .from('photos')
          .select('url')
          .eq('location_id', location.id)
          .eq('status', 'approved')
          .limit(1);
        if (data && data.length > 0) {
          setPhotoUrl(data[0].url);
        }
      }
    };
    fetchPhoto();
  }, [location.id]);

  const handleMouseEnter = () => {
    if (map) {
      const point = map.latLngToContainerPoint([location.lat, location.lng]);
      setPopupPosition({ x: point.x, y: point.y - 50 });
      setShowPopup(true);
    }
  };

  const handleMouseLeave = () => {
    setShowPopup(false);
  };

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'pointer' }}
      >
        {children}
      </div>
      {showPopup && map && (
        <div
          style={{
            position: 'absolute',
            left: popupPosition.x,
            top: popupPosition.y,
            transform: 'translateX(-50%)',
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '8px 12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {photoUrl && (
            <img
              src={photoUrl}
              alt=""
              style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
            />
          )}
          <span style={{ fontWeight: 500 }}>{location.name}</span>
        </div>
      )}
    </>
  );
}

// Компонент для мини-карты с выбором координат и отображением пина
function MiniMapSelector({ onLocationSelect }) {
  const [tempMarker, setTempMarker] = useState(null);
  
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      setTempMarker({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
      onLocationSelect(lat.toFixed(6), lng.toFixed(6));
    },
  });

  return tempMarker ? (
    <Marker 
      position={[parseFloat(tempMarker.lat), parseFloat(tempMarker.lng)]}
      icon={L.divIcon({
        className: 'temp-marker',
        html: `<svg width="25" height="41" viewBox="0 0 25 41" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21.9 12.5 41 12.5 41C12.5 41 25 21.9 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="#999999" stroke="white" stroke-width="2"/>
          <circle cx="12.5" cy="12.5" r="4" fill="white"/>
        </svg>`,
        iconSize: [25, 41],
        iconAnchor: [12.5, 41],
      })}
    />
  ) : null;
}

// Компонент для кастомных кнопок управления картой
function MapControls({ map }) {
  const [locationError, setLocationError] = useState(false);
  
  if (!map) return null;
  
  return (
    <div style={{
      position: 'absolute',
      bottom: '30px',
      right: '15px',
      zIndex: 1000,
    }}>
      <button
        onClick={() => {
          if (navigator.geolocation) {
            setLocationError(false);
            navigator.geolocation.getCurrentPosition(
              (position) => {
                map.flyTo([position.coords.latitude, position.coords.longitude], 15);
              },
              () => {
                setLocationError(true);
                alert('Не удалось определить ваше местоположение. Разрешите доступ к геолокации.');
              }
            );
          } else {
            alert('Геолокация не поддерживается вашим браузером');
          }
        }}
        style={{
          width: '40px',
          height: '40px',
          backgroundColor: 'white',
          border: 'none',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px'
        }}
      >
        <img 
          src="/location.png" 
          alt="Моё местоположение" 
          style={{ 
            width: '24px', 
            height: '24px',
            opacity: locationError ? 0.5 : 1
          }} 
        />
      </button>
    </div>
  );
}

// Цвета для категорий
const categoryColors = {
  1: '#f7b61dff',
  2: '#82c91e',
  3: '#339af0',
  4: '#ff6b6b',
  5: '#b949ffff',
};

const categoryNames = {
  1: 'Архитектура',
  2: 'Природа',
  3: 'Достопримечательности',
  4: 'Кафе',
  5: 'Фото-локации',
};

function CityPage() {
  const { id } = useParams();
  const [city, setCity] = useState(null);
  const [allLocations, setAllLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [user, setUser] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPhotoForm, setShowPhotoForm] = useState(false);
  const [currentLocationId, setCurrentLocationId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: '', description: '', lat: '', lng: '', category_id: 2 });
  const [newLocationFiles, setNewLocationFiles] = useState([]);
  const [uploadingNewLocation, setUploadingNewLocation] = useState(false);
  const [locationPhotos, setLocationPhotos] = useState({});
  const [mainMap, setMainMap] = useState(null);
  const [favoriteLocations, setFavoriteLocations] = useState(new Set());
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    fetchCityAndLocations();
  }, [id]);

  // Перезагружаем избранное при смене пользователя
  useEffect(() => {
    if (user && city) {
      const loadFavorites = async () => {
        const { data: favoritesData } = await supabase
          .from('favorites')
          .select('location_id')
          .eq('user_id', user.id);
        
        const favSet = new Set(favoritesData?.map(f => f.location_id) || []);
        setFavoriteLocations(favSet);
      };
      loadFavorites();
    }
  }, [user, city]);

  const fetchCityAndLocations = async () => {
    const { data: cityData } = await supabase.from('cities').select('*').eq('id', id).single();
    setCity(cityData);
    
    const { data: locationsData } = await supabase
      .from('locations')
      .select(`
        *,
        location_categories(
          category_id
        )
      `)
      .eq('city_id', id)
      .eq('status', 'approved');
    
    const locationsWithCategory = (locationsData || []).map(loc => ({
      ...loc,
      category_id: loc.location_categories?.[0]?.category_id || null
    }));
    
    setAllLocations(locationsWithCategory);
    setFilteredLocations(locationsWithCategory);
    
    for (const loc of locationsWithCategory) {
      const { data: photos } = await supabase
        .from('photos')
        .select('url')
        .eq('location_id', loc.id)
        .eq('status', 'approved');
      setLocationPhotos(prev => ({ ...prev, [loc.id]: photos || [] }));
    }
  };

  const handleFilterChange = (categoryId) => {
    let newFilters = [...activeFilters];
    if (newFilters.includes(categoryId)) {
      newFilters = newFilters.filter(c => c !== categoryId);
    } else {
      newFilters.push(categoryId);
    }
    setActiveFilters(newFilters);
    
    if (newFilters.length === 0) {
      setFilteredLocations(allLocations);
    } else {
      setFilteredLocations(allLocations.filter(loc => newFilters.includes(loc.category_id)));
    }
  };

  const addToFavorites = async (locationId) => {
    if (!user) {
      alert('Войдите в аккаунт');
      return;
    }
    
    if (favoriteLocations.has(locationId)) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('location_id', locationId);
      
      if (!error) {
        setFavoriteLocations(prev => {
          const newSet = new Set(prev);
          newSet.delete(locationId);
          return newSet;
        });
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, location_id: locationId });
      
      if (!error) {
        setFavoriteLocations(prev => {
          const newSet = new Set(prev);
          newSet.add(locationId);
          return newSet;
        });
      }
    }
  };

  const handleAddLocation = async () => {
    if (!user) return alert('Войдите в аккаунт');
    
    if (!newLocation.name.trim()) {
      alert('Введите название локации');
      return;
    }
    
    if (!newLocation.lat || !newLocation.lng) {
      alert('Выберите местоположение на карте');
      return;
    }
    
    setUploadingNewLocation(true);
    
    const cityId = parseInt(id);
    
    // 1. Создаём локацию
    const { data: locationData, error: locationError } = await supabase
      .from('locations')
      .insert({
        name: newLocation.name.trim(),
        description: newLocation.description?.trim() || '',
        city_id: cityId,
        author_id: user.id,
        status: 'pending',
        lat: parseFloat(newLocation.lat),
        lng: parseFloat(newLocation.lng),
      })
      .select()
      .single();
    
    if (locationError) {
      alert('Ошибка при создании локации: ' + locationError.message);
      setUploadingNewLocation(false);
      return;
    }
    
    // 2. Добавляем категорию
    const { error: categoryError } = await supabase
      .from('location_categories')
      .insert({
        location_id: locationData.id,
        category_id: parseInt(newLocation.category_id),
      });
    
    if (categoryError) {
      console.error('Ошибка при добавлении категории:', categoryError);
    }
    
    // 3. Загружаем фотографии (если есть)
    if (newLocationFiles.length > 0) {
      let uploadSuccessCount = 0;
      
      for (let i = 0; i < newLocationFiles.length; i++) {
        const file = newLocationFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${locationData.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, file);
        
        if (uploadError) {
          console.error('Ошибка загрузки фото:', uploadError);
          continue;
        }
        
        const { data: urlData } = supabase.storage
          .from('photos')
          .getPublicUrl(filePath);
        
        const { error: dbError } = await supabase
          .from('photos')
          .insert({
            location_id: locationData.id,
            url: urlData.publicUrl,
            author_id: user.id,
            status: 'pending',
            is_main: i === 0
          });
        
        if (!dbError) uploadSuccessCount++;
      }
      
      if (uploadSuccessCount > 0) {
        alert(`Локация добавлена! Загружено ${uploadSuccessCount} фото. Всё отправлено на модерацию.`);
      } else {
        alert('Локация добавлена, но фото не загрузились. Попробуйте добавить фото позже.');
      }
    } else {
      alert('Локация отправлена на модерацию');
    }
    
    setShowAddForm(false);
    setNewLocation({ name: '', description: '', lat: '', lng: '', category_id: 2 });
    setNewLocationFiles([]);
    setUploadingNewLocation(false);
    fetchCityAndLocations();
  };

  const handleAddPhotos = async () => {
    if (!user) {
      alert('Войдите в аккаунт, чтобы добавлять фото');
      return;
    }
    
    if (!currentLocationId) {
      alert('Ошибка: локация не найдена');
      return;
    }
    
    if (selectedFiles.length === 0) {
      alert('Выберите фотографии');
      return;
    }
    
    setUploading(true);
    let successCount = 0;
    
    for (const file of selectedFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${currentLocationId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file);
      
      if (uploadError) {
        console.error('Ошибка загрузки:', uploadError);
        continue;
      }
      
      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);
      
      const { error: dbError } = await supabase
        .from('photos')
        .insert({
          location_id: currentLocationId,
          url: urlData.publicUrl,
          author_id: user.id,
          status: 'pending'
        });
      
      if (!dbError) successCount++;
    }
    
    alert(`Загружено ${successCount} фото. Отправлено на модерацию.`);
    setSelectedFiles([]);
    setShowPhotoForm(false);
    setUploading(false);
    fetchCityAndLocations();
  };

  if (!city) return <div>Загрузка...</div>;

  return (
    <div>
      {/* Верхняя панель с заголовком, фильтрами и кнопкой */}
      <div style={{ 
        padding: isMobile ? '16px' : '16px 24px',
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center', 
        flexWrap: 'wrap', 
        gap: isMobile ? '12px' : '16px'
      }}>
        <h1 style={{ fontSize: isMobile ? '24px' : '32px', margin: 0 }}>{city.name}</h1>
        
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '16px', 
          alignItems: isMobile ? 'stretch' : 'center' 
        }}>
          {/* Блок фильтров */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: 500, fontSize: isMobile ? '14px' : '16px' }}>Фильтры:</span>
            {Object.entries(categoryNames).map(([catId, name]) => (
              <label key={catId} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#f0f0f4',
                padding: isMobile ? '6px 12px' : '8px 16px',
                borderRadius: '20px',
                fontSize: isMobile ? '13px' : '14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}>
                <input type="checkbox" onChange={() => handleFilterChange(parseInt(catId))} style={{ margin: 0 }} /> {name}
              </label>
            ))}
          </div>
          
          {/* Кнопка добавления локации */}
          <button 
            onClick={() => setShowAddForm(true)} 
            style={{ 
              padding: isMobile ? '8px 16px' : '10px 20px', 
              backgroundColor: '#0071e3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '40px', 
              cursor: 'pointer',
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: 500,
              width: isMobile ? '100%' : 'auto'
            }}
          >
            + Добавить локацию
          </button>
        </div>
      </div>

      {/* Контейнер карты */}
      <div style={{ 
        position: 'relative', 
        margin: isMobile ? '0 12px' : '0 24px', 
        borderRadius: isMobile ? '16px' : '24px', 
        overflow: 'hidden', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)' 
      }}>
        <MapContainer
          center={[city.center_lat, city.center_lng]}
          zoom={13}
          style={{ height: isMobile ? '400px' : '550px', width: '100%', zIndex: 1 }}
          ref={setMainMap}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {filteredLocations.map(location => (
            <MarkerWithHover key={location.id} location={location} map={mainMap}>
              <Marker
                position={[location.lat, location.lng]}
                icon={getMarkerIcon(categoryColors[location.category_id] || '#339af0')}
                eventHandlers={{
                  click: () => setSelectedLocation(location)
                }}
              />
            </MarkerWithHover>
          ))}
        </MapContainer>
        
        <MapControls map={mainMap} />
      </div>

      {/* Детальное модальное окно локации */}
      {selectedLocation && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setSelectedLocation(null)}>
          <div style={{
            backgroundColor: 'white',
            maxWidth: '500px',
            width: isMobile ? 'calc(100% - 32px)' : '90%',
            borderRadius: '24px',
            overflow: 'hidden',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            <img
              src="/close.png"
              alt="Закрыть"
              onClick={() => setSelectedLocation(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '24px',
                height: '24px',
                cursor: 'pointer',
                zIndex: 10,
                backgroundColor: 'white',
                borderRadius: '50%',
                padding: '4px'
              }}
            />
            
            <Swiper
              modules={[Navigation, Pagination]}
              navigation
              pagination={{ clickable: true }}
              style={{ height: '300px' }}
            >
              {(locationPhotos[selectedLocation.id]?.length > 0 ? locationPhotos[selectedLocation.id] : [{ url: '/placeholder.jpg' }]).map((photo, idx) => (
                <SwiperSlide key={idx}>
                  <img
                    src={photo.url}
                    alt={selectedLocation.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
            
            <div style={{ padding: '20px' }}>
              <h2 style={{ marginBottom: '12px' }}>{selectedLocation.name}</h2>
              <p style={{ color: '#666', marginBottom: '20px', lineHeight: 1.5 }}>{selectedLocation.description}</p>
              
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
                <button
                  onClick={() => {
                    setCurrentLocationId(selectedLocation.id);
                    setShowPhotoForm(true);
                    setSelectedLocation(null);
                  }}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#0071e3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '40px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Добавить фото
                </button>
                <img
                  src="/heart.png"
                  alt="В избранное"
                  onClick={() => addToFavorites(selectedLocation.id)}
                  style={{
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    filter: favoriteLocations.has(selectedLocation.id) 
                      ? 'invert(27%) sepia(89%) saturate(7489%) hue-rotate(350deg) brightness(100%) contrast(120%)' 
                      : 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Форма добавления новой локации */}
      {showAddForm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowAddForm(false)}>
          <div style={{
            backgroundColor: 'white',
            maxWidth: '500px',
            width: isMobile ? 'calc(100% - 32px)' : '90%',
            borderRadius: '24px',
            padding: '24px',
            position: 'relative',
            boxSizing: 'border-box',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <img
              src="/close.png"
              alt="Закрыть"
              onClick={() => {
                setShowAddForm(false);
                setNewLocationFiles([]);
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '24px',
                height: '24px',
                cursor: 'pointer',
                zIndex: 10,
                backgroundColor: 'white',
                borderRadius: '50%',
                padding: '4px'
              }}
            />
            <h2 style={{ marginBottom: '20px' }}>Новая локация</h2>
            <input type="text" placeholder="Название" style={{ width: '100%', margin: '10px 0', padding: '12px', borderRadius: '12px', border: '1px solid #ccc', boxSizing: 'border-box' }} value={newLocation.name} onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })} />
            <textarea placeholder="Описание" style={{ width: '100%', margin: '10px 0', padding: '12px', borderRadius: '12px', border: '1px solid #ccc', minHeight: '100px', boxSizing: 'border-box' }} value={newLocation.description} onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })} />
            <select style={{ width: '100%', margin: '10px 0', padding: '12px', borderRadius: '12px', border: '1px solid #ccc', boxSizing: 'border-box' }} value={newLocation.category_id} onChange={(e) => setNewLocation({ ...newLocation, category_id: e.target.value })}>
              {Object.entries(categoryNames).map(([catId, name]) => (
                <option key={catId} value={catId}>{name}</option>
              ))}
            </select>
            
            <div style={{ margin: '10px 0' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Фотографии (необязательно):</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setNewLocationFiles(Array.from(e.target.files))}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
              {newLocationFiles.length > 0 && (
                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Выбрано файлов: {newLocationFiles.length}</p>
              )}
            </div>
            
            <div style={{ margin: '10px 0' }}>
              <p style={{ marginBottom: '8px' }}>Кликните на карту, чтобы выбрать место:</p>
              <div style={{ height: '200px', borderRadius: '12px', overflow: 'hidden' }}>
                <MapContainer
                  center={[city.center_lat, city.center_lng]}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MiniMapSelector 
                    onLocationSelect={(lat, lng) => {
                      setNewLocation({ ...newLocation, lat, lng });
                    }} 
                  />
                </MapContainer>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', margin: '10px 0', flexWrap: 'wrap' }}>
              <input type="text" placeholder="Широта" style={{ flex: 1, minWidth: '120px', padding: '12px', borderRadius: '12px', border: '1px solid #ccc', boxSizing: 'border-box' }} value={newLocation.lat} readOnly />
              <input type="text" placeholder="Долгота" style={{ flex: 1, minWidth: '120px', padding: '12px', borderRadius: '12px', border: '1px solid #ccc', boxSizing: 'border-box' }} value={newLocation.lng} readOnly />
            </div>
            
            <button 
              onClick={handleAddLocation} 
              disabled={uploadingNewLocation}
              style={{ 
                width: '100%', 
                padding: '12px', 
                backgroundColor: '#0071e3', 
                color: 'white', 
                border: 'none', 
                borderRadius: '40px', 
                marginTop: '10px', 
                cursor: uploadingNewLocation ? 'not-allowed' : 'pointer',
                opacity: uploadingNewLocation ? 0.7 : 1
              }}
            >
              {uploadingNewLocation ? 'Отправка...' : 'Отправить на проверку'}
            </button>
          </div>
        </div>
      )}

      {/* Форма добавления фото к существующей локации */}
      {showPhotoForm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowPhotoForm(false)}>
          <div style={{
            backgroundColor: 'white',
            maxWidth: '500px',
            width: isMobile ? 'calc(100% - 32px)' : '90%',
            borderRadius: '24px',
            padding: '24px',
            position: 'relative',
            boxSizing: 'border-box'
          }} onClick={(e) => e.stopPropagation()}>
            <img
              src="/close.png"
              alt="Закрыть"
              onClick={() => setShowPhotoForm(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '24px',
                height: '24px',
                cursor: 'pointer',
                zIndex: 10,
                backgroundColor: 'white',
                borderRadius: '50%',
                padding: '4px'
              }}
            />
            <h2 style={{ marginBottom: '20px' }}>Добавить фото</h2>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
              style={{ margin: '10px 0', width: '100%', boxSizing: 'border-box' }}
            />
            {selectedFiles.length > 0 && (
              <p>Выбрано файлов: {selectedFiles.length}</p>
            )}
            <button
              onClick={handleAddPhotos}
              disabled={uploading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#0071e3',
                color: 'white',
                border: 'none',
                borderRadius: '40px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                marginTop: '10px'
              }}
            >
              {uploading ? 'Загрузка...' : 'Отправить на проверку'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CityPage;