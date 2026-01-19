import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, Space, Table, Tag, Empty, Progress, Timeline, Badge, Tooltip } from 'antd';
import {
    LaptopOutlined,
    GlobalOutlined,
    KeyOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    WarningOutlined,
    CloudServerOutlined,
    WifiOutlined,
    RightOutlined,
    HistoryOutlined,
    AlertOutlined,
    ArrowRightOutlined,
    DesktopOutlined,
    DatabaseOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pie, Column } from '@ant-design/charts';
import { deviceService } from '../services/deviceService';
import { segmentService } from '../services/segmentService';
import { accountService } from '../services/accountService';
import { auditService } from '../services/auditService';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import 'dayjs/locale/en';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const DashboardPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t, i18n } = useTranslation();
    const [currentTime, setCurrentTime] = useState(dayjs());

    // Set dayjs locale based on current language
    useEffect(() => {
        dayjs.locale(i18n.language === 'vi' ? 'vi' : 'en');
    }, [i18n.language]);

    // Update time every minute
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(dayjs()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Device Stats
    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['deviceStats'],
        queryFn: deviceService.getDeviceStats,
    });

    const { data: devicesData, isLoading: devicesLoading } = useQuery({
        queryKey: ['recentDevices'],
        queryFn: () => deviceService.getDevices({ limit: 5, sortBy: 'created_at', sortOrder: 'DESC' }),
    });

    // Network Segment Stats
    const { data: segmentsData } = useQuery({
        queryKey: ['segments'],
        queryFn: segmentService.getSegments,
    });

    // Admin Account Stats
    const { data: accountStatsData } = useQuery({
        queryKey: ['accountStats'],
        queryFn: accountService.getAccountStats,
    });

    // Audit Logs for Activity Timeline
    const { data: auditData } = useQuery({
        queryKey: ['recentAudit'],
        queryFn: () => auditService.getLogs({ limit: 6 }),
    });

    const stats = statsData?.data || { total: 0, byType: [], byStatus: [] };
    const recentDevices = devicesData?.data || [];
    const segments = segmentsData?.data || [];
    const accountStats = accountStatsData?.data || { total: 0, bySystemType: [], byEnvironment: [] };
    const auditLogs = auditData?.data || [];

    // Calculate IP stats from segment.stats
    const ipStats = segments.reduce((acc, segment) => {
        const stats = segment.stats || {};
        acc.total += stats.total || 0;
        acc.in_use += stats.used || 0;
        acc.free += stats.free || 0;
        return acc;
    }, { total: 0, in_use: 0, free: 0 });

    // Calculate warnings (maintenance + inactive devices)
    const maintenanceCount = stats.byStatus?.find(s => s.status === 'maintenance')?.count || 0;
    const inactiveCount = stats.byStatus?.find(s => s.status === 'inactive')?.count || 0;
    const warningCount = maintenanceCount + inactiveCount;

    const getStatusTag = (status) => {
        const statusConfig = {
            active: { color: 'success', icon: <CheckCircleOutlined /> },
            inactive: { color: 'default', icon: <ClockCircleOutlined /> },
            maintenance: { color: 'warning', icon: <WarningOutlined /> },
            retired: { color: 'error', icon: null },
            spare: { color: 'processing', icon: null },
        };
        const config = statusConfig[status] || { color: 'default' };
        return (
            <Tag color={config.color} icon={config.icon}>
                {status?.toUpperCase()}
            </Tag>
        );
    };

    const getTypeIcon = (type) => {
        const icons = {
            pc: '💻', laptop: '💻', server: '🖥️', vm: '☁️',
            switch: '🔀', router: '📡', firewall: '🛡️', access_point: '📶',
            printer: '🖨️', camera: '📹', nas: '💾', ups: '🔋', other: '📦',
        };
        return icons[type] || '📦';
    };

    // Action icon for audit log
    const getActionIcon = (action) => {
        const icons = {
            create: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
            update: <ClockCircleOutlined style={{ color: '#1890ff' }} />,
            delete: <AlertOutlined style={{ color: '#ff4d4f' }} />,
            login: <KeyOutlined style={{ color: '#722ed1' }} />,
            logout: <KeyOutlined style={{ color: '#8c8c8c' }} />,
        };
        return icons[action] || <HistoryOutlined />;
    };

    // Clickable stat card - navigates with filter
    const ClickableStatCard = ({ title, value, icon, gradient, onClick, subtitle }) => (
        <Card
            className="stat-card-clickable"
            bordered={false}
            onClick={onClick}
            style={{
                background: gradient,
                cursor: 'pointer',
                borderRadius: 16,
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
                height: '100%',
                minHeight: 140,
            }}
            bodyStyle={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            hoverable
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ color: '#ffffff', fontSize: 14, fontWeight: 500, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>{title}</div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: '#ffffff', marginTop: 4, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{value}</div>
                    <div style={{ color: '#ffffff', fontSize: 12, opacity: 0.9, minHeight: 18 }}>{subtitle || ''}</div>
                </div>
                <div style={{ fontSize: 40, opacity: 0.4, color: '#fff' }}>{icon}</div>
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', color: '#ffffff' }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{t('common.view')} →</span>
                <ArrowRightOutlined style={{ marginLeft: 4, fontSize: 10 }} />
            </div>
        </Card>
    );

    // Pie chart config for IP usage
    const ipPieData = [
        { type: t('ipMap.usedIPs'), value: ipStats.in_use },
        { type: t('ipMap.availableIPs'), value: ipStats.free },
    ];

    const pieConfig = {
        data: ipPieData,
        angleField: 'value',
        colorField: 'type',
        radius: 0.8,
        innerRadius: 0.6,
        color: ['#1890ff', '#52c41a'],
        label: {
            type: 'inner',
            offset: '-50%',
            content: '{value}',
            style: { textAlign: 'center', fontSize: 14, fill: '#fff' },
        },
        legend: { position: 'bottom' },
        statistic: {
            title: { content: 'Tổng' },
            content: { content: ipStats.total.toString() },
        },
    };

    // Bar chart for device types
    const deviceTypeData = stats.byType?.map(item => ({
        type: item.type,
        count: item.count,
    })) || [];

    const barConfig = {
        data: deviceTypeData,
        xField: 'type',
        yField: 'count',
        color: '#1890ff',
        label: { position: 'top' },
        xAxis: { label: { autoRotate: false } },
        columnStyle: { radius: [4, 4, 0, 0] },
    };

    // Device table columns
    const columns = [
        {
            title: t('menu.devices'),
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <Space>
                    <span style={{ fontSize: 18 }}>{getTypeIcon(record.type)}</span>
                    <div>
                        <div style={{ fontWeight: 500 }}>{text}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.type}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'IP',
            dataIndex: 'ipAddresses',
            key: 'ip',
            render: (ips) => ips?.[0]?.ip_address || '-',
        },
        {
            title: t('common.status'),
            dataIndex: 'status',
            key: 'status',
            render: (status) => getStatusTag(status),
        },
    ];

    // Navigation handlers with filters
    const handleNavigateDevices = (filter = {}) => {
        const params = new URLSearchParams(filter).toString();
        navigate(`/devices${params ? '?' + params : ''}`);
    };

    const handleNavigateIpMap = (filter = {}) => {
        const params = new URLSearchParams(filter).toString();
        navigate(`/ip-map${params ? '?' + params : ''}`);
    };

    const handleNavigateAccounts = (filter = {}) => {
        const params = new URLSearchParams(filter).toString();
        navigate(`/accounts${params ? '?' + params : ''}`);
    };

    const handleNavigateAudit = () => {
        navigate('/audit');
    };

    return (
        <div className="dashboard-page">
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 24 }}>
                <div>
                    <Title level={3} style={{ marginBottom: 0 }}>
                        {t('dashboard.welcome')}, {user?.display_name || user?.username} 👋
                    </Title>
                    <Text type="secondary">
                        {currentTime.format('dddd, DD/MM/YYYY - HH:mm')} | {t('dashboard.systemOverview')}
                    </Text>
                </div>
            </div>

            {/* Row 1: Main Stats - 6 Cards */}
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={4}>
                    <ClickableStatCard
                        title={t('dashboard.totalDevices')}
                        value={stats.total}
                        icon={<LaptopOutlined />}
                        gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                        onClick={() => handleNavigateDevices()}
                    />
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <ClickableStatCard
                        title={t('dashboard.activeDevices')}
                        value={stats.byStatus?.find(s => s.status === 'active')?.count || 0}
                        icon={<CheckCircleOutlined />}
                        gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                        onClick={() => handleNavigateDevices({ status: 'active' })}
                    />
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <ClickableStatCard
                        title={t('dashboard.usedIPs')}
                        value={ipStats.in_use}
                        subtitle={`/ ${ipStats.total} ${t('common.total').toLowerCase()}`}
                        icon={<GlobalOutlined />}
                        gradient="linear-gradient(135deg, #00b4db 0%, #0083b0 100%)"
                        onClick={() => handleNavigateIpMap({ status: 'in_use' })}
                    />
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <ClickableStatCard
                        title={t('dashboard.totalAccounts')}
                        value={accountStats.total}
                        icon={<KeyOutlined />}
                        gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                        onClick={() => handleNavigateAccounts()}
                    />
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <ClickableStatCard
                        title={t('dashboard.networkSegments')}
                        value={segments.length}
                        icon={<CloudServerOutlined />}
                        gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
                        onClick={() => handleNavigateIpMap()}
                    />
                </Col>
                <Col xs={24} sm={12} lg={4}>
                    <ClickableStatCard
                        title={t('common.warning')}
                        value={warningCount}
                        subtitle={t('devices.maintenance') + ' / ' + t('devices.inactive')}
                        icon={<WarningOutlined />}
                        gradient="linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)"
                        onClick={() => handleNavigateDevices({ status: 'maintenance' })}
                    />
                </Col>
            </Row>

            {/* Row 2: Charts */}
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24} lg={12}>
                    <Card
                        title={<Space><DatabaseOutlined /> {t('dashboard.ipUsage')}</Space>}
                        bordered={false}
                        className="dashboard-card"
                        extra={<a onClick={() => handleNavigateIpMap()}>{t('common.all')} <RightOutlined /></a>}
                    >
                        {ipStats.total > 0 ? (
                            <div style={{ height: 280 }}>
                                <Pie {...pieConfig} />
                            </div>
                        ) : (
                            <Empty description={t('common.noData')} />
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card
                        title={<Space><DesktopOutlined /> {t('dashboard.deviceTypes')}</Space>}
                        bordered={false}
                        className="dashboard-card"
                        extra={<a onClick={() => handleNavigateDevices()}>{t('common.all')} <RightOutlined /></a>}
                    >
                        {deviceTypeData.length > 0 ? (
                            <div style={{ height: 280 }}>
                                <Column {...barConfig} />
                            </div>
                        ) : (
                            <Empty description={t('common.noData')} />
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Row 3: Network Segments & Account Types */}
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24} lg={12}>
                    <Card
                        title={<Space><GlobalOutlined /> {t('dashboard.networkSegments')}</Space>}
                        bordered={false}
                        className="dashboard-card"
                        extra={<a onClick={() => handleNavigateIpMap()}>{t('common.actions')} <RightOutlined /></a>}
                    >
                        {segments.length > 0 ? (
                            <div style={{ maxHeight: 300, overflow: 'auto' }}>
                                {segments.slice(0, 6).map(segment => {
                                    const used = segment.stats?.used || 0;
                                    const total = segment.stats?.total || 0;
                                    const percent = total > 0 ? Math.round((used / total) * 100) : 0;
                                    return (
                                        <div
                                            key={segment.id}
                                            style={{
                                                padding: '12px 0',
                                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => handleNavigateIpMap({ segment: segment.id })}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <Space>
                                                    <Badge color={segment.color || 'blue'} />
                                                    <Text strong>{segment.name}</Text>
                                                </Space>
                                                <Text type="secondary">{used}/{total} IP</Text>
                                            </div>
                                            <Progress
                                                percent={percent}
                                                size="small"
                                                status={percent > 90 ? 'exception' : 'active'}
                                                showInfo={false}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <Empty description={t('common.noData')} />
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card
                        title={<Space><KeyOutlined /> {t('dashboard.accountsByType')}</Space>}
                        bordered={false}
                        className="dashboard-card"
                        extra={<a onClick={() => handleNavigateAccounts()}>{t('common.actions')} <RightOutlined /></a>}
                    >
                        {accountStats.bySystemType?.length > 0 ? (
                            <div className="type-stats">
                                {accountStats.bySystemType.slice(0, 6).map((item) => (
                                    <div
                                        key={item.type}
                                        className="type-stat-item"
                                        onClick={() => handleNavigateAccounts({ system_type: item.type })}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <Space>
                                            <span style={{ fontSize: 18 }}>
                                                {item.type === 'firewall' ? '🛡️' :
                                                    item.type === 'vmware' ? '☁️' :
                                                        item.type === 'o365' ? '📧' :
                                                            item.type === 'switch' ? '🔀' :
                                                                item.type === 'router' ? '📡' :
                                                                    item.type === 'nas' ? '💾' : '🔑'}
                                            </span>
                                            <Text>{item.label}</Text>
                                        </Space>
                                        <Badge count={item.count} style={{ backgroundColor: '#1890ff' }} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Empty description={t('common.noData')} />
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Row 4: Activity Timeline & Recent Devices */}
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24} lg={12}>
                    <Card
                        title={<Space><HistoryOutlined /> {t('dashboard.recentActivity')}</Space>}
                        bordered={false}
                        className="dashboard-card"
                        extra={<a onClick={() => handleNavigateAudit()}>{t('common.all')} <RightOutlined /></a>}
                    >
                        {auditLogs.length > 0 ? (
                            <Timeline
                                items={auditLogs.slice(0, 5).map(log => ({
                                    dot: getActionIcon(log.action),
                                    children: (
                                        <div>
                                            <Text strong>{log.user?.display_name || log.user?.username}</Text>
                                            <Text type="secondary"> {log.action} </Text>
                                            <Text>{log.entity_type}</Text>
                                            <div>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {dayjs(log.created_at).fromNow()}
                                                </Text>
                                            </div>
                                        </div>
                                    ),
                                }))}
                            />
                        ) : (
                            <Empty description={t('common.noData')} />
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card
                        title={<Space><LaptopOutlined /> {t('menu.devices')}</Space>}
                        bordered={false}
                        className="dashboard-card"
                        extra={<a onClick={() => handleNavigateDevices()}>{t('common.all')} <RightOutlined /></a>}
                    >
                        <Table
                            columns={columns}
                            dataSource={recentDevices}
                            rowKey="id"
                            pagination={false}
                            loading={devicesLoading}
                            size="small"
                            onRow={(record) => ({
                                onClick: () => navigate(`/devices?search=${record.name}`),
                                style: { cursor: 'pointer' },
                            })}
                            locale={{ emptyText: <Empty description={t('common.noData')} /> }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default DashboardPage;
