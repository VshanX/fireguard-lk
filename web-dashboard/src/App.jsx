import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Table, Tag, Select, message } from 'antd';
import 'leaflet/dist/leaflet.css';
import 'antd/dist/reset.css';
import L from 'leaflet';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function App() {
  const [incidents, setIncidents] = useState([]);
  const [resources, setResources] = useState([]);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('realtime-incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatches' }, () => fetchData())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchData = async () => {
    const { data: inc } = await supabase.from('incidents').select('*');
    const { data: res } = await supabase.from('resources').select('*');
    setIncidents(inc || []);
    setResources(res || []);
  };

  const assignUnit = async (incidentId, resourceId) => {
    const { error } = await supabase.from('dispatches').insert({
      incident_id: incidentId,
      resource_id: resourceId
    });
    if (!error) {
      await supabase.from('incidents').update({ status: 'dispatched' }).eq('id', incidentId);
      message.success('Unit assigned & dispatched!');
    }
  };

  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { 
      title: 'Severity', 
      dataIndex: 'severity', 
      render: (s) => <Tag color={s === 'critical' ? 'red' : s === 'high' ? 'orange' : 'yellow'}>{s.toUpperCase()}</Tag> 
    },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      render: (s) => <Tag color={s === 'dispatched' || s === 'en_route' ? 'green' : s === 'resolved' ? 'blue' : 'volcano'}>{s.toUpperCase()}</Tag> 
    },
    {
      title: 'Assign Unit',
      render: (_, record) => record.status === 'reported' && (
        <Select 
          placeholder="Select fire truck" 
          style={{ width: 220 }} 
          onChange={(v) => assignUnit(record.id, v)}
        >
          {resources
            .filter(r => r.status === 'available' || r.status === 'available') // just in case
            .map(r => (
              <Select.Option key={r.id} value={r.id}>
                {r.name} ({r.type})
              </Select.Option>
            ))}
        </Select>
      )
    }
  ];

  return (
    <div style={{ padding: 20, background: '#141414', color: 'white', minHeight: '100vh', fontFamily: 'Arial' }}>
      <h1 style={{ textAlign: 'center', color: '#ff4444', fontSize: 36, marginBottom: 10 }}>
        FireGuard Dispatcher Command Center
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 25, marginTop: 20 }}>
        {/* Live Map */}
        <div>
          <h2 style={{ color: '#ff4444' }}>Live Incident Map</h2>
          <div style={{ height: 650, border: '4px solid #333', borderRadius: 12, overflow: 'hidden' }}>
            <MapContainer center={[6.9271, 79.8612]} zoom={11} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {incidents.map(inc => (
                <Marker key={inc.id} position={[inc.latitude, inc.longitude]}>
                  <Popup>
                    <div style={{ minWidth: 250 }}>
                      <b style={{ fontSize: 18 }}>{inc.title}</b><br />
                      {inc.photo_url && (
                        <img 
                          src={inc.photo_url} 
                          alt="Incident" 
                          style={{ width: '100%', borderRadius: 8, margin: '10px 0' }} 
                        />
                      )}
                      <b>Severity:</b> {inc.severity.toUpperCase()}<br />
                      <b>Status:</b> {inc.status.toUpperCase()}<br />
                      <b>Reported:</b> {new Date(inc.created_at).toLocaleString()}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Incident Table */}
        <div>
          <h2 style={{ color: '#ff4444' }}>Incident Management</h2>
          <Table 
            dataSource={incidents} 
            columns={columns} 
            rowKey="id"
            pagination={{ pageSize: 8 }}
            style={{ background: '#222', borderRadius: 12 }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;