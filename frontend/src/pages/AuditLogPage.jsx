import { useState } from 'react';
import {
    Card, Table, Button, Select, Space, Tag, Typography, message,
    Row, Col, DatePicker, Drawer, Descriptions, Tooltip, Empty,
} from 'antd';
import {
    ReloadOutlined, EyeOutlined, UserOutlined, HistoryOutlined,
    PlusCircleOutlined, EditOutlined, DeleteOutlined, LoginOutlined,
    LogoutOutlined, KeyOutlined, ImportOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { auditService } from '../services/auditService';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Action icons
const actionIcons = {
    create: <PlusCircleOutlined style={{ color: '#52c41a' }} />,
    update: <EditOutlined style={{ color: '#1890ff' }} />,
    delete: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
    login: <LoginOutlined style={{ color: '#13c2c2' }} />,
    logout: <LogoutOutlined style={{ color: '#8c8c8c' }} />,
    reveal_password: <KeyOutlined style={{ color: '#fa8c16' }} />,
    import: <ImportOutlined style={{ color: '#722ed1' }} />,
};

const AuditLogPage = () => {
    const { isAdmin } = useAuth();
    const { t } = useTranslation();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [filters, setFilters] = useState({
        page: 1,
        limit: 20,
        action: undefined,
        entity_type: undefined,
        start_date: undefined,
        end_date: undefined,
    });

    // Queries
    const { data: logsData, isLoading, refetch } = useQuery({
        queryKey: ['auditLogs', filters],
        queryFn: () => auditService.getLogs(filters),
        enabled: isAdmin,
    });

    const { data: actionsData } = useQuery({
        queryKey: ['auditActions'],
        queryFn: auditService.getActions,
        enabled: isAdmin,
    });

    const { data: entityTypesData } = useQuery({
        queryKey: ['auditEntityTypes'],
        queryFn: auditService.getEntityTypes,
        enabled: isAdmin,
    });

    const logs = logsData?.data || [];
    const pagination = logsData?.pagination || {};
    const actions = actionsData?.data || [];
    const entityTypes = entityTypesData?.data || [];

    // Handlers
    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
    };

    const handleDateChange = (dates) => {
        setFilters((prev) => ({
            ...prev,
            start_date: dates?.[0]?.format('YYYY-MM-DD'),
            end_date: dates?.[1]?.format('YYYY-MM-DD'),
            page: 1,
        }));
    };

    const handleTableChange = (paginationInfo) => {
        setFilters((prev) => ({
            ...prev,
            page: paginationInfo.current,
            limit: paginationInfo.pageSize,
        }));
    };

    const handleViewLog = (log) => {
        setSelectedLog(log);
        setIsDrawerOpen(true);
    };

    // Translation mapping for entity types (matching backend values)
    const entityTypeKeys = {
        'users': 'auditLog.entities.users',
        'devices': 'auditLog.entities.devices',
        'admin_accounts': 'auditLog.entities.admin_accounts',
        'ip_addresses': 'auditLog.entities.ip_addresses',
        'network_segments': 'auditLog.entities.network_segments',
        'tasks': 'auditLog.entities.tasks',
        'lookup_settings': 'auditLog.entities.lookup_settings',
    };

    // Get action tag with translation
    const getActionTag = (action) => {
        const config = actions.find((a) => a.value === action);
        // Try translation first, fallback to backend label
        const translationKey = `auditLog.actions.${action}`;
        const translated = t(translationKey);
        // If translation key returns the key itself, use backend label
        const displayLabel = translated !== translationKey ? translated : (config?.label || action);
        return (
            <Tag color={config?.color || 'default'} icon={actionIcons[action]}>
                {displayLabel}
            </Tag>
        );
    };

    // Get entity type label with translation
    const getEntityLabel = (type) => {
        const translationKey = entityTypeKeys[type];
        if (translationKey) {
            return t(translationKey);
        }
        // Fallback to backend label
        const config = entityTypes.find((et) => et.value === type);
        return config?.label || type;
    };

    // Table columns
    const columns = [
        {
            title: t('auditLog.timestamp'),
            dataIndex: 'created_at',
            key: 'created_at',
            width: 160,
            render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm:ss'),
        },
        {
            title: t('auditLog.user'),
            dataIndex: 'user',
            key: 'user',
            width: 150,
            render: (user) => (
                <Space>
                    <UserOutlined />
                    <span>{user?.display_name || user?.username || 'System'}</span>
                </Space>
            ),
        },
        {
            title: t('auditLog.action'),
            dataIndex: 'action',
            key: 'action',
            width: 130,
            render: (action) => getActionTag(action),
        },
        {
            title: t('auditLog.entityType'),
            dataIndex: 'entity_type',
            key: 'entity_type',
            width: 150,
            render: (type, record) => (
                <Space direction="vertical" size={0}>
                    <Text>{getEntityLabel(type)}</Text>
                    {record.entity_id && (
                        <Text type="secondary" style={{ fontSize: 11 }}>ID: {record.entity_id}</Text>
                    )}
                </Space>
            ),
        },
        {
            title: 'IP Address',
            dataIndex: 'ip_address',
            key: 'ip_address',
            width: 130,
            render: (ip) => ip || '-',
        },
        {
            title: '',
            key: 'actions',
            width: 60,
            render: (_, record) => (
                <Tooltip title={t('common.view')}>
                    <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewLog(record)}
                    />
                </Tooltip>
            ),
        },
    ];

    if (!isAdmin) {
        return (
            <div className="audit-page">
                <Card>
                    <Empty description={t('auditLog.noAccess')} />
                </Card>
            </div>
        );
    }

    return (
        <div className="audit-page">
            <div className="page-header">
                <div>
                    <Title level={3}>
                        <HistoryOutlined style={{ marginRight: 8 }} />
                        {t('auditLog.title')}
                    </Title>
                    <Text type="secondary">{t('auditLog.subtitle')}</Text>
                </div>
            </div>

            {/* Filters */}
            <Card bordered={false} className="filter-card" style={{ marginBottom: 16 }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={12} md={5}>
                        <Select
                            placeholder={t('auditLog.action')}
                            allowClear
                            style={{ width: '100%' }}
                            value={filters.action}
                            onChange={(value) => handleFilterChange('action', value)}
                        >
                            {actions.map((action) => (
                                <Select.Option key={action.value} value={action.value}>
                                    <Space>
                                        {actionIcons[action.value]}
                                        {action.label}
                                    </Space>
                                </Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={5}>
                        <Select
                            placeholder={t('auditLog.entityType')}
                            allowClear
                            style={{ width: '100%' }}
                            value={filters.entity_type}
                            onChange={(value) => handleFilterChange('entity_type', value)}
                        >
                            {entityTypes.map((type) => (
                                <Select.Option key={type.value} value={type.value}>
                                    {type.label}
                                </Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <RangePicker
                            style={{ width: '100%' }}
                            placeholder={[t('auditLog.fromDate'), t('auditLog.toDate')]}
                            onChange={handleDateChange}
                        />
                    </Col>
                    <Col>
                        <Tooltip title={t('common.refresh')}>
                            <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
                        </Tooltip>
                    </Col>
                </Row>
            </Card>

            {/* Table */}
            <Card bordered={false} className="table-card">
                <Table
                    columns={columns}
                    dataSource={logs}
                    rowKey="id"
                    loading={isLoading}
                    size="small"
                    pagination={{
                        current: pagination.page,
                        pageSize: pagination.limit,
                        total: pagination.total,
                        showSizeChanger: true,
                        pageSizeOptions: ['20', '50', '100'],
                        showTotal: (total, range) => `${range[0]}-${range[1]} ${t('common.of')} ${total}`,
                    }}
                    onChange={handleTableChange}
                />
            </Card>

            {/* Detail Drawer */}
            <Drawer
                title={t('auditLog.details')}
                placement="right"
                width={600}
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
            >
                {selectedLog && (
                    <>
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label={t('auditLog.timestamp')}>
                                {dayjs(selectedLog.created_at).format('DD/MM/YYYY HH:mm:ss')}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('auditLog.user')}>
                                {selectedLog.user?.display_name || selectedLog.user?.username || 'System'}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('auditLog.action')}>
                                {getActionTag(selectedLog.action)}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('auditLog.entityType')}>
                                {getEntityLabel(selectedLog.entity_type)}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('auditLog.entityId')}>
                                {selectedLog.entity_id || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="IP Address">
                                {selectedLog.ip_address || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="User Agent">
                                <Text style={{ fontSize: 11, wordBreak: 'break-all' }}>
                                    {selectedLog.user_agent || '-'}
                                </Text>
                            </Descriptions.Item>
                        </Descriptions>

                        {selectedLog.old_values && (
                            <>
                                <Title level={5} style={{ marginTop: 24 }}>{t('auditLog.oldValues')}</Title>
                                <pre style={{
                                    background: '#f5f5f5',
                                    padding: 12,
                                    borderRadius: 4,
                                    fontSize: 12,
                                    maxHeight: 200,
                                    overflow: 'auto'
                                }}>
                                    {JSON.stringify(JSON.parse(selectedLog.old_values), null, 2)}
                                </pre>
                            </>
                        )}

                        {selectedLog.new_values && (
                            <>
                                <Title level={5} style={{ marginTop: 16 }}>{t('auditLog.newValues')}</Title>
                                <pre style={{
                                    background: '#f0f9ff',
                                    padding: 12,
                                    borderRadius: 4,
                                    fontSize: 12,
                                    maxHeight: 200,
                                    overflow: 'auto'
                                }}>
                                    {JSON.stringify(JSON.parse(selectedLog.new_values), null, 2)}
                                </pre>
                            </>
                        )}
                    </>
                )}
            </Drawer>
        </div>
    );
};

export default AuditLogPage;
