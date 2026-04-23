import { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Space, Table, Tag, Empty, Progress, Timeline, Badge, Button, Tooltip } from 'antd';
import {
    LaptopOutlined,
    GlobalOutlined,
    KeyOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    WarningOutlined,
    CloudServerOutlined,
    RightOutlined,
    HistoryOutlined,
    AlertOutlined,
    ArrowRightOutlined,
    DesktopOutlined,
    DatabaseOutlined,
    OrderedListOutlined,
    ExclamationCircleOutlined,
    PlusOutlined,
    FileTextOutlined,
    ToolOutlined,
    BookOutlined,
    ThunderboltOutlined,
    SafetyCertificateOutlined,
    AppstoreOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pie, Column } from '@ant-design/charts';
import { deviceService } from '../services/deviceService';
import { segmentService } from '../services/segmentService';
import { accountService } from '../services/accountService';
import { auditService } from '../services/auditService';
import taskService from '../services/taskService';
import documentService from '../services/documentService';
import personalTaskService from '../services/personalTaskService';
import slaService from '../services/slaService';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import 'dayjs/locale/en';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

// Section Header Component
const SectionHeader = ({ icon, title, extra, color = '#00D4AA' }) => (
    <div className="db-section-header">
        <div className="db-section-title-group">
            <span className="db-section-icon" style={{ color }}>{icon}</span>
            <span className="db-section-title">{title}</span>
        </div>
        {extra && <div className="db-section-extra">{extra}</div>}
    </div>
);

// Compact Stat Card
const StatCard = ({ title, value, icon, color, onClick, subtitle, trend }) => (
    <div className="db-stat-card" onClick={onClick} style={{ '--accent': color }}>
        <div className="db-stat-card-top">
            <div className="db-stat-card-icon" style={{ background: `${color}15`, color }}>{icon}</div>
            <div className="db-stat-card-info">
                <div className="db-stat-card-label">{title}</div>
                <div className="db-stat-card-value">{value}</div>
            </div>
        </div>
        {subtitle && <div className="db-stat-card-sub" style={{ color }}>{subtitle}</div>}
    </div>
);

const DashboardPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t, i18n } = useTranslation();
    const [currentTime, setCurrentTime] = useState(dayjs());

    useEffect(() => {
        dayjs.locale(i18n.language === 'vi' ? 'vi' : 'en');
    }, [i18n.language]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(dayjs()), 60000);
        return () => clearInterval(timer);
    }, []);

    // ── Data Queries ──
    const { data: statsData } = useQuery({
        queryKey: ['deviceStats'],
        queryFn: deviceService.getDeviceStats,
    });

    const { data: devicesData, isLoading: devicesLoading } = useQuery({
        queryKey: ['recentDevices'],
        queryFn: () => deviceService.getDevices({ limit: 5, sortBy: 'created_at', sortOrder: 'DESC' }),
    });

    const { data: segmentsData } = useQuery({
        queryKey: ['segments'],
        queryFn: segmentService.getSegments,
    });

    const { data: accountStatsData } = useQuery({
        queryKey: ['accountStats'],
        queryFn: accountService.getAccountStats,
    });

    const { data: auditData } = useQuery({
        queryKey: ['recentAudit'],
        queryFn: () => auditService.getLogs({ limit: 6 }),
    });

    const { data: taskStatsData } = useQuery({
        queryKey: ['taskDashboardStats'],
        queryFn: taskService.getStats,
    });

    const { data: docStatsData } = useQuery({
        queryKey: ['documentStats'],
        queryFn: documentService.getStats,
    });

    const { data: personalTaskStatsData } = useQuery({
        queryKey: ['personalTaskStats'],
        queryFn: personalTaskService.getStats,
    });

    const { data: slaData } = useQuery({
        queryKey: ['slaDashboard'],
        queryFn: () => slaService.getDashboardMetrics(),
        retry: false,
    });

    // ── Derived Data ──
    const stats = statsData?.data || { total: 0, byType: [], byStatus: [] };
    const recentDevices = devicesData?.data || [];
    const segments = segmentsData?.data || [];
    const accountStats = accountStatsData?.data || { total: 0, bySystemType: [], byEnvironment: [] };
    const auditLogs = auditData?.data || [];
    const taskStats = taskStatsData?.data || { total: 0, open: 0, in_progress: 0, resolved: 0, urgent: 0 };
    const docStats = docStatsData?.data || { total: 0, recentCount: 0 };
    const personalStats = personalTaskStatsData?.data || { total: 0, pending: 0, completed: 0, overdue: 0 };
    const slaMetrics = slaData?.data || null;

    const ipStats = segments.reduce((acc, segment) => {
        const s = segment.stats || {};
        acc.total += s.total || 0;
        acc.in_use += s.used || 0;
        acc.free += s.free || 0;
        return acc;
    }, { total: 0, in_use: 0, free: 0 });

    const activeCount = stats.byStatus?.find(s => s.status === 'active')?.count || 0;
    const maintenanceCount = stats.byStatus?.find(s => s.status === 'maintenance')?.count || 0;
    const inactiveCount = stats.byStatus?.find(s => s.status === 'inactive')?.count || 0;

    // ── Helpers ──
    const getStatusTag = (status) => {
        const cfg = {
            active: { color: 'success', icon: <CheckCircleOutlined /> },
            inactive: { color: 'default', icon: <ClockCircleOutlined /> },
            maintenance: { color: 'warning', icon: <WarningOutlined /> },
            retired: { color: 'error', icon: null },
            spare: { color: 'processing', icon: null },
        };
        const c = cfg[status] || { color: 'default' };
        return <Tag color={c.color} icon={c.icon}>{status?.toUpperCase()}</Tag>;
    };

    const getTypeIcon = (type) => {
        const icons = {
            pc: '💻', laptop: '💻', server: '🖥️', vm: '☁️',
            switch: '🔀', router: '📡', firewall: '🛡️', access_point: '📶',
            printer: '🖨️', camera: '📹', nas: '💾', ups: '🔋', other: '📦',
        };
        return icons[type] || '📦';
    };

    const getActionIcon = (action) => {
        const icons = {
            create: <CheckCircleOutlined style={{ color: '#00D4AA' }} />,
            update: <ClockCircleOutlined style={{ color: '#3B82F6' }} />,
            delete: <AlertOutlined style={{ color: '#EF4444' }} />,
            login: <KeyOutlined style={{ color: '#F59E0B' }} />,
            logout: <KeyOutlined style={{ color: '#6B7280' }} />,
        };
        return icons[action] || <HistoryOutlined />;
    };

    const getAccountIcon = (type) => {
        const icons = {
            firewall: '🛡️', vmware: '☁️', o365: '📧',
            switch: '🔀', router: '📡', nas: '💾',
        };
        return icons[type] || '🔑';
    };

    // ── Navigation ──
    const nav = (path, filter = {}) => {
        const params = new URLSearchParams(filter).toString();
        navigate(`${path}${params ? '?' + params : ''}`);
    };

    // ── Chart configs ──
    const ipPieData = [
        { type: t('dashboard.usedIPs'), value: ipStats.in_use },
        { type: t('dashboard.availableIPs'), value: ipStats.free },
    ];

    const pieConfig = {
        data: ipPieData,
        angleField: 'value',
        colorField: 'type',
        radius: 0.85,
        innerRadius: 0.65,
        color: ['#3B82F6', '#00D4AA'],
        label: {
            text: 'value',
            position: 'inside',
            style: { fill: '#fff', fontSize: 13, fontWeight: 600 },
        },
        legend: { position: 'bottom', itemName: { style: { fill: 'rgba(255,255,255,0.7)' } } },
        statistic: {
            title: { content: 'Total', style: { color: 'rgba(255,255,255,0.5)', fontSize: 12 } },
            content: { content: ipStats.total.toString(), style: { color: '#fff', fontSize: 22, fontWeight: 700 } },
        },
    };

    const deviceTypeData = stats.byType?.map(item => ({
        type: item.type,
        count: item.count,
    })) || [];

    const barConfig = {
        data: deviceTypeData,
        xField: 'type',
        yField: 'count',
        color: '#3B82F6',
        label: { text: 'count', position: 'top', style: { fill: 'rgba(255,255,255,0.7)' } },
        xAxis: { label: { autoRotate: true, style: { fill: 'rgba(255,255,255,0.5)' } } },
        yAxis: { label: { style: { fill: 'rgba(255,255,255,0.5)' } } },
        style: { radiusTopLeft: 2, radiusTopRight: 2 },
    };

    // ── Device table ──
    const columns = [
        {
            title: t('menu.devices'),
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <Space>
                    <span style={{ fontSize: 16 }}>{getTypeIcon(record.type)}</span>
                    <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{text}</div>
                        <Text type="secondary" style={{ fontSize: 11 }}>{record.type}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'IP',
            dataIndex: 'ipAddresses',
            key: 'ip',
            render: (ips) => <Text style={{ fontSize: 12 }}>{ips?.[0]?.ip_address || '—'}</Text>,
        },
        {
            title: t('common.status'),
            dataIndex: 'status',
            key: 'status',
            render: (status) => getStatusTag(status),
        },
    ];

    // SLA percentage
    const slaPercent = slaMetrics?.overall_compliance != null
        ? Math.round(slaMetrics.overall_compliance)
        : null;

    return (
        <div className="dashboard-page">
            {/* ═══════════ HEADER ═══════════ */}
            <div className="db-header">
                <div className="db-header-left">
                    <Title level={3} style={{ marginBottom: 0 }}>
                        {t('dashboard.welcome')}, {user?.display_name || user?.username} 👋
                    </Title>
                    <Text type="secondary">
                        {currentTime.format('dddd, DD/MM/YYYY — HH:mm')} · {t('dashboard.systemOverview')}
                    </Text>
                </div>
                <div className="db-header-actions">
                    <Button icon={<PlusOutlined />} onClick={() => nav('/devices', {})} >{t('dashboard.addDevice')}</Button>
                    <Button icon={<FileTextOutlined />} onClick={() => nav('/tasks', {})} >{t('dashboard.createTask')}</Button>
                    <Button icon={<GlobalOutlined />} onClick={() => nav('/ip-map', {})} >{t('dashboard.scanNetwork')}</Button>
                </div>
            </div>

            {/* ═══════════ SECTION 1: INFRASTRUCTURE ═══════════ */}
            <div className="db-section">
                <SectionHeader
                    icon={<DesktopOutlined />}
                    title={t('dashboard.infrastructure')}
                    color="#3B82F6"
                    extra={<a onClick={() => nav('/devices')}>{t('dashboard.viewAll')} <RightOutlined /></a>}
                />
                <Row gutter={[12, 12]}>
                    {/* Left: stat cards in 2x2 grid */}
                    <Col xs={24} md={10}>
                        <Row gutter={[12, 12]}>
                            <Col span={12}>
                                <StatCard
                                    title={t('dashboard.totalDevices')}
                                    value={stats.total}
                                    icon={<LaptopOutlined />}
                                    color="#3B82F6"
                                    onClick={() => nav('/devices')}
                                />
                            </Col>
                            <Col span={12}>
                                <StatCard
                                    title={t('dashboard.activeDevices')}
                                    value={activeCount}
                                    icon={<CheckCircleOutlined />}
                                    color="#00D4AA"
                                    onClick={() => nav('/devices', { status: 'active' })}
                                />
                            </Col>
                            <Col span={12}>
                                <StatCard
                                    title={t('dashboard.maintenance')}
                                    value={maintenanceCount}
                                    icon={<ToolOutlined />}
                                    color="#F59E0B"
                                    onClick={() => nav('/devices', { status: 'maintenance' })}
                                />
                            </Col>
                            <Col span={12}>
                                <StatCard
                                    title={t('dashboard.inactive')}
                                    value={inactiveCount}
                                    icon={<ExclamationCircleOutlined />}
                                    color="#EF4444"
                                    onClick={() => nav('/devices', { status: 'inactive' })}
                                />
                            </Col>
                        </Row>
                    </Col>

                    {/* Right: Device type chart */}
                    <Col xs={24} md={14}>
                        <Card bordered={false} className="db-card" style={{ height: '100%' }}
                            title={<Space><AppstoreOutlined /> {t('dashboard.deviceTypes')}</Space>}
                        >
                            {deviceTypeData.length > 0 ? (
                                <div style={{ height: 180 }}>
                                    <Column {...barConfig} />
                                </div>
                            ) : (
                                <Empty description={t('common.noData')} />
                            )}
                        </Card>
                    </Col>
                </Row>
            </div>

            {/* ═══════════ SECTION 2: NETWORK & ACCOUNTS ═══════════ */}
            <Row gutter={[16, 16]}>
                {/* Network */}
                <Col xs={24} md={12}>
                    <div className="db-section">
                        <SectionHeader
                            icon={<GlobalOutlined />}
                            title={t('dashboard.network')}
                            color="#06B6D4"
                            extra={<a onClick={() => nav('/ip-map')}>{t('dashboard.viewAll')} <RightOutlined /></a>}
                        />
                        <Row gutter={[12, 12]}>
                            <Col xs={12}>
                                <StatCard
                                    title={t('dashboard.usedIPs')}
                                    value={ipStats.in_use}
                                    subtitle={`/ ${ipStats.total} Total`}
                                    icon={<GlobalOutlined />}
                                    color="#3B82F6"
                                    onClick={() => nav('/ip-map', { status: 'in_use' })}
                                />
                            </Col>
                            <Col xs={12}>
                                <StatCard
                                    title={t('dashboard.networkSegments')}
                                    value={segments.length}
                                    icon={<CloudServerOutlined />}
                                    color="#06B6D4"
                                    onClick={() => nav('/ip-map')}
                                />
                            </Col>
                        </Row>

                        <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
                            <Col xs={24} md={10}>
                                <Card bordered={false} className="db-card" bodyStyle={{ padding: 16 }}>
                                    {ipStats.total > 0 ? (
                                        <div style={{ height: 200 }}>
                                            <Pie {...pieConfig} />
                                        </div>
                                    ) : (
                                        <Empty description={t('common.noData')} />
                                    )}
                                </Card>
                            </Col>
                            <Col xs={24} md={14}>
                                <Card bordered={false} className="db-card" bodyStyle={{ padding: 12 }}>
                                    {segments.length > 0 ? (
                                        <div style={{ maxHeight: 200, overflow: 'auto' }}>
                                            {segments.slice(0, 5).map(segment => {
                                                const used = segment.stats?.used || 0;
                                                const total = segment.stats?.total || 0;
                                                const percent = total > 0 ? Math.round((used / total) * 100) : 0;
                                                return (
                                                    <div key={segment.id} className="db-segment-row" onClick={() => nav('/ip-map', { segment: segment.id })}>
                                                        <div className="db-segment-row-top">
                                                            <Space><Badge color={segment.color || '#3B82F6'} /><Text strong style={{ fontSize: 13 }}>{segment.name}</Text></Space>
                                                            <Text type="secondary" style={{ fontSize: 12 }}>{used}/{total}</Text>
                                                        </div>
                                                        <Progress percent={percent} size="small" status={percent > 90 ? 'exception' : 'active'} showInfo={false} strokeColor={percent > 90 ? '#EF4444' : '#3B82F6'} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <Empty description={t('common.noData')} />
                                    )}
                                </Card>
                            </Col>
                        </Row>
                    </div>
                </Col>

                {/* Accounts */}
                <Col xs={24} md={12}>
                    <div className="db-section">
                        <SectionHeader
                            icon={<KeyOutlined />}
                            title={t('dashboard.accounts')}
                            color="#F59E0B"
                            extra={<a onClick={() => nav('/accounts')}>{t('dashboard.viewAll')} <RightOutlined /></a>}
                        />
                        <StatCard
                            title={t('dashboard.totalAccounts')}
                            value={accountStats.total}
                            icon={<KeyOutlined />}
                            color="#F59E0B"
                            onClick={() => nav('/accounts')}
                        />
                        <Card bordered={false} className="db-card" style={{ marginTop: 12 }} bodyStyle={{ padding: 8 }}>
                            {accountStats.bySystemType?.length > 0 ? (
                                <div className="db-account-list">
                                    {accountStats.bySystemType.slice(0, 6).map((item) => (
                                        <div key={item.type} className="db-account-row" onClick={() => nav('/accounts', { system_type: item.type })}>
                                            <Space>
                                                <span style={{ fontSize: 16 }}>{getAccountIcon(item.type)}</span>
                                                <Text style={{ fontSize: 13 }}>{item.label}</Text>
                                            </Space>
                                            <Badge count={item.count} style={{ backgroundColor: '#3B82F6' }} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Empty description={t('common.noData')} />
                            )}
                        </Card>
                    </div>
                </Col>
            </Row>

            {/* ═══════════ SECTION 3: OPERATIONS ═══════════ */}
            <div className="db-section">
                <SectionHeader
                    icon={<OrderedListOutlined />}
                    title={t('dashboard.operations')}
                    color="#8B5CF6"
                    extra={<a onClick={() => nav('/tasks')}>{t('dashboard.viewAll')} <RightOutlined /></a>}
                />
                <div className="db-ops-grid">
                    <StatCard
                        title={t('tasks.stats.open')}
                        value={taskStats.open || 0}
                        icon={<FileTextOutlined />}
                        color="#3B82F6"
                        onClick={() => nav('/tasks', { status: 'open' })}
                    />
                    <StatCard
                        title={t('dashboard.inProgress')}
                        value={taskStats.in_progress || 0}
                        icon={<ClockCircleOutlined />}
                        color="#F59E0B"
                        onClick={() => nav('/tasks', { status: 'in_progress' })}
                    />
                    <StatCard
                        title={t('tasks.stats.urgent')}
                        value={taskStats.urgent || 0}
                        icon={<ThunderboltOutlined />}
                        color="#EF4444"
                        onClick={() => nav('/tasks', { priority: 'urgent' })}
                    />
                    <StatCard
                        title={t('tasks.stats.resolved')}
                        value={taskStats.resolved || 0}
                        icon={<CheckCircleOutlined />}
                        color="#00D4AA"
                        onClick={() => nav('/tasks', { status: 'resolved' })}
                    />
                    <StatCard
                        title={t('dashboard.myTasks')}
                        value={personalStats.pending || 0}
                        subtitle={`${personalStats.overdue || 0} overdue`}
                        icon={<AppstoreOutlined />}
                        color="#06B6D4"
                        onClick={() => nav('/personal-tasks')}
                    />
                    {slaPercent != null && (
                        <StatCard
                            title={t('dashboard.slaCompliance')}
                            value={`${slaPercent}%`}
                            icon={<SafetyCertificateOutlined />}
                            color={slaPercent >= 90 ? '#00D4AA' : slaPercent >= 70 ? '#F59E0B' : '#EF4444'}
                            onClick={() => nav('/sla')}
                        />
                    )}
                </div>
            </div>

            {/* ═══════════ SECTION 4: ACTIVITY & RESOURCES ═══════════ */}
            <div className="db-section">
                <SectionHeader
                    icon={<HistoryOutlined />}
                    title={t('dashboard.activityResources')}
                    color="#00D4AA"
                />
                <Row gutter={[16, 16]}>
                    {/* Activity Timeline */}
                    <Col xs={24} md={7}>
                        <Card
                            bordered={false}
                            className="db-card"
                            title={<Space><HistoryOutlined /> {t('dashboard.recentActivity')}</Space>}
                            extra={<a onClick={() => nav('/audit-logs')}>{t('common.all')} <RightOutlined /></a>}
                        >
                            {auditLogs.length > 0 ? (
                                <Timeline
                                    items={auditLogs.slice(0, 5).map(log => ({
                                        dot: getActionIcon(log.action),
                                        children: (
                                            <div>
                                                <Text strong style={{ fontSize: 13 }}>{log.user?.display_name || log.user?.username}</Text>
                                                <Text type="secondary" style={{ fontSize: 12 }}> {log.action} </Text>
                                                <Text style={{ fontSize: 13 }}>{log.entity_type}</Text>
                                                <div><Text type="secondary" style={{ fontSize: 11 }}>{dayjs(log.createdAt).fromNow()}</Text></div>
                                            </div>
                                        ),
                                    }))}
                                />
                            ) : (
                                <Empty description={t('common.noData')} />
                            )}
                        </Card>
                    </Col>

                    {/* Recent Devices */}
                    <Col xs={24} md={10}>
                        <Card
                            bordered={false}
                            className="db-card"
                            title={<Space><LaptopOutlined /> {t('dashboard.recentDevices')}</Space>}
                            extra={<a onClick={() => nav('/devices')}>{t('common.all')} <RightOutlined /></a>}
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

                    {/* Documents Summary */}
                    <Col xs={24} md={7}>
                        <Card
                            bordered={false}
                            className="db-card"
                            title={<Space><BookOutlined /> {t('dashboard.documents')}</Space>}
                            extra={<a onClick={() => nav('/documents')}>{t('common.all')} <RightOutlined /></a>}
                        >
                            <div className="db-doc-summary">
                                <div className="db-doc-big-number">{docStats.total}</div>
                                <Text type="secondary">{t('documents.totalDocs')}</Text>
                                <div className="db-doc-sub">
                                    <Badge status="processing" />
                                    <Text style={{ fontSize: 13 }}>{docStats.recentCount || 0} {t('dashboard.newThisWeek')}</Text>
                                </div>
                                <Button
                                    type="primary"
                                    ghost
                                    block
                                    style={{ marginTop: 16 }}
                                    onClick={() => nav('/documents')}
                                >
                                    {t('dashboard.viewAll')} <RightOutlined />
                                </Button>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </div>
        </div>
    );
};

export default DashboardPage;
