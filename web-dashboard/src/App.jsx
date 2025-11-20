import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Table, Tag, Button, Select, message } from 'antd';
import 'leaflet/dist/leaflet.css';
import 'antd/dist/reset.css';
import L from 'leaflet';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function App() {
  const [incidents, setIncidents] = useState([]);
  const [resources, setResources] = useState([]);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    fetchData();
    const channel = supabase.channel('realtime-incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => fetchData())
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
      message.success('Unit assigned successfully!');
    }
  };

  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'Severity', dataIndex: 'severity', render: (s) => <Tag color={s==='critical'?'red':s==='high'?'orange':'yellow'}>{s.toUpperCase()}</Tag> },
    { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={s==='dispatched'?'green':'volcano'}>{s.toUpperCase()}</Tag> },
    {
      title: 'Assign Unit',
      render: (_, record) => record.status === 'reported' && (
        <Select placeholder="Select unit" style={{ width: 200 }} onChange={(v) => assignUnit(record.id, v)}>
          {resources.filter(r => r.status === 'available').map(r => (
            <Select.Option key={r.id} value={r.id}>{r.name} ({r.type})</Select.Option>
          ))}
        </Select>
      )
    }
  ];

  return (
    <div style={{ padding: 20, background: '#141414', color: 'white', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', color: '#ff4444' }}>🚒 FireGuard Dispatcher Command Center</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        {/* Live Map */}
        <div>
          <h2>Live Incident Map</h2>
          <div style={{ height: 600, border: '3px solid #333', borderRadius: 10 }}>
            <MapContainer center={[6.9271, 79.8612]} zoom={10} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {incidents.map(inc => (
                <Marker key={inc.id} position={[inc.latitude, inc.longitude]}>
                  <Popup>
                    <b>{inc.title}</b><br />
                    Status: {inc.status}<br />
                    Severity: {inc.severity}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Incident Table */}
        <div>
          <h2>Incident Management</h2>
          <Table 
            dataSource={incidents} 
            columns={columns} 
            rowKey="id"
            style={{ background: '#222' }}
            pagination={{ pageSize: 10 }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;