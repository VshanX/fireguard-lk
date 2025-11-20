import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';  // make sure this file exists with your keys
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [lat, setLat] = useState(6.9271);
  const [lng, setLng] = useState(79.8612);
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchIncidents();
    const channel = supabase.channel('incidents').on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => fetchIncidents()).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const fetchIncidents = async () => {
    const { data } = await supabase.from('incidents').select('*');
    setIncidents(data || []);
  };

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
      setMessage('Location captured!');
    });
  };

  const uploadPhoto = async (file) => {
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36)}.${fileExt}`;
    const { error } = await supabase.storage.from('incident-photos').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('incident-photos').getPublicUrl(fileName);
    setUploading(false);
    return data.publicUrl;
  };

  const submit = async () => {
    if (!title) return setMessage('Title required');

    let photoUrl = null;
    if (photo) photoUrl = await uploadPhoto(photo);

    const { error } = await supabase.from('incidents').insert({
      title,
      description,
      severity,
      latitude: lat,
      longitude: lng,
      photo_url: photoUrl,
      status: 'reported'
    });

    if (error) setMessage('Error: ' + error.message);
    else {
      setMessage('Reported successfully! 🚒 On the way!');
      setTitle(''); setDescription(''); setPhoto(null);
    }
  };

  return (
    <div style={{ padding: 20, background: '#111', color: 'white', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', color: '#ff4444' }}>🔥 FireGuard LK – Report Emergency</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
        {/* Form */}
        <div style={{ background: '#222', padding: 30, borderRadius: 15 }}>
          <input placeholder="Title (e.g. House fire in Bambalapitiya)" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: 15, marginBottom: 10, borderRadius: 8 }} />
          <textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', height: 100, padding: 15, marginBottom: 10, borderRadius: 8 }} />
          
          <select value={severity} onChange={e => setSeverity(e.target.value)} style={{ width: '100%', padding: 15, marginBottom: 10 }}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical – Life Threatening</option>
          </select>

          <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} style={{ marginBottom: 10 }} />
          {photo && <img src={URL.createObjectURL(photo)} alt="preview" style={{ width: '100%', borderRadius: 10, marginBottom: 10 }} />}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={getLocation} style={{ padding: 15, background: '#1976d2', color: 'white', border: 'none', flex: 1 }}>📍 Use My Location</button>
            <button onClick={submit} disabled={uploading} style={{ padding: 15, background: '#d32f2f', color: 'white', border: 'none', flex: 2 }}>
              {uploading ? 'Uploading...' : '🚒 REPORT FIRE NOW'}
            </button>
          </div>
          <p style={{ marginTop: 10, color: message.includes('Error') ? 'red' : '#4caf50' }}>{message}</p>
        </div>

        {/* Map */}
        <div>
          <h2>Live Incidents</h2>
          <div style={{ height: 600, borderRadius: 15, overflow: 'hidden' }}>
            <MapContainer center={[6.9271, 79.8612]} zoom={10} style={{ height: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {incidents.map(inc => (
                <Marker key={inc.id} position={[inc.latitude, inc.longitude]}>
                  <Popup>
                    <b>{inc.title}</b><br />
                    {inc.photo_url && <img src={inc.photo_url} alt="fire" style={{ width: '100%', margin: '10px 0' }} />}<br />
                    Status: {inc.status}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}