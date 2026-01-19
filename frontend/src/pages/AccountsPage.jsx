import { useState } from 'react';
import {
    Card, Table, Button, Input, Select, Space, Tag, Modal, Form,
    Row, Col, Typography, message, Popconfirm, Tooltip, Drawer,
    Descriptions, Empty, Divider, Alert,
} from 'antd';
import {
    PlusOutlined, SearchOutlined, ReloadOutlined, EditOutlined,
    DeleteOutlined, EyeOutlined, KeyOutlined, LinkOutlined,
    GlobalOutlined, CloudOutlined, SafetyOutlined, DatabaseOutlined,
    DesktopOutlined, WifiOutlined, LockOutlined, BugOutlined,
    SaveOutlined, LineChartOutlined, CloudServerOutlined,
    ApartmentOutlined, EyeInvisibleOutlined, CopyOutlined,
    DownloadOutlined, UploadOutlined, InboxOutlined,
} from '@ant-design/icons';
import { Upload } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { accountService } from '../services/accountService';
import { deviceService } from '../services/deviceService';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

// Icon mapping for system types
const systemTypeIcons = {
    o365: <CloudOutlined style={{ color: '#0078d4' }} />,
    azure_ad: <CloudOutlined style={{ color: '#0089d6' }} />,
    vmware: <CloudServerOutlined style={{ color: '#607078' }} />,
    firewall: <SafetyOutlined style={{ color: '#fa541c' }} />,
    switch: <ApartmentOutlined style={{ color: '#13c2c2' }} />,
    router: <GlobalOutlined style={{ color: '#1890ff' }} />,
    wifi_controller: <WifiOutlined style={{ color: '#52c41a' }} />,
    nas: <DatabaseOutlined style={{ color: '#722ed1' }} />,
    server_os: <DesktopOutlined style={{ color: '#2f54eb' }} />,
    database: <DatabaseOutlined style={{ color: '#eb2f96' }} />,
    backup: <SaveOutlined style={{ color: '#faad14' }} />,
    antivirus: <BugOutlined style={{ color: '#f5222d' }} />,
    monitoring: <LineChartOutlined style={{ color: '#a0d911' }} />,
    domain: <GlobalOutlined style={{ color: '#fa8c16' }} />,
    hosting: <CloudOutlined style={{ color: '#597ef7' }} />,
    vpn: <LockOutlined style={{ color: '#9254de' }} />,
    other: <KeyOutlined style={{ color: '#8c8c8c' }} />,
};

const AccountsPage = () => {
    const { canEdit, isAdmin } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [form] = Form.useForm();

    // State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [viewingAccount, setViewingAccount] = useState(null);
    const [filters, setFilters] = useState({
        page: 1,
        limit: 20,
        search: '',
        system_type: undefined,
        environment: undefined,
    });

    // Password reveal state
    const [isRevealModalOpen, setIsRevealModalOpen] = useState(false);
    const [revealPassword, setRevealPassword] = useState('');
    const [revealedPassword, setRevealedPassword] = useState(null);
    const [revealLoading, setRevealLoading] = useState(false);

    // Export/Import state
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportPassword, setExportPassword] = useState('');
    const [exportLoading, setExportLoading] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [importData, setImportData] = useState([]);
    const [importLoading, setImportLoading] = useState(false);

    // Queries
    const { data: accountsData, isLoading, refetch } = useQuery({
        queryKey: ['accounts', filters],
        queryFn: () => accountService.getAccounts(filters),
    });

    const { data: systemTypesData } = useQuery({
        queryKey: ['systemTypes'],
        queryFn: accountService.getSystemTypes,
    });

    const { data: environmentsData } = useQuery({
        queryKey: ['environments'],
        queryFn: accountService.getEnvironments,
    });

    const { data: devicesData } = useQuery({
        queryKey: ['allDevices'],
        queryFn: () => deviceService.getDevices({ limit: 1000 }),
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: accountService.createAccount,
        onSuccess: () => {
            message.success('Tạo tài khoản thành công!');
            queryClient.invalidateQueries(['accounts']);
            handleCloseModal();
        },
        onError: (error) => {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => accountService.updateAccount(id, data),
        onSuccess: () => {
            message.success('Cập nhật tài khoản thành công!');
            queryClient.invalidateQueries(['accounts']);
            handleCloseModal();
        },
        onError: (error) => {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: accountService.deleteAccount,
        onSuccess: () => {
            message.success('Xóa tài khoản thành công!');
            queryClient.invalidateQueries(['accounts']);
        },
        onError: (error) => {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: (ids) => accountService.bulkDelete(ids),
        onSuccess: (data) => {
            message.success(`Đã xóa ${data.deleted || selectedRowKeys.length} tài khoản!`);
            setSelectedRowKeys([]);
            queryClient.invalidateQueries(['accounts']);
        },
        onError: (error) => {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        },
    });

    const accounts = accountsData?.data || [];
    const pagination = accountsData?.pagination || {};
    const systemTypes = systemTypesData?.data || [];
    const environments = environmentsData?.data || [];
    const devices = devicesData?.data || [];

    // Handlers
    const handleOpenModal = (account = null) => {
        setEditingAccount(account);
        if (account) {
            form.setFieldsValue({
                ...account,
                device_id: account.device?.id,
            });
        } else {
            form.resetFields();
            form.setFieldsValue({ environment: 'production' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        // Reset form and editing state after modal animation completes
        setTimeout(() => {
            setEditingAccount(null);
            form.resetFields();
        }, 100);
    };

    const handleSubmit = async (values) => {
        if (editingAccount) {
            updateMutation.mutate({ id: editingAccount.id, data: values });
        } else {
            createMutation.mutate(values);
        }
    };

    const handleDelete = (id) => {
        deleteMutation.mutate(id);
    };

    const handleViewAccount = (account) => {
        setViewingAccount(account);
        setIsDrawerOpen(true);
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
    };

    const handleTableChange = (paginationInfo) => {
        setFilters((prev) => ({
            ...prev,
            page: paginationInfo.current,
            limit: paginationInfo.pageSize,
        }));
    };

    // Get environment tag
    const getEnvironmentTag = (env) => {
        const config = environments.find((e) => e.value === env);
        return <Tag color={config?.color || 'default'}>{config?.label || env}</Tag>;
    };

    // Handle reveal password
    const handleRevealPassword = async () => {
        if (!revealPassword) {
            message.error('Vui lòng nhập mật khẩu xác thực');
            return;
        }

        setRevealLoading(true);
        try {
            const result = await accountService.revealPassword(viewingAccount.id, revealPassword);
            setRevealedPassword(result.data.password);
            setIsRevealModalOpen(false);
            setRevealPassword('');
            message.success('Xác thực thành công!');
        } catch (error) {
            message.error(error.response?.data?.message || 'Xác thực thất bại');
        } finally {
            setRevealLoading(false);
        }
    };

    const handleCopyPassword = () => {
        if (revealedPassword) {
            navigator.clipboard.writeText(revealedPassword);
            message.success('Đã sao chép mật khẩu!');
        }
    };

    const handleCloseDrawer = () => {
        setIsDrawerOpen(false);
        setRevealedPassword(null);
    };

    // Export handlers
    const handleExport = async () => {
        if (!exportPassword) {
            message.error('Vui lòng nhập mật khẩu xác thực');
            return;
        }

        setExportLoading(true);
        try {
            const blob = await accountService.exportAccounts(exportPassword);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `admin_accounts_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setIsExportModalOpen(false);
            setExportPassword('');
            message.success('Xuất file thành công!');
        } catch (error) {
            message.error(error.response?.data?.message || 'Xuất file thất bại');
        } finally {
            setExportLoading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const blob = await accountService.getImportTemplate();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'admin_accounts_template.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            message.success('Tải template thành công!');
        } catch (error) {
            message.error('Tải template thất bại');
        }
    };

    // Parse CSV file
    const parseCSV = (text) => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = [];
            let current = '';
            let inQuotes = false;

            for (const char of lines[i]) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());

            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index]?.replace(/^"|"$/g, '') || '';
            });
            data.push(row);
        }

        return data;
    };

    const handleImportFile = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const data = parseCSV(text);
                setImportData(data);
                message.success(`Đã đọc ${data.length} tài khoản từ file`);
            } catch (error) {
                message.error('Không thể đọc file CSV');
            }
        };
        reader.readAsText(file, 'UTF-8');
        return false; // Prevent auto upload
    };

    const handleImport = async () => {
        if (importData.length === 0) {
            message.error('Chưa có dữ liệu để import');
            return;
        }

        setImportLoading(true);
        try {
            const result = await accountService.importAccounts(importData);
            message.success(result.message);
            setIsImportModalOpen(false);
            setImportData([]);
            refetch();
        } catch (error) {
            message.error(error.response?.data?.message || 'Import thất bại');
        } finally {
            setImportLoading(false);
        }
    };

    // Get system type label
    const getSystemTypeLabel = (type) => {
        const config = systemTypes.find((t) => t.value === type);
        return (
            <Space>
                {systemTypeIcons[type]}
                <span>{config?.label || type}</span>
            </Space>
        );
    };

    // Table columns
    const columns = [
        {
            title: t('accounts.systemName'),
            dataIndex: 'system_name',
            key: 'system_name',
            width: 200,
            render: (name, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {systemTypes.find((t) => t.value === record.system_type)?.label || record.system_type}
                    </Text>
                </Space>
            ),
        },
        {
            title: t('common.type'),
            dataIndex: 'system_type',
            key: 'system_type',
            width: 50,
            render: (type) => systemTypeIcons[type] || <KeyOutlined />,
        },
        {
            title: 'Username',
            dataIndex: 'username',
            key: 'username',
            width: 150,
            render: (text) => <Text code>{text}</Text>,
        },
        {
            title: 'URL Admin',
            dataIndex: 'admin_url',
            key: 'admin_url',
            width: 200,
            ellipsis: true,
            render: (url) => url ? (
                <a href={url} target="_blank" rel="noopener noreferrer">
                    <Space>
                        <LinkOutlined />
                        <span>{url.replace(/^https?:\/\//, '').slice(0, 30)}...</span>
                    </Space>
                </a>
            ) : <Text type="secondary">-</Text>,
        },
        {
            title: t('accounts.environment'),
            dataIndex: 'environment',
            key: 'environment',
            width: 120,
            render: (env) => getEnvironmentTag(env),
        },
        {
            title: 'Password',
            key: 'has_password',
            width: 80,
            render: (_, record) => (
                record.encrypted_password ? (
                    <Tag icon={<LockOutlined />} color="green">{t('common.yes')}</Tag>
                ) : (
                    <Text type="secondary">-</Text>
                )
            ),
        },
        {
            title: t('devices.deviceName'),
            dataIndex: 'device',
            key: 'device',
            width: 150,
            render: (device) => device ? device.name : <Text type="secondary">-</Text>,
        },
        {
            title: t('common.actions'),
            key: 'actions',
            width: 130,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title={t('common.view')}>
                        <Button
                            type="text"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewAccount(record)}
                        />
                    </Tooltip>
                    {canEdit && (
                        <Tooltip title={t('common.edit')}>
                            <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleOpenModal(record)}
                            />
                        </Tooltip>
                    )}
                    {isAdmin && (
                        <Popconfirm
                            title={t('accounts.deleteAccount')}
                            description={t('accounts.confirmDeleteAccount')}
                            onConfirm={() => handleDelete(record.id)}
                            okText={t('common.delete')}
                            cancelText={t('common.cancel')}
                            okButtonProps={{ danger: true }}
                        >
                            <Tooltip title={t('common.delete')}>
                                <Button
                                    type="text"
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                />
                            </Tooltip>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div className="accounts-page">
            <div className="page-header">
                <div>
                    <Title level={3}>{t('accounts.title')}</Title>
                    <Text type="secondary">{t('accounts.subtitle')}</Text>
                </div>
                <Space>
                    <Button icon={<DownloadOutlined />} onClick={() => setIsExportModalOpen(true)}>
                        {t('common.export')}
                    </Button>
                    {isAdmin && (
                        <Button icon={<UploadOutlined />} onClick={() => setIsImportModalOpen(true)}>
                            {t('common.import')}
                        </Button>
                    )}
                    {canEdit && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
                            {t('accounts.addAccount')}
                        </Button>
                    )}
                </Space>
            </div>

            {/* Filters */}
            <Card bordered={false} className="filter-card" style={{ marginBottom: 16 }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={12} md={6}>
                        <Input.Search
                            placeholder={t('accounts.searchPlaceholder')}
                            onSearch={(value) => handleFilterChange('search', value)}
                            allowClear
                            prefix={<SearchOutlined />}
                        />
                    </Col>
                    <Col xs={12} sm={6} md={4}>
                        <Select
                            placeholder={t('accounts.systemType')}
                            allowClear
                            style={{ width: '100%' }}
                            value={filters.system_type}
                            onChange={(value) => handleFilterChange('system_type', value)}
                        >
                            {systemTypes.map((type) => (
                                <Option key={type.value} value={type.value}>
                                    <Space>
                                        {systemTypeIcons[type.value]}
                                        {type.label}
                                    </Space>
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={12} sm={6} md={4}>
                        <Select
                            placeholder="Môi trường"
                            allowClear
                            style={{ width: '100%' }}
                            value={filters.environment}
                            onChange={(value) => handleFilterChange('environment', value)}
                        >
                            {environments.map((env) => (
                                <Option key={env.value} value={env.value}>
                                    <Tag color={env.color}>{env.label}</Tag>
                                </Option>
                            ))}
                        </Select>
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
                {selectedRowKeys.length > 0 && (
                    <div style={{ marginBottom: 16, padding: '12px 16px', background: '#1890ff10', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text>Đã chọn <Text strong>{selectedRowKeys.length}</Text> tài khoản</Text>
                        <Space>
                            <Button size="small" onClick={() => setSelectedRowKeys([])}>Bỏ chọn</Button>
                            <Popconfirm
                                title="Xóa nhiều tài khoản"
                                description={`Bạn có chắc chắn muốn xóa ${selectedRowKeys.length} tài khoản đã chọn?`}
                                onConfirm={() => bulkDeleteMutation.mutate(selectedRowKeys)}
                                okText="Xóa"
                                cancelText="Hủy"
                                okButtonProps={{ danger: true, loading: bulkDeleteMutation.isPending }}
                            >
                                <Button danger size="small" icon={<DeleteOutlined />}>
                                    Xóa tất cả
                                </Button>
                            </Popconfirm>
                        </Space>
                    </div>
                )}
                <Table
                    columns={columns}
                    dataSource={accounts}
                    rowKey="id"
                    loading={isLoading}
                    scroll={{ x: 1000 }}
                    rowSelection={canEdit ? {
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                    } : undefined}
                    pagination={{
                        current: pagination.page,
                        pageSize: pagination.limit,
                        total: pagination.total,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50'],
                        showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} tài khoản`,
                    }}
                    onChange={handleTableChange}
                />
            </Card>

            {/* Add/Edit Modal */}
            <Modal
                title={editingAccount ? 'Sửa tài khoản' : 'Thêm tài khoản mới'}
                open={isModalOpen}
                onCancel={handleCloseModal}
                footer={null}
                width={600}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="system_name"
                                label="Tên hệ thống"
                                rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
                            >
                                <Input placeholder="VD: Firewall HQ, vCenter DC1" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="system_type"
                                label="Loại hệ thống"
                                rules={[{ required: true, message: 'Vui lòng chọn loại' }]}
                            >
                                <Select placeholder="Chọn loại hệ thống">
                                    {systemTypes.map((type) => (
                                        <Option key={type.value} value={type.value}>
                                            <Space>
                                                {systemTypeIcons[type.value]}
                                                {type.label}
                                            </Space>
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="username"
                                label="Username"
                                rules={[{ required: true, message: 'Vui lòng nhập username' }]}
                            >
                                <Input placeholder="VD: admin, root, administrator" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="environment"
                                label="Môi trường"
                            >
                                <Select placeholder="Chọn môi trường">
                                    {environments.map((env) => (
                                        <Option key={env.value} value={env.value}>
                                            <Tag color={env.color}>{env.label}</Tag>
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="admin_url"
                        label="URL Admin"
                    >
                        <Input placeholder="VD: https://192.168.1.1:8443, https://vcenter.local" />
                    </Form.Item>

                    <Form.Item
                        name="device_id"
                        label="Thiết bị liên quan"
                    >
                        <Select
                            placeholder="Chọn thiết bị (không bắt buộc)"
                            allowClear
                            showSearch
                            filterOption={(input, option) =>
                                (option?.children?.toString() || '').toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {devices.map((device) => (
                                <Option key={device.id} value={device.id}>
                                    {device.name} ({device.type})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="notes" label="Ghi chú">
                        <Input.TextArea rows={2} placeholder="Ghi chú thêm về tài khoản..." />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="Mật khẩu"
                        extra="Mật khẩu sẽ được mã hóa và ẩn mặc định"
                    >
                        <Input.Password placeholder="Nhập mật khẩu của tài khoản admin" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={handleCloseModal}>Hủy</Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={createMutation.isPending || updateMutation.isPending}
                            >
                                {editingAccount ? 'Cập nhật' : 'Thêm mới'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Detail Drawer */}
            <Drawer
                title={
                    <Space>
                        {viewingAccount && systemTypeIcons[viewingAccount.system_type]}
                        <span>{viewingAccount?.system_name}</span>
                    </Space>
                }
                placement="right"
                width={500}
                open={isDrawerOpen}
                onClose={handleCloseDrawer}
            >
                {viewingAccount && (
                    <>
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="Hệ thống">
                                {viewingAccount.system_name}
                            </Descriptions.Item>
                            <Descriptions.Item label="Loại">
                                {getSystemTypeLabel(viewingAccount.system_type)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Username">
                                <Text code copyable>{viewingAccount.username}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="URL Admin">
                                {viewingAccount.admin_url ? (
                                    <a href={viewingAccount.admin_url} target="_blank" rel="noopener noreferrer">
                                        {viewingAccount.admin_url}
                                    </a>
                                ) : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Môi trường">
                                {getEnvironmentTag(viewingAccount.environment)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Thiết bị">
                                {viewingAccount.device?.name || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Người tạo">
                                {viewingAccount.owner?.display_name || viewingAccount.owner?.username || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày tạo">
                                {dayjs(viewingAccount.created_at).format('DD/MM/YYYY HH:mm')}
                            </Descriptions.Item>
                            <Descriptions.Item label="Cập nhật lần cuối">
                                {dayjs(viewingAccount.updated_at).format('DD/MM/YYYY HH:mm')}
                            </Descriptions.Item>
                        </Descriptions>

                        {viewingAccount.notes && (
                            <>
                                <Divider orientation="left">Ghi chú</Divider>
                                <Text>{viewingAccount.notes}</Text>
                            </>
                        )}

                        {/* Password Section */}
                        <Divider orientation="left">Mật khẩu</Divider>
                        {viewingAccount.encrypted_password ? (
                            <div>
                                {revealedPassword ? (
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Alert
                                            message="Mật khẩu đã giải mã"
                                            description={
                                                <Space>
                                                    <Text code copyable={{ text: revealedPassword }}>
                                                        {revealedPassword}
                                                    </Text>
                                                </Space>
                                            }
                                            type="success"
                                            showIcon
                                        />
                                        <Button
                                            icon={<EyeInvisibleOutlined />}
                                            onClick={() => setRevealedPassword(null)}
                                        >
                                            Ẩn mật khẩu
                                        </Button>
                                    </Space>
                                ) : (
                                    <Space direction="vertical">
                                        <Text type="secondary">
                                            <LockOutlined /> Mật khẩu được mã hóa. Cần xác thực để xem.
                                        </Text>
                                        <Button
                                            type="primary"
                                            icon={<EyeOutlined />}
                                            onClick={() => setIsRevealModalOpen(true)}
                                        >
                                            Hiện mật khẩu
                                        </Button>
                                    </Space>
                                )}
                            </div>
                        ) : (
                            <Text type="secondary">Không có mật khẩu được lưu</Text>
                        )}
                    </>
                )}
            </Drawer>

            {/* Reveal Password Modal */}
            <Modal
                title={
                    <Space>
                        <LockOutlined />
                        Xác thực để hiện mật khẩu
                    </Space>
                }
                open={isRevealModalOpen}
                onCancel={() => {
                    setIsRevealModalOpen(false);
                    setRevealPassword('');
                }}
                onOk={handleRevealPassword}
                okText="Xác thực"
                cancelText="Hủy"
                confirmLoading={revealLoading}
            >
                <Alert
                    message="Bảo mật"
                    description="Vui lòng nhập mật khẩu của bạn để xác thực danh tính."
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
                <Input.Password
                    placeholder="Nhập mật khẩu của bạn"
                    value={revealPassword}
                    onChange={(e) => setRevealPassword(e.target.value)}
                    onPressEnter={handleRevealPassword}
                />
            </Modal>

            {/* Export Modal */}
            <Modal
                title={
                    <Space>
                        <DownloadOutlined />
                        Xuất tài khoản ra CSV
                    </Space>
                }
                open={isExportModalOpen}
                onCancel={() => {
                    setIsExportModalOpen(false);
                    setExportPassword('');
                }}
                onOk={handleExport}
                okText="Xuất file"
                cancelText="Hủy"
                confirmLoading={exportLoading}
            >
                <Alert
                    message="Bảo mật"
                    description="File CSV sẽ chứa mật khẩu đã giải mã. Vui lòng xác thực để tiếp tục."
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
                <Input.Password
                    placeholder="Nhập mật khẩu của bạn để xác thực"
                    value={exportPassword}
                    onChange={(e) => setExportPassword(e.target.value)}
                    onPressEnter={handleExport}
                />
            </Modal>

            {/* Import Modal */}
            <Modal
                title={
                    <Space>
                        <UploadOutlined />
                        Nhập tài khoản từ CSV
                    </Space>
                }
                open={isImportModalOpen}
                onCancel={() => {
                    setIsImportModalOpen(false);
                    setImportData([]);
                }}
                onOk={handleImport}
                okText={`Nhập ${importData.length} tài khoản`}
                cancelText="Hủy"
                confirmLoading={importLoading}
                okButtonProps={{ disabled: importData.length === 0 }}
                width={700}
            >
                <Alert
                    message="Hướng dẫn"
                    description={
                        <div>
                            <p>1. Tải file template CSV và điền thông tin tài khoản</p>
                            <p>2. Upload file CSV đã điền</p>
                            <p>3. Kiểm tra dữ liệu và nhấn "Nhập"</p>
                            <Button
                                type="link"
                                icon={<DownloadOutlined />}
                                onClick={handleDownloadTemplate}
                                style={{ padding: 0 }}
                            >
                                Tải file template
                            </Button>
                        </div>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <Upload.Dragger
                    accept=".csv"
                    beforeUpload={handleImportFile}
                    showUploadList={false}
                    style={{ marginBottom: 16 }}
                >
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">Kéo thả file CSV vào đây</p>
                    <p className="ant-upload-hint">Hoặc click để chọn file</p>
                </Upload.Dragger>

                {importData.length > 0 && (
                    <>
                        <Divider>Preview ({importData.length} tài khoản)</Divider>
                        <Table
                            dataSource={importData.slice(0, 5)}
                            columns={[
                                { title: 'Tên hệ thống', dataIndex: 'system_name', key: 'system_name', ellipsis: true },
                                { title: 'Loại', dataIndex: 'system_type', key: 'system_type', width: 100 },
                                { title: 'Username', dataIndex: 'username', key: 'username', ellipsis: true },
                                { title: 'Môi trường', dataIndex: 'environment', key: 'environment', width: 100 },
                            ]}
                            rowKey={(_, index) => index}
                            size="small"
                            pagination={false}
                        />
                        {importData.length > 5 && (
                            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 8 }}>
                                ... và {importData.length - 5} tài khoản khác
                            </Text>
                        )}
                    </>
                )}
            </Modal>
        </div>
    );
};

export default AccountsPage;
