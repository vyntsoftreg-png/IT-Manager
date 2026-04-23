import React, { useState, useEffect } from 'react';
import { 
    Layout, 
    Typography, 
    Card, 
    Row, 
    Col, 
    Statistic, 
    Table, 
    Tag, 
    DatePicker, 
    Button, 
    Space,
    Modal,
    Form,
    InputNumber,
    message,
    Spin
} from 'antd';
import { 
    DashboardOutlined, 
    CheckCircleOutlined, 
    WarningOutlined, 
    ClockCircleOutlined,
    SettingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import slaService from '../services/slaService';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const SlaPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [metrics, setMetrics] = useState(null);
    const [breachedTickets, setBreachedTickets] = useState([]);
    const [dates, setDates] = useState([dayjs().subtract(30, 'day'), dayjs()]);
    
    // Config state
    const [configVisible, setConfigVisible] = useState(false);
    const [targets, setTargets] = useState([]);
    const [configLoading, setConfigLoading] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, [dates]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const res = await slaService.getDashboardMetrics({
                startDate: dates[0].format('YYYY-MM-DD'),
                endDate: dates[1].format('YYYY-MM-DD')
            });
            if (res.success) {
                setMetrics(res.data.metrics);
                setBreachedTickets(res.data.breachedTickets);
            }
        } catch (error) {
            message.error('Error loading SLA Dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenConfig = async () => {
        setConfigVisible(true);
        setConfigLoading(true);
        try {
            const res = await slaService.getTargets();
            if (res.success) {
                setTargets(res.data);
            }
        } catch (error) {
            message.error('Error loading SLA targets');
        } finally {
            setConfigLoading(false);
        }
    };

    const handleSaveConfig = async (id, values) => {
        try {
            const res = await slaService.updateTarget(id, values);
            if (res.success) {
                message.success('SLA Target updated successfully');
                // Refresh targets list
                const targetsRes = await slaService.getTargets();
                setTargets(targetsRes.data);
            }
        } catch (error) {
            message.error('Error saving SLA configuration');
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'magenta';
            case 'high': return 'red';
            case 'medium': return 'orange';
            case 'low': return 'blue';
            default: return 'default';
        }
    };

    const columns = [
        {
            title: 'Ticket ID',
            dataIndex: 'task_number',
            key: 'task_number',
        },
        {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
        },
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            render: (text) => <Tag color={getPriorityColor(text)}>{text?.toUpperCase()}</Tag>
        },
        {
            title: 'Requester',
            dataIndex: 'requester_name',
            key: 'requester_name',
        },
        {
            title: 'Assignee',
            dataIndex: 'assignee_name',
            key: 'assignee_name',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (text) => {
                const color = ['resolved', 'closed'].includes(text) ? 'success' : 'processing';
                return <Tag color={color}>{text?.toUpperCase()}</Tag>;
            }
        },
        {
            title: 'Created At',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (text) => dayjs(text).format('DD/MM/YYYY HH:mm')
        }
    ];

    const targetColumns = [
        {
            title: 'Priority Level',
            dataIndex: 'priority',
            key: 'priority',
            render: (text) => <Tag color={getPriorityColor(text)}>{text?.toUpperCase()}</Tag>
        },
        {
            title: 'Response Time (hours)',
            dataIndex: 'response_time_hours',
            key: 'response_time_hours',
            render: (val, record) => (
                <InputNumber 
                    min={0.1} 
                    step={0.5} 
                    defaultValue={val} 
                    onBlur={(e) => handleSaveConfig(record.id, { response_time_hours: parseFloat(e.target.value) })}
                    onPressEnter={(e) => handleSaveConfig(record.id, { response_time_hours: parseFloat(e.target.value) })}
                />
            )
        },
        {
            title: 'Resolution Time (hours)',
            dataIndex: 'resolution_time_hours',
            key: 'resolution_time_hours',
            render: (val, record) => (
                <InputNumber 
                    min={0.1} 
                    step={0.5} 
                    defaultValue={val} 
                    onBlur={(e) => handleSaveConfig(record.id, { resolution_time_hours: parseFloat(e.target.value) })}
                    onPressEnter={(e) => handleSaveConfig(record.id, { resolution_time_hours: parseFloat(e.target.value) })}
                />
            )
        }
    ];

    return (
        <div className="sla-page" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>
                    <DashboardOutlined style={{ marginRight: 8 }} />
                    SLA Dashboard
                </Title>
                <Space>
                    <RangePicker 
                        value={dates} 
                        onChange={(dates) => dates && setDates(dates)} 
                        allowClear={false}
                    />
                    {user?.role === 'admin' && (
                        <Button type="primary" icon={<SettingOutlined />} onClick={handleOpenConfig}>
                            SLA Config
                        </Button>
                    )}
                </Space>
            </div>

            <Spin spinning={loading}>
                {metrics && (
                    <>
                        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                            <Col xs={24} sm={12} md={6}>
                                <Card className="stat-card stat-card-primary">
                                    <Statistic 
                                        title="Total Tickets" 
                                        value={metrics.totalTickets} 
                                    />
                                </Card>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Card className="stat-card stat-card-success">
                                    <Statistic 
                                        title="SLA Met" 
                                        value={metrics.metSla} 
                                        valueStyle={{ color: '#3f8600' }}
                                        prefix={<CheckCircleOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Card className="stat-card stat-card-warning">
                                    <Statistic 
                                        title="SLA Breached" 
                                        value={metrics.breachedSla} 
                                        valueStyle={{ color: '#cf1322' }}
                                        prefix={<WarningOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Card className="stat-card stat-card-info">
                                    <Statistic 
                                        title="Avg Resolution Time (Hours)" 
                                        value={metrics.avgResolutionTimeHours} 
                                        prefix={<ClockCircleOutlined />}
                                    />
                                </Card>
                            </Col>
                        </Row>

                        <Card title="Breached SLA Tickets (Action Required)" style={{ marginTop: 24 }}>
                            <Table 
                                columns={columns} 
                                dataSource={breachedTickets} 
                                rowKey="id" 
                                pagination={false}
                                size="small"
                            />
                        </Card>
                    </>
                )}
            </Spin>

            <Modal
                title="SLA Target Configuration"
                open={configVisible}
                onCancel={() => setConfigVisible(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => {
                        setConfigVisible(false);
                        fetchDashboardData(); // Refresh after config updates
                    }}>
                        Close
                    </Button>
                ]}
                width={800}
            >
                <Spin spinning={configLoading}>
                    <Table 
                        columns={targetColumns} 
                        dataSource={targets} 
                        rowKey="id" 
                        pagination={false} 
                        size="small"
                    />
                    <div style={{ marginTop: 16 }}>
                        <Typography.Text type="secondary">
                            * Edit values and press Enter or click outside to auto-save.
                        </Typography.Text>
                    </div>
                </Spin>
            </Modal>
        </div>
    );
};

export default SlaPage;
