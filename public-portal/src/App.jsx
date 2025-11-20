import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [lat, setLat] = useState(6.9271);
  const [lng, setLng] = useState(79.8612);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchIncidents();
    const channel = supabase
      .channel('incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => fetchIncidents())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const fetchIncidents = async () => {
    const { data } = await supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(5);
    setIncidents(data || []);
  };

  const getLocation = async () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        alert('Location captured!');
      },
      () => alert('Unable to get location')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Please fill all fields');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('incidents').insert({
        title,
        description,
        severity,
        latitude: lat,
        longitude: lng,
        status: 'reported'
      });

      if (error) {
        alert('Failed to submit incident');
        console.error('Error:', error);
      } else {
        alert('Incident reported successfully!');
        setTitle('');
        setDescription('');
        setSeverity('medium');
        fetchIncidents();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', padding: 24 }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
        color: 'white',
        padding: '48px 32px',
        borderRadius: 8,
        marginBottom: 32,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔥</div>
        <h1 style={{ margin: '0 0 16px 0', fontSize: 36, fontWeight: 700 }}>Emergency Incident Report</h1>
        <p style={{ margin: 0, fontSize: 16, opacity: 0.9 }}>Report a fire emergency to our dispatch center</p>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        {/* Form */}
        <div style={{
          background: 'white',
          padding: 24,
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: 18, fontWeight: 700 }}>Report Incident</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Incident Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Building Fire"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the incident..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Location</label>
              <p style={{ margin: '0 0 8px 0', fontSize: 13, color: '#666' }}>
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </p>
              <button
                type="button"
                onClick={getLocation}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: '#fff',
                  border: '1px dashed #d9d9d9',
                  borderRadius: 4,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                📍 Get My Location
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                height: 40,
                background: '#d32f2f',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: 16,
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1
              }}
            >
              {submitting ? 'Submitting...' : 'Report Incident'}
            </button>
          </form>
        </div>

        {/* Recent Incidents */}
        <div style={{
          background: 'white',
          padding: 24,
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: 18, fontWeight: 700 }}>Recent Incidents</h2>
          {incidents.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', margin: 32 }}>No recent incidents</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  style={{
                    padding: 12,
                    background: '#fafafa',
                    borderRadius: 6,
                    borderLeft: '4px solid #d32f2f'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <strong style={{ fontSize: 14 }}>{inc.title}</strong>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 3,
                      background: inc.severity === 'critical' ? '#ff4d4f' : '#ff7a45',
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 600
                    }}>
                      {inc.severity?.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0', fontSize: 12, color: '#666' }}>
                    {inc.description}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: 11, color: '#999' }}>
                    Status: <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 3,
                      background: inc.status === 'reported' ? '#ff4d4f' : '#52c41a',
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 600
                    }}>
                      {inc.status?.toUpperCase()}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
