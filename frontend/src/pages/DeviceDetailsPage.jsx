import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Layout, 
    Card, 
    Descriptions, 
    Typography, 
    Tag, 
    Button, 
    Spin, 
    message, 
    Row, 
    Col,
    Divider,
    Space
} from 'antd';
import { 
    ArrowLeftOutlined, 
    DesktopOutlined, 
    ClusterOutlined,
    QrcodeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { Title, Text } = Typography;

const DeviceDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [device, setDevice] = useState(null);

    useEffect(() => {
        if (id) {
            fetchDeviceDetails();
        }
    }, [id]);

    const fetchDeviceDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/devices/${id}`);
            if (response.data.success) {
                setDevice(response.data.data);
            }
        } catch (error) {
            message.error('Error loading device details');
        } finally {
            setLoading(false);
        }
    };

    const getStatusTag = (status) => {
        switch (status) {
            case 'active': return <Tag color="success">Active</Tag>;
            case 'inactive': return <Tag color="default">Inactive</Tag>;
            case 'maintenance': return <Tag color="warning">Maintenance</Tag>;
            case 'retired': return <Tag color="error">Retired</Tag>;
            case 'spare': return <Tag color="processing">Spare</Tag>;
            default: return <Tag color="default">{status}</Tag>;
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" tip="Loading device details..." />
            </div>
        );
    }

    if (!device) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <Title level={4}>Device not found</Title>
                <Button type="primary" onClick={() => navigate('/devices')}>Back to list</Button>
            </div>
        );
    }

    return (
        <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                    <Button 
                        icon={<ArrowLeftOutlined />} 
                        onClick={() => navigate('/devices')}
                    >
                        Back
                    </Button>
                    <Title level={3} style={{ margin: 0, marginLeft: 16 }}>
                        <DesktopOutlined style={{ marginRight: 8 }} />
                        Device Details
                    </Title>
                </Space>
                {getStatusTag(device.status)}
            </div>

            <Row gutter={[24, 24]}>
                <Col xs={24} md={16}>
                    <Card title="General Information" style={{ marginBottom: 24 }} bordered={false}>
                        <Descriptions column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }} bordered>
                            <Descriptions.Item label="Device Name">{device.name}</Descriptions.Item>
                            <Descriptions.Item label="Type"><Tag color="blue">{device.type}</Tag></Descriptions.Item>
                            <Descriptions.Item label="Manufacturer">{device.manufacturer || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Model">{device.model || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Serial Number">{device.serial_number || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Hostname">{device.hostname || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Purchase Date">
                                {device.purchase_date ? dayjs(device.purchase_date).format('DD/MM/YYYY') : 'N/A'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Warranty Expiry">
                                {device.warranty_expiry ? dayjs(device.warranty_expiry).format('DD/MM/YYYY') : 'N/A'}
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>

                    <Card title="Location & Assignment" bordered={false} style={{ marginBottom: 24 }}>
                        <Descriptions column={2} bordered size="small">
                            <Descriptions.Item label="Location">{device.location || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Department">{device.department || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Assigned User">{device.assigned_user || 'N/A'}</Descriptions.Item>
                        </Descriptions>
                    </Card>
                    
                    {device.notes && (
                        <Card title="Notes" bordered={false}>
                            <Typography.Paragraph>
                                {device.notes}
                            </Typography.Paragraph>
                        </Card>
                    )}
                </Col>

                <Col xs={24} md={8}>
                    <Card title="Network Information" bordered={false} style={{ marginBottom: 24 }}>
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            <ClusterOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                        </div>
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="MAC Address">
                                <Text copyable>{device.mac_address || 'N/A'}</Text>
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                    
                    {device.specifications && (
                        <Card title="Technical Specifications" bordered={false}>
                            <pre style={{ 
                                backgroundColor: '#f5f5f5', 
                                padding: '10px', 
                                borderRadius: '4px',
                                fontSize: '12px',
                                overflowX: 'auto'
                            }}>
                                {device.specifications}
                            </pre>
                        </Card>
                    )}
                </Col>
            </Row>
        </div>
    );
};

export default DeviceDetailsPage;
