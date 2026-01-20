import { useState, useEffect } from 'react';
import {
    Card, Table, Button, Input, Select, Space, Tag, Modal, Form,
    Row, Col, Typography, message, Popconfirm, Tooltip, Badge, Drawer,
    Descriptions, Tabs, Empty, Alert, Progress, Spin,
} from 'antd';
import {
    PlusOutlined, SearchOutlined, FilterOutlined, ReloadOutlined,
    EditOutlined, DeleteOutlined, EyeOutlined, ExportOutlined,
    CheckCircleOutlined, ClockCircleOutlined, WarningOutlined,
    DownloadOutlined, UploadOutlined, LockOutlined, EyeInvisibleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { deviceService } from '../services/deviceService';
import { accountService } from '../services/accountService';
import { pingService } from '../services/pingService';
import { useAuth } from '../contexts/AuthContext';
import PingStatusDot from '../components/PingStatusDot';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const DevicesPage = () => {
    const { canEdit } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [form] = Form.useForm();

    // State
    const [filters, setFilters] = useState({
        page: 1,
        limit: 20,
        search: '',
        type: undefined,
        status: undefined,
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState(null);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [importProgress, setImportProgress] = useState({ status: '', percent: 0, total: 0 });
    const [ipPingStatus, setIpPingStatus] = useState({});
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    // Password reveal state
    const [isRevealModalOpen, setIsRevealModalOpen] = useState(false);
    const [revealPassword, setRevealPassword] = useState('');
    const [revealedPasswords, setRevealedPasswords] = useState({});
    const [revealingAccountId, setRevealingAccountId] = useState(null);
    const [revealLoading, setRevealLoading] = useState(false);

    // Queries
    const { data: devicesData, isLoading, refetch } = useQuery({
        queryKey: ['devices', filters],
        queryFn: () => deviceService.getDevices(filters),
    });

    const { data: typesData } = useQuery({
        queryKey: ['deviceTypes'],
        queryFn: deviceService.getDeviceTypes,
    });

    const { data: statusesData } = useQuery({
        queryKey: ['deviceStatuses'],
        queryFn: deviceService.getDeviceStatuses,
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: deviceService.createDevice,
        onSuccess: () => {
            message.success('Thêm thiết bị thành công!');
            queryClient.invalidateQueries(['devices']);
            handleCloseModal();
        },
        onError: (error) => {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => deviceService.updateDevice(id, data),
        onSuccess: () => {
            message.success('Cập nhật thiết bị thành công!');
            queryClient.invalidateQueries(['devices']);
            handleCloseModal();
        },
        onError: (error) => {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deviceService.deleteDevice,
        onSuccess: () => {
            message.success('Xóa thiết bị thành công!');
            queryClient.invalidateQueries(['devices']);
        },
        onError: (error) => {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: (ids) => deviceService.bulkDelete(ids),
        onSuccess: (data) => {
            message.success(`Đã xóa ${data.deleted || selectedRowKeys.length} thiết bị!`);
            setSelectedRowKeys([]);
            queryClient.invalidateQueries(['devices']);
        },
        onError: (error) => {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        },
    });

    const devices = devicesData?.data || [];
    const pagination = devicesData?.pagination || {};
    const types = typesData?.data || [];
    const statuses = statusesData?.data || [];

    // Fetch ping status for all IPs and auto-refresh every 30s
    useEffect(() => {
        const fetchPingStatus = async () => {
            try {
                const result = await pingService.getAllLatestStatus();
                if (result.success) {
                    setIpPingStatus(result.data);
                }
            } catch (error) {
                console.error('Failed to fetch ping status:', error);
            }
        };

        fetchPingStatus();
        const interval = setInterval(fetchPingStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    // Handlers
    const handleSearch = (value) => {
        setFilters((prev) => ({ ...prev, search: value, page: 1 }));
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

    const handleOpenModal = (device = null) => {
        setEditingDevice(device);
        if (device) {
            form.setFieldsValue({
                ...device,
                purchase_date: device.purchase_date ? dayjs(device.purchase_date) : null,
                warranty_expiry: device.warranty_expiry ? dayjs(device.warranty_expiry) : null,
            });
        } else {
            form.resetFields();
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingDevice(null);
        form.resetFields();
    };

    const handleSubmit = async (values) => {
        const data = {
            ...values,
            purchase_date: values.purchase_date?.format('YYYY-MM-DD'),
            warranty_expiry: values.warranty_expiry?.format('YYYY-MM-DD'),
        };

        if (editingDevice) {
            updateMutation.mutate({ id: editingDevice.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDelete = (id) => {
        deleteMutation.mutate(id);
    };

    const handleViewDevice = async (device) => {
        try {
            const result = await deviceService.getDevice(device.id);
            if (result.success) {
                setSelectedDevice(result.data);
                setRevealedPasswords({}); // Reset revealed passwords
                setIsDrawerOpen(true);
            }
        } catch (error) {
            message.error('Không thể tải thông tin thiết bị');
        }
    };

    // Handle reveal password with admin verification
    const handleRevealPassword = async () => {
        if (!revealPassword) {
            message.error('Vui lòng nhập mật khẩu xác thực');
            return;
        }

        setRevealLoading(true);
        try {
            const result = await accountService.revealPassword(revealingAccountId, revealPassword);
            setRevealedPasswords(prev => ({
                ...prev,
                [revealingAccountId]: result.data.password,
            }));
            setIsRevealModalOpen(false);
            setRevealPassword('');
            setRevealingAccountId(null);
            message.success('Xác thực thành công!');
        } catch (error) {
            message.error(error.response?.data?.message || 'Xác thực thất bại');
        } finally {
            setRevealLoading(false);
        }
    };

    // Export handlers
    const handleExportCSV = async () => {
        try {
            await deviceService.exportCSV();
            message.success('Xuất file CSV thành công!');
        } catch (error) {
            message.error('Không thể xuất file CSV');
        }
    };

    // Import handlers
    const handleImportCSV = async (file) => {
        setImportLoading(true);
        setImportProgress({ status: 'Đang đọc file...', percent: 10, total: 0 });

        try {
            // Read file content
            const text = await file.text();

            setImportProgress({ status: 'Đang phân tích dữ liệu CSV...', percent: 20, total: 0 });

            // Use PapaParse for robust CSV parsing
            const Papa = (await import('papaparse')).default;

            const parsed = Papa.parse(text, {
                header: true,           // First row is headers
                skipEmptyLines: true,   // Skip empty rows
                transformHeader: (h) => h.trim().toLowerCase(),  // Normalize headers
            });

            if (parsed.errors.length > 0) {
                console.error('CSV Parse Errors:', parsed.errors);
            }

            if (!parsed.data || parsed.data.length === 0) {
                message.error('Không tìm thấy dữ liệu trong file');
                return false;
            }

            setImportProgress({ status: `Đang xử lý ${parsed.data.length} dòng dữ liệu...`, percent: 40, total: parsed.data.length });

            // Map headers to expected field names
            const headerMap = {
                'name': 'name',
                'type': 'type',
                'hostname': 'hostname',
                'mac address': 'mac_address',
                'ip address': 'ip_addresses',
                'ip addresses': 'ip_addresses',
                'ip': 'ip_addresses',
                'manufacturer': 'manufacturer',
                'model': 'model',
                'serial number': 'serial_number',
                'serial numb': 'serial_number',
                'status': 'status',
                'department': 'department',
                'location': 'location',
                'assigned user': 'assigned_user',
                'notes': 'notes',
            };

            // Transform parsed data to use our field names
            const devices = parsed.data.map(row => {
                const device = {};
                Object.keys(row).forEach(key => {
                    const normalizedKey = key.trim().toLowerCase();
                    const fieldName = headerMap[normalizedKey] || normalizedKey.replace(/\s+/g, '_');
                    const value = row[key]?.trim() || '';
                    if (value) device[fieldName] = value;
                });
                return device;
            });

            console.log('Parsed devices:', devices);  // Debug log

            if (devices.length === 0) {
                message.error('Không tìm thấy dữ liệu trong file');
                return false;
            }

            setImportProgress({ status: `Đang gửi ${devices.length} thiết bị lên server...`, percent: 60, total: devices.length });

            const result = await deviceService.importCSV(devices);

            setImportProgress({ status: 'Hoàn tất!', percent: 100, total: devices.length });
            message.success(result.message || `Import thành công ${result.data.success} thiết bị!`);
            setIsImportModalOpen(false);
            queryClient.invalidateQueries(['devices']);
        } catch (error) {
            const errorData = error.response?.data;

            // Check if this is a validation error with detailed errors array
            if (errorData?.errors && Array.isArray(errorData.errors)) {
                Modal.error({
                    title: `Lỗi xác thực dữ liệu (${errorData.errorCount}/${errorData.totalRows} dòng lỗi)`,
                    width: 600,
                    content: (
                        <div style={{ maxHeight: 400, overflow: 'auto' }}>
                            <Alert
                                message="Vui lòng sửa các lỗi sau trong file CSV và thử lại"
                                type="warning"
                                showIcon
                                style={{ marginBottom: 16 }}
                            />
                            {errorData.errors.map((err, idx) => (
                                <div key={idx} style={{ marginBottom: 12, padding: '8px 12px', background: '#fff2f0', borderRadius: 4, border: '1px solid #ffccc7' }}>
                                    <Text strong>Dòng {err.row}: {err.name}</Text>
                                    <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0 }}>
                                        {err.errors.map((e, i) => (
                                            <li key={i} style={{ color: '#cf1322' }}>{e}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ),
                });
            } else {
                message.error('Lỗi import: ' + (errorData?.message || error.message));
            }
        } finally {
            setImportLoading(false);
        }

        return false; // Prevent default upload behavior
    };

    const downloadTemplate = () => {
        const headers = 'Name,Type,Hostname,IP Address,MAC Address,Manufacturer,Model,Serial Number,Status,Department,Location,Assigned User,Notes';
        const sample = '"PC-KeToan-01","pc","PC-KETOAN-01","192.168.1.100","AA:BB:CC:DD:EE:FF","Dell","OptiPlex 7080","ABC123","active","Kế toán","Tầng 1","Nguyễn Văn A",""';
        const csvContent = '\uFEFF' + headers + '\n' + sample;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'devices_template.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    // Table columns
    const getStatusTag = (status) => {
        const config = statuses.find((s) => s.value === status);
        return (
            <Tag color={config?.color || 'default'}>
                {status?.toUpperCase()}
            </Tag>
        );
    };

    const getTypeIcon = (type) => {
        const typeInfo = types.find((t) => t.value === type);
        return typeInfo?.icon || '📦';
    };

    const columns = [
        {
            title: t('devices.deviceName'),
            dataIndex: 'name',
            key: 'name',
            fixed: 'left',
            width: 250,
            render: (text, record) => (
                <Space>
                    <span style={{ fontSize: 20 }}>{getTypeIcon(record.type)}</span>
                    <div>
                        <div style={{ fontWeight: 600 }}>{text}</div>
                        {record.hostname && (
                            <Text type="secondary" style={{ fontSize: 12 }}>{record.hostname}</Text>
                        )}
                    </div>
                </Space>
            ),
        },
        {
            title: t('common.type'),
            dataIndex: 'type',
            key: 'type',
            width: 120,
            render: (type) => {
                const typeInfo = types.find((t) => t.value === type);
                return typeInfo?.label || type;
            },
        },
        {
            title: 'IP',
            dataIndex: 'ipAddresses',
            key: 'ip',
            width: 180,
            render: (ips) => {
                if (!ips || ips.length === 0) return <Text type="secondary">-</Text>;
                return (
                    <Space direction="vertical" size={0}>
                        {ips.slice(0, 2).map((ip) => (
                            <Space key={ip.id} size={4}>
                                <PingStatusDot
                                    status={ipPingStatus[ip.ip_address]?.status || 'unknown'}
                                    responseTime={ipPingStatus[ip.ip_address]?.responseTime}
                                    size="small"
                                />
                                <Text code style={{ fontSize: 12 }}>{ip.ip_address}</Text>
                            </Space>
                        ))}
                        {ips.length > 2 && (
                            <Text type="secondary" style={{ fontSize: 11 }}>+{ips.length - 2} more</Text>
                        )}
                    </Space>
                );
            },
        },
        {
            title: t('devices.location'),
            dataIndex: 'location',
            key: 'location',
            width: 150,
            ellipsis: true,
            render: (text) => text || <Text type="secondary">-</Text>,
        },
        {
            title: t('devices.assignedTo'),
            dataIndex: 'assigned_user',
            key: 'assigned_user',
            width: 150,
            ellipsis: true,
            render: (text) => text || <Text type="secondary">-</Text>,
        },
        {
            title: t('common.status'),
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status) => getStatusTag(status),
        },
        {
            title: t('common.actions'),
            key: 'actions',
            fixed: 'right',
            width: 130,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title={t('common.view')}>
                        <Button
                            type="text"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewDevice(record)}
                        />
                    </Tooltip>
                    {canEdit && (
                        <>
                            <Tooltip title={t('common.edit')}>
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => handleOpenModal(record)}
                                />
                            </Tooltip>
                            <Popconfirm
                                title={t('common.confirmDelete')}
                                description={t('devices.confirmDeleteDevice')}
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
                        </>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div className="devices-page">
            <div className="page-header">
                <div>
                    <Title level={3}>{t('devices.title')}</Title>
                    <Text type="secondary">{t('devices.subtitle')}</Text>
                </div>
                <Space>
                    <Tooltip title={t('common.export')}>
                        <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>
                            Export
                        </Button>
                    </Tooltip>
                    {canEdit && (
                        <>
                            <Tooltip title="Import CSV">
                                <Button icon={<UploadOutlined />} onClick={() => setIsImportModalOpen(true)}>
                                    Import
                                </Button>
                            </Tooltip>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
                                {t('devices.addDevice')}
                            </Button>
                        </>
                    )}
                </Space>
            </div>

            <Card bordered={false} className="filter-card">
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <Input.Search
                            placeholder={t('devices.searchPlaceholder')}
                            onSearch={handleSearch}
                            allowClear
                            prefix={<SearchOutlined />}
                        />
                    </Col>
                    <Col xs={12} sm={6} md={4} lg={3}>
                        <Select
                            placeholder={t('devices.deviceType')}
                            allowClear
                            style={{ width: '100%' }}
                            value={filters.type}
                            onChange={(value) => handleFilterChange('type', value)}
                        >
                            {types.map((type) => (
                                <Option key={type.value} value={type.value}>
                                    {type.icon} {type.label}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={12} sm={6} md={4} lg={3}>
                        <Select
                            placeholder={t('common.status')}
                            allowClear
                            style={{ width: '100%' }}
                            value={filters.status}
                            onChange={(value) => handleFilterChange('status', value)}
                        >
                            {statuses.map((status) => (
                                <Option key={status.value} value={status.value}>
                                    {status.label}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col>
                        <Tooltip title={t('common.refresh')}>
                            <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
                        </Tooltip>
                    </Col>
                </Row>
            </Card>

            <Card bordered={false} className="table-card">
                {selectedRowKeys.length > 0 && (
                    <div style={{ marginBottom: 16, padding: '12px 16px', background: '#1890ff10', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text>{t('common.selected')} <Text strong>{selectedRowKeys.length}</Text> {t('devices.items')}</Text>
                        <Space>
                            <Button size="small" onClick={() => setSelectedRowKeys([])}>{t('common.deselect')}</Button>
                            <Popconfirm
                                title={t('devices.bulkDelete')}
                                description={t('devices.confirmBulkDelete', { count: selectedRowKeys.length })}
                                onConfirm={() => bulkDeleteMutation.mutate(selectedRowKeys)}
                                okText={t('common.delete')}
                                cancelText={t('common.cancel')}
                                okButtonProps={{ danger: true, loading: bulkDeleteMutation.isPending }}
                            >
                                <Button danger size="small" icon={<DeleteOutlined />}>
                                    {t('devices.bulkDelete')}
                                </Button>
                            </Popconfirm>
                        </Space>
                    </div>
                )}
                <Table
                    columns={columns}
                    dataSource={devices}
                    rowKey="id"
                    loading={isLoading}
                    scroll={{ x: 1100 }}
                    rowSelection={canEdit ? {
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                    } : undefined}
                    pagination={{
                        current: pagination.page,
                        pageSize: pagination.limit,
                        total: pagination.total,
                        showSizeChanger: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} ${t('common.of')} ${total}`,
                    }}
                    onChange={handleTableChange}
                />
            </Card>

            {/* Add/Edit Modal */}
            <Modal
                title={editingDevice ? t('devices.editDevice') : t('devices.addDevice')}
                open={isModalOpen}
                onCancel={handleCloseModal}
                footer={null}
                width={720}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    initialValues={{ status: 'active' }}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="name"
                                label={t('devices.deviceName')}
                                rules={[{ required: true, message: t('validation.deviceNameRequired') }]}
                            >
                                <Input placeholder="VD: PC-KeToan-01" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="type"
                                label={t('devices.deviceType')}
                                rules={[{ required: true, message: t('validation.deviceTypeRequired') }]}
                            >
                                <Select placeholder={t('common.selectPlaceholder')}>
                                    {types.map((type) => (
                                        <Option key={type.value} value={type.value}>
                                            {type.icon} {type.label}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="hostname" label={t('devices.hostname')}>
                                <Input placeholder="VD: PC-KETOAN-01" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="mac_address" label={t('devices.macAddress')}>
                                <Input placeholder="VD: AA:BB:CC:DD:EE:FF" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="manufacturer" label={t('devices.manufacturer')}>
                                <Input placeholder="VD: Dell, HP, Cisco" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="model" label={t('devices.model')}>
                                <Input placeholder="VD: OptiPlex 7080" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="serial_number" label={t('devices.serialNumber')}>
                                <Input placeholder="VD: ABC123XYZ" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="status" label={t('common.status')}>
                                <Select>
                                    {statuses.map((status) => (
                                        <Option key={status.value} value={status.value}>
                                            {status.label}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="location" label={t('devices.location')}>
                                <Input placeholder="VD: Tầng 1, Phòng IT" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="department" label={t('devices.department')}>
                                <Input placeholder="VD: Phòng Kế toán" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="assigned_user" label={t('devices.assignedUser')}>
                                <Input placeholder="VD: Nguyễn Văn A" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="notes" label={t('common.notes')}>
                        <Input.TextArea rows={3} placeholder={t('devices.notesPlaceholder')} />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={handleCloseModal}>{t('common.cancel')}</Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={createMutation.isPending || updateMutation.isPending}
                            >
                                {editingDevice ? t('common.update') : t('common.addNew')}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Device Detail Drawer */}
            <Drawer
                title={t('devices.deviceDetails')}
                placement="right"
                width={600}
                onClose={() => setIsDrawerOpen(false)}
                open={isDrawerOpen}
            >
                {selectedDevice && (
                    <Tabs
                        items={[
                            {
                                key: 'info',
                                label: t('devices.generalInfo'),
                                children: (
                                    <Descriptions column={1} bordered size="small">
                                        <Descriptions.Item label={t('common.name')}>{selectedDevice.name}</Descriptions.Item>
                                        <Descriptions.Item label={t('common.type')}>
                                            {getTypeIcon(selectedDevice.type)} {selectedDevice.type}
                                        </Descriptions.Item>
                                        <Descriptions.Item label={t('common.status')}>
                                            {getStatusTag(selectedDevice.status)}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Hostname">{selectedDevice.hostname || '-'}</Descriptions.Item>
                                        <Descriptions.Item label="MAC Address">{selectedDevice.mac_address || '-'}</Descriptions.Item>
                                        <Descriptions.Item label={t('devices.manufacturer')}>{selectedDevice.manufacturer || '-'}</Descriptions.Item>
                                        <Descriptions.Item label="Model">{selectedDevice.model || '-'}</Descriptions.Item>
                                        <Descriptions.Item label="Serial">{selectedDevice.serial_number || '-'}</Descriptions.Item>
                                        <Descriptions.Item label={t('devices.location')}>{selectedDevice.location || '-'}</Descriptions.Item>
                                        <Descriptions.Item label={t('devices.department')}>{selectedDevice.department || '-'}</Descriptions.Item>
                                        <Descriptions.Item label={t('devices.assignedUser')}>{selectedDevice.assigned_user || '-'}</Descriptions.Item>
                                        <Descriptions.Item label={t('common.notes')}>{selectedDevice.notes || '-'}</Descriptions.Item>
                                    </Descriptions>
                                ),
                            },
                            {
                                key: 'network',
                                label: 'IP & Network',
                                children: (
                                    <>
                                        {selectedDevice.ipAddresses?.length > 0 ? (
                                            <Table
                                                dataSource={selectedDevice.ipAddresses}
                                                rowKey="id"
                                                size="small"
                                                pagination={false}
                                                columns={[
                                                    { title: 'IP', dataIndex: 'ip_address', key: 'ip' },
                                                    {
                                                        title: 'VLAN',
                                                        dataIndex: ['segment', 'name'],
                                                        key: 'vlan',
                                                        render: (_, record) => record.segment?.name || '-',
                                                    },
                                                    { title: 'Hostname', dataIndex: 'hostname', key: 'hostname' },
                                                    {
                                                        title: t('common.status'),
                                                        dataIndex: 'status',
                                                        key: 'status',
                                                        render: (status) => <Tag color="blue">{status}</Tag>,
                                                    },
                                                ]}
                                            />
                                        ) : (
                                            <Empty description={t('devices.noIPAssigned')} />
                                        )}
                                    </>
                                ),
                            },
                            {
                                key: 'accounts',
                                label: t('devices.adminAccounts'),
                                children: (
                                    <>
                                        {selectedDevice.adminAccounts?.length > 0 ? (
                                            <Table
                                                dataSource={selectedDevice.adminAccounts}
                                                rowKey="id"
                                                size="small"
                                                pagination={false}
                                                columns={[
                                                    { title: t('common.name'), dataIndex: 'system_name', key: 'name' },
                                                    { title: t('accounts.systemType'), dataIndex: 'system_type', key: 'system' },
                                                    { title: 'Username', dataIndex: 'username', key: 'username' },
                                                    {
                                                        title: 'Password',
                                                        key: 'password',
                                                        width: 180,
                                                        render: (_, record) => {
                                                            if (!record.encrypted_password) {
                                                                return <Text type="secondary">-</Text>;
                                                            }
                                                            if (revealedPasswords[record.id]) {
                                                                return (
                                                                    <Space>
                                                                        <Text code copyable={{ text: revealedPasswords[record.id] }}>
                                                                            {revealedPasswords[record.id]}
                                                                        </Text>
                                                                        <Tooltip title="Ẩn mật khẩu">
                                                                            <Button
                                                                                type="text"
                                                                                size="small"
                                                                                icon={<EyeInvisibleOutlined />}
                                                                                onClick={() => setRevealedPasswords(prev => {
                                                                                    const next = { ...prev };
                                                                                    delete next[record.id];
                                                                                    return next;
                                                                                })}
                                                                            />
                                                                        </Tooltip>
                                                                    </Space>
                                                                );
                                                            }
                                                            return (
                                                                <Tooltip title="Xác thực để xem">
                                                                    <Button
                                                                        type="link"
                                                                        size="small"
                                                                        icon={<LockOutlined />}
                                                                        onClick={() => {
                                                                            setRevealingAccountId(record.id);
                                                                            setIsRevealModalOpen(true);
                                                                        }}
                                                                    >
                                                                        Hiện
                                                                    </Button>
                                                                </Tooltip>
                                                            );
                                                        },
                                                    },
                                                ]}
                                            />
                                        ) : (
                                            <Empty description="Chưa có tài khoản admin liên quan" />
                                        )}
                                    </>
                                ),
                            },
                        ]}
                    />
                )}
            </Drawer>

            {/* Import Modal */}
            <Modal
                title="Import thiết bị từ CSV"
                open={isImportModalOpen}
                onCancel={() => setIsImportModalOpen(false)}
                footer={null}
                width={500}
            >
                <div style={{ marginBottom: 16 }}>
                    <Text>Tải lên file CSV với các cột: Name, Type, Hostname, MAC Address, v.v.</Text>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <Button type="link" onClick={downloadTemplate} style={{ padding: 0 }}>
                        <DownloadOutlined /> Tải template mẫu
                    </Button>
                </div>

                <div style={{ border: '1px dashed #d9d9d9', borderRadius: 8, padding: 32, textAlign: 'center' }}>
                    <input
                        type="file"
                        accept=".csv"
                        style={{ display: 'none' }}
                        id="csv-upload"
                        onChange={(e) => {
                            if (e.target.files[0]) {
                                handleImportCSV(e.target.files[0]);
                            }
                        }}
                    />
                    <label htmlFor="csv-upload" style={{ cursor: 'pointer' }}>
                        <UploadOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                        <div style={{ marginTop: 8 }}>Click để chọn file CSV</div>
                    </label>
                </div>

                {importLoading && (
                    <div style={{ marginTop: 16 }}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Spin size="small" />
                                <Text>{importProgress.status || 'Đang xử lý...'}</Text>
                            </div>
                            {importProgress.total > 0 && (
                                <Progress
                                    percent={importProgress.percent}
                                    status="active"
                                    format={() => `${importProgress.total} dòng`}
                                />
                            )}
                        </Space>
                    </div>
                )}
            </Modal>

            {/* Password Reveal Modal */}
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
                    setRevealingAccountId(null);
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
        </div>
    );
};

export default DevicesPage;
