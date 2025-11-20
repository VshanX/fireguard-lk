import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Card, Tag, Row, Col, Statistic, Spin, Empty, Table, Select, Drawer } from 'antd';
import { FireOutlined, EnvironmentOutlined } from '@ant-design/icons';
import 'antd/dist/reset.css';
import './App.css';

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchAllData();
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => fetchAllData())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: inc } = await supabase.from('incidents').select('*').order('created_at', { ascending: false });
      const { data: res } = await supabase.from('resources').select('*');
      setIncidents(inc || []);
      setResources(res || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const assignUnit = async (incidentId, resourceId) => {
    try {
      await supabase.from('dispatches').insert({
        incident_id: incidentId,
        resource_id: resourceId
      });
      await supabase.from('incidents').update({ status: 'dispatched' }).eq('id', incidentId);
      alert('Unit dispatched successfully!');
      fetchAllData();
    } catch (err) {
      alert('Failed to dispatch unit: ' + err.message);
    }
  };

  const getStatusColor = (status) => {
    const colorMap = {
      reported: 'red',
      dispatched: 'orange',
      en_route: 'cyan',
      arrived: 'green',
      resolved: 'blue'
    };
    return colorMap[status] || 'default';
  };

  const getSeverityColor = (severity) => {
    const colorMap = {
      critical: 'red',
      high: 'orange',
      medium: 'gold',
      low: 'blue'
    };
    return colorMap[severity] || 'default';
  };

  const stats = {
    total: incidents.length,
    active: incidents.filter(i => i.status === 'reported').length,
    dispatched: incidents.filter(i => i.status === 'dispatched').length,
    enRoute: incidents.filter(i => i.status === 'en_route').length,
    units: resources.filter(r => r.status === 'available').length
  };

  const columns = [
    {
      title: 'Incident',
      dataIndex: 'title',
      key: 'title',
      width: 150,
      render: (text, record) => (
        <div
          style={{ cursor: 'pointer', fontWeight: 500, color: '#1890ff' }}
          onClick={() => {
            setSelectedIncident(record);
            setDrawerOpen(true);
          }}
        >
          {text}
        </div>
      )
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity) => (
        <Tag color={getSeverityColor(severity)}>
          {severity?.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status?.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Location',
      dataIndex: 'latitude',
      key: 'location',
      width: 120,
      render: (_, record) => (
        <span style={{ fontSize: 12 }}>
          {record.latitude?.toFixed(4)}, {record.longitude?.toFixed(4)}
        </span>
      )
    },
    {
      title: 'Assign Unit',
      key: 'action',
      width: 150,
      render: (_, record) =>
        record.status === 'reported' ? (
          <Select
            placeholder="Select unit"
            size="small"
            style={{ width: '100%' }}
            onChange={(v) => assignUnit(record.id, v)}
            options={resources
              .filter((r) => r.status === 'available')
              .map((r) => ({ label: r.name, value: r.id }))}
          />
        ) : (
          <span style={{ color: '#999', fontSize: 12 }}>
            {record.status === 'dispatched' ? 'Dispatched' : 'In Progress'}
          </span>
        )
    }
  ];

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
        color: 'white',
        padding: '24px 32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <FireOutlined style={{ fontSize: 32 }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>FireGuard Dispatcher</h1>
            <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: 14 }}>Command Center</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '24px 32px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={4}>
            <Card style={{ textAlign: 'center' }}>
              <Statistic
                title="Total Incidents"
                value={stats.total}
                valueStyle={{ color: '#d32f2f', fontSize: 24, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card style={{ textAlign: 'center' }}>
              <Statistic
                title="Pending"
                value={stats.active}
                valueStyle={{ color: '#ff7875', fontSize: 24, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card style={{ textAlign: 'center' }}>
              <Statistic
                title="Dispatched"
                value={stats.dispatched}
                valueStyle={{ color: '#faad14', fontSize: 24, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card style={{ textAlign: 'center' }}>
              <Statistic
                title="En Route"
                value={stats.enRoute}
                valueStyle={{ color: '#13c2c2', fontSize: 24, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card style={{ textAlign: 'center' }}>
              <Statistic
                title="Available Units"
                value={stats.units}
                valueStyle={{ color: '#52c41a', fontSize: 24, fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Main Content */}
      <div style={{ padding: '0 32px 32px' }}>
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FireOutlined style={{ color: '#d32f2f' }} />
              <span>Incident Management</span>
            </div>
          }
        >
          <Spin spinning={loading}>
            {incidents.length === 0 ? (
              <Empty description="No incidents reported" style={{ marginTop: 48 }} />
            ) : (
              <Table
                dataSource={incidents}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 10, size: 'small' }}
                size="small"
                scroll={{ x: 800 }}
                style={{ background: 'white' }}
              />
            )}
          </Spin>
        </Card>
      </div>

      {/* Incident Details Drawer */}
      <Drawer
        title={selectedIncident?.title}
        placement="right"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width={400}
      >
        {selectedIncident && (
          <div>
            {selectedIncident.photo_url && (
              <img
                src={selectedIncident.photo_url}
                alt="Incident"
                style={{ width: '100%', borderRadius: 8, marginBottom: 16, maxHeight: 300, objectFit: 'cover' }}
              />
            )}
            <div style={{ marginBottom: 16 }}>
              <p>
                <strong>Severity:</strong>{' '}
                <Tag color={getSeverityColor(selectedIncident.severity)}>
                  {selectedIncident.severity?.toUpperCase()}
                </Tag>
              </p>
              <p>
                <strong>Status:</strong>{' '}
                <Tag color={getStatusColor(selectedIncident.status)}>
                  {selectedIncident.status?.toUpperCase()}
                </Tag>
              </p>
              <p>
                <strong>Description:</strong>
                <br />
                {selectedIncident.description || 'No description provided'}
              </p>
              <p>
                <strong>Location:</strong>
                <br />
                {selectedIncident.latitude?.toFixed(6)}, {selectedIncident.longitude?.toFixed(6)}
              </p>
              <p>
                <strong>Reported:</strong>
                <br />
                {new Date(selectedIncident.created_at).toLocaleString()}
              </p>
            </div>

            {selectedIncident.status === 'reported' && (
              <Select
                placeholder="Assign unit to respond"
                style={{ width: '100%' }}
                onChange={(v) => {
                  assignUnit(selectedIncident.id, v);
                  setDrawerOpen(false);
                }}
                options={resources
                  .filter((r) => r.status === 'available')
                  .map((r) => ({ label: r.name, value: r.id }))}
              />
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
