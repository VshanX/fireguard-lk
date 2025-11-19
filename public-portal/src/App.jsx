import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';  // ← THIS LINE WAS MISSING
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon (important!)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Fix marker icon issue
let DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25,41],
  iconAnchor: [12,41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: 'medium',
    latitude: 6.9271,   // Default Colombo
    longitude: 79.8612
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Load all incidents in realtime
  useEffect(() => {
    const subscription = supabase
      .channel('public:incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, payload => {
        fetchIncidents();
      })
      .subscribe();

    fetchIncidents();
    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchIncidents = async () => {
    const { data } = await supabase.from('incidents').select('*');
    setIncidents(data || []);
  };

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      setForm({ ...form, latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      setMessage('Location captured!');
    });
  };

  const submitReport = async () => {
    if (!form.title) return setMessage('Please add a title');

    setLoading(true);
    const { data, error } = await supabase
      .from('incidents')
      .insert([{
        title: form.title,
        description: form.description,
        severity: form.severity,
        latitude: form.latitude,
        longitude: form.longitude,
        status: 'reported'
      }]);

    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Fire reported successfully! Fire brigade notified.');
      setForm({ ...form, title: '', description: '' });
    }
    setLoading(false);
  };

  return (
    <>
      <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ color: '#d32f2f', textAlign: 'center' }}>🔥 FireGuard LK – Public Reporting</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
          {/* Form */}
          <div style={{ padding: '20px', border: '2px solid #d32f2f', borderRadius: '10px', backgroundColor: '#fff' }}>
            <h2>Report Emergency</h2>
            <input
              placeholder="Title (e.g., House fire in Dehiwala)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={{ width: '100%', padding: '10px', margin: '10px 0' }}
            />
            <textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ width: '100%', height: '100px', padding: '10px' }}
            />
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} style={{ width: '100%', padding: '10px', margin: '10px 0' }}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical – Life Threatening</option>
            </select>
            <button onClick={getLocation} style={{ padding: '10px 20px', background: '#1976d2', color: 'white', border: 'none', marginRight: '10px' }}>
              📍 Use My Location
            </button>
            <button onClick={submitReport} disabled={loading} style={{ padding: '10px 20px', background: '#d32f2f', color: 'white', border: 'none' }}>
              {loading ? 'Sending...' : '🚒 Report Fire Now'}
            </button>
            <p style={{ marginTop: '10px', color: message.includes('Error') ? 'red' : 'green' }}>{message}</p>
          </div>

          {/* Live Map */}
          <div>
            <h2>Live Incidents Map</h2>
            <div style={{ height: '500px', border: '2px solid #ccc', borderRadius: '10px' }}>
              <MapContainer center={[6.9271, 79.8612]} zoom={10} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {incidents.map(inc => (
                  <Marker key={inc.id} position={[inc.latitude, inc.longitude]}>
                    <Popup>
                      <b>{inc.title}</b><br/>
                      Severity: {inc.severity.toUpperCase()}<br/>
                      Status: {inc.status}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}