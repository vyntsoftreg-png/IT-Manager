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

    // Get action tag
    const getActionTag = (action) => {
        const config = actions.find((a) => a.value === action);
        return (
            <Tag color={config?.color || 'default'} icon={actionIcons[action]}>
                {config?.label || action}
            </Tag>
        );
    };

    // Get entity type label
    const getEntityLabel = (type) => {
        const config = entityTypes.find((t) => t.value === type);
        return config?.label || type;
    };

    // Table columns
    const columns = [
        {
            title: 'Thời gian',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 160,
            render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm:ss'),
        },
        {
            title: 'Người dùng',
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
            title: 'Hành động',
            dataIndex: 'action',
            key: 'action',
            width: 130,
            render: (action) => getActionTag(action),
        },
        {
            title: 'Đối tượng',
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
                <Tooltip title="Xem chi tiết">
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
                    <Empty description="Bạn không có quyền truy cập trang này" />
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
                        Nhật ký hoạt động
                    </Title>
                    <Text type="secondary">Theo dõi các thay đổi trong hệ thống</Text>
                </div>
            </div>

            {/* Filters */}
            <Card bordered={false} className="filter-card" style={{ marginBottom: 16 }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={12} md={5}>
                        <Select
                            placeholder="Hành động"
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
                            placeholder="Loại đối tượng"
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
                            placeholder={['Từ ngày', 'Đến ngày']}
                            onChange={handleDateChange}
                        />
                    </Col>
                    <Col>
                        <Tooltip title="Làm mới">
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
                        showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} bản ghi`,
                    }}
                    onChange={handleTableChange}
                />
            </Card>

            {/* Detail Drawer */}
            <Drawer
                title="Chi tiết nhật ký"
                placement="right"
                width={600}
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
            >
                {selectedLog && (
                    <>
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="Thời gian">
                                {dayjs(selectedLog.created_at).format('DD/MM/YYYY HH:mm:ss')}
                            </Descriptions.Item>
                            <Descriptions.Item label="Người dùng">
                                {selectedLog.user?.display_name || selectedLog.user?.username || 'System'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Hành động">
                                {getActionTag(selectedLog.action)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Đối tượng">
                                {getEntityLabel(selectedLog.entity_type)}
                            </Descriptions.Item>
                            <Descriptions.Item label="ID đối tượng">
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
                                <Title level={5} style={{ marginTop: 24 }}>Giá trị cũ</Title>
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
                                <Title level={5} style={{ marginTop: 16 }}>Giá trị mới</Title>
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
