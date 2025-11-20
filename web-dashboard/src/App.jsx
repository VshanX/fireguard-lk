import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Table, Tag, Select, message } from 'antd';
import 'leaflet/dist/leaflet.css';
import 'antd/dist/reset.css';
import L from 'leaflet';

// Custom Icons
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function App() {
  const [incidents, setIncidents] = useState([]);
  const [resources, setResources] = useState([]);
  const [firefighters, setFirefighters] = useState([]);  // ← LIVE LOCATIONS

  useEffect(() => {
    fetchAllData();

    // Realtime for everything
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatches' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'firefighter_locations' }, () => fetchFirefighters())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchAllData = async () => {
    const { data: inc } = await supabase.from('incidents').select('*');
    const { data: res } = await supabase.from('resources').select('*');
    setIncidents(inc || []);
    setResources(res || []);
  };

  const fetchFirefighters = async () => {
    const { data } = await supabase.from('firefighter_locations').select('*');
    setFirefighters(data || []);
  };

  const assignUnit = async (incidentId, resourceId) => {
    const { error } = await supabase.from('dispatches').insert({
      incident_id: incidentId,
      resource_id: resourceId
    });
    if (!error) {
      await supabase.from('incidents').update({ status: 'dispatched' }).eq('id', incidentId);
      message.success('Unit dispatched!');
    }
  };

  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'Severity', dataIndex: 'severity', render: s => <Tag color={s === 'critical' ? 'red' : s === 'high' ? 'orange' : 'yellow'}>{s.toUpperCase()}</Tag> },
    { title: 'Status', dataIndex: 'status', render: s => <Tag color={s === 'dispatched' || s === 'en_route' ? 'green' : 'volcano'}>{s.toUpperCase()}</Tag> },
    {
      title: 'Assign Unit',
      render: (_, record) => record.status === 'reported' && (
        <Select placeholder="Select unit" style={{ width: 220 }} onChange={v => assignUnit(record.id, v)}>
          {resources.filter(r => r.status === 'available').map(r => (
            <Select.Option key={r.id} value={r.id}>{r.name}</Select.Option>
          ))}
        </Select>
      )
    }
  ];

  return (
    <div style={{ padding: 20, background: '#141414', color: 'white', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', color: '#ff4444', fontSize: 38 }}>
        FireGuard Dispatcher Command Center
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 25 }}>
        {/* LIVE MAP */}
        <div>
          <h2 style={{ color: '#ff4444' }}>Live Map – Incidents & Firefighters</h2>
          <div style={{ height: 680, border: '5px solid #333', borderRadius: 15, overflow: 'hidden' }}>
            <MapContainer center={[6.9271, 79.8612]} zoom={11} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {/* RED: Incidents */}
              {incidents.map(inc => (
                <Marker key={`inc-${inc.id}`} position={[inc.latitude, inc.longitude]} icon={redIcon}>
                  <Popup>
                    <div style={{ minWidth: 280 }}>
                      <b style={{ fontSize: 18 }}>{inc.title}</b><br />
                      {inc.photo_url && <img src={inc.photo_url} alt="Fire" style={{ width: '100%', borderRadius: 8, margin: '10px 0' }} />}<br />
                      <b>Severity:</b> {inc.severity.toUpperCase()}<br />
                      <b>Status:</b> {inc.status.toUpperCase()}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* BLUE: Live Firefighters */}
              {firefighters.map(ff => (
                <Marker key={`ff-${ff.user_id}`} position={[ff.latitude, ff.longitude]} icon={blueIcon}>
                  <Popup>
                    <b>Firefighter Live Location</b><br />
                    Last update: {new Date(ff.updated_at).toLocaleTimeString()}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 14, color: '#aaa' }}>
            Red = Incident | Blue = Firefighter (moving live)
          </div>
        </div>

        {/* TABLE */}
        <div>
          <h2 style={{ color: '#ff4444' }}>Incident Management</h2>
          <Table dataSource={incidents} columns={columns} rowKey="id" pagination={{ pageSize: 8 }} style={{ background: '#222' }} />
        </div>
      </div>
    </div>
  );
}

export default App;