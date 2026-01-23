import { useState, useEffect, useRef } from 'react';
import {
    Card, Table, Button, Input, Select, Space, Tag, Modal, Form,
    Row, Col, Typography, message, Popconfirm, Tooltip, Progress,
    List, Badge, Drawer, Descriptions, Empty, Divider, Spin, Alert,
} from 'antd';
import {
    PlusOutlined, SearchOutlined, ReloadOutlined, EditOutlined,
    DeleteOutlined, GlobalOutlined, WifiOutlined, LinkOutlined,
    DisconnectOutlined, CheckCircleOutlined, CloseCircleOutlined,
    ExclamationCircleOutlined, LockOutlined, PlayCircleOutlined,
    PauseCircleOutlined, RadarChartOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { segmentService } from '../services/segmentService';
import { ipService } from '../services/ipService';
import { deviceService } from '../services/deviceService';
import { pingService } from '../services/pingService';
import { useAuth } from '../contexts/AuthContext';
import PingStatusDot from '../components/PingStatusDot';

const { Title, Text } = Typography;
const { Option } = Select;

const IpMapPage = () => {
    const { canEdit } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [assignForm] = Form.useForm();

    // State
    const [selectedSegment, setSelectedSegment] = useState(null);
    const [isSegmentModalOpen, setIsSegmentModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [editingSegment, setEditingSegment] = useState(null);
    const [selectedIp, setSelectedIp] = useState(null);
    const [ipFilters, setIpFilters] = useState({
        page: 1,
        limit: 20,
        status: undefined,
        search: '',
        pingStatus: undefined,
    });

    // Ping state
    const [isPinging, setIsPinging] = useState(false);
    const [pingStatus, setPingStatus] = useState({});
    const [pingStats, setPingStats] = useState(null);
    const pingIntervalRef = useRef(null);

    // Refs for continuous ping control
    const shouldPingRef = useRef(false);
    const currentSegmentIdRef = useRef(null);

    // Queries
    const { data: segmentsData, isLoading: segmentsLoading, refetch: refetchSegments } = useQuery({
        queryKey: ['segments'],
        queryFn: segmentService.getSegments,
    });

    // When pingStatus filter is active, load ALL IPs for client-side filtering/pagination
    const { data: ipsData, isLoading: ipsLoading, refetch: refetchIps } = useQuery({
        queryKey: ['ips', selectedSegment?.id, ipFilters],
        queryFn: () => ipService.getIpAddresses({
            segment_id: selectedSegment?.id,
            // If pingStatus filter is active, load all IPs for client-side pagination
            ...(ipFilters.pingStatus ? { limit: 1000 } : ipFilters),
        }),
        enabled: !!selectedSegment,
    });

    const { data: devicesData } = useQuery({
        queryKey: ['allDevices'],
        queryFn: () => deviceService.getDevices({ limit: 1000 }),
    });

    const { data: ipStatusesData } = useQuery({
        queryKey: ['ipStatuses'],
        queryFn: ipService.getIpStatuses,
    });

    // Mutations
    const createSegmentMutation = useMutation({
        mutationFn: segmentService.createSegment,
        onSuccess: (data) => {
            message.success(data.message || 'Tạo dải mạng thành công!');
            queryClient.invalidateQueries(['segments']);
            handleCloseSegmentModal();
        },
        onError: (error) => {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        },
    });

    const updateSegmentMutation = useMutation({
        mutationFn: ({ id, data }) => segmentService.updateSegment(id, data),
        onSuccess: () => {
            message.success('Cập nhật dải mạng thành công!');
            queryClient.invalidateQueries(['segments']);
            handleCloseSegmentModal();
        },
        onError: (error) => {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        },
    });

    const deleteSegmentMutation = useMutation({
        mutationFn: segmentService.deleteSegment,
        onSuccess: () => {
            message.success('Xóa dải mạng thành công!');
            queryClient.invalidateQueries(['segments']);
            if (selectedSegment?.id === editingSegment?.id) {
                setSelectedSegment(null);
            }
        },
        onError: (error) => {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        },
    });

    const assignIpMutation = useMutation({
        mutationFn: ({ ipId, data }) => ipService.assignIpToDevice(ipId, data),
        onSuccess: () => {
            message.success('Gán IP thành công!');
            queryClient.invalidateQueries(['ips']);
            queryClient.invalidateQueries(['segments']);
            setIsAssignModalOpen(false);
            assignForm.resetFields();
        },
        onError: (error) => {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        },
    });

    const releaseIpMutation = useMutation({
        mutationFn: ipService.releaseIp,
        onSuccess: () => {
            message.success('Giải phóng IP thành công!');
            queryClient.invalidateQueries(['ips']);
            queryClient.invalidateQueries(['segments']);
        },
        onError: (error) => {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        },
    });

    const updateIpMutation = useMutation({
        mutationFn: ({ id, data }) => ipService.updateIpAddress(id, data),
        onSuccess: () => {
            message.success('Cập nhật IP thành công!');
            queryClient.invalidateQueries(['ips']);
            queryClient.invalidateQueries(['segments']);
        },
        onError: (error) => {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        },
    });

    const segments = segmentsData?.data || [];
    const rawIps = ipsData?.data || [];
    const pagination = ipsData?.pagination || {};
    const devices = devicesData?.data || [];
    const ipStatuses = ipStatusesData?.data || [];

    // Filter IPs by ping status (client-side filtering)
    const filteredByPingStatus = ipFilters.pingStatus
        ? rawIps.filter(ip => {
            const ping = pingStatus[ip.ip_address];

            // Special case: unregistered filter (IP free but online)
            if (ipFilters.pingStatus === 'unregistered') {
                const isOnline = ping && (ping.status === 'online' || ping.status === 'blocked');
                const isFreeOrUnassigned = ip.status === 'free' && !ip.device_id;
                return isOnline && isFreeOrUnassigned;
            }

            if (!ping) return ipFilters.pingStatus === 'unknown';
            return ping.status === ipFilters.pingStatus;
        })
        : rawIps;

    // When pingStatus filter is active, apply client-side pagination
    const ips = ipFilters.pingStatus
        ? filteredByPingStatus.slice(
            (ipFilters.page - 1) * ipFilters.limit,
            ipFilters.page * ipFilters.limit
        )
        : filteredByPingStatus;

    // Calculate pagination info (client-side when pingStatus filter active)
    const effectivePagination = ipFilters.pingStatus
        ? {
            page: ipFilters.page,
            limit: ipFilters.limit,
            total: filteredByPingStatus.length,
            totalPages: Math.ceil(filteredByPingStatus.length / ipFilters.limit),
        }
        : pagination;

    // Calculate unregistered devices count (IP free but online)
    const unregisteredDevices = rawIps.filter(ip => {
        const ping = pingStatus[ip.ip_address];
        const isOnline = ping && (ping.status === 'online' || ping.status === 'blocked');
        const isFreeOrUnassigned = ip.status === 'free' && !ip.device_id;
        return isOnline && isFreeOrUnassigned;
    });

    // Auto-select first segment
    useEffect(() => {
        if (segments.length > 0 && !selectedSegment) {
            setSelectedSegment(segments[0]);
        }
    }, [segments, selectedSegment]);

    // Handlers
    const handleOpenSegmentModal = (segment = null) => {
        setEditingSegment(segment);
        if (segment) {
            form.setFieldsValue(segment);
        } else {
            form.resetFields();
        }
        setIsSegmentModalOpen(true);
    };

    const handleCloseSegmentModal = () => {
        setIsSegmentModalOpen(false);
        setEditingSegment(null);
        form.resetFields();
    };

    const handleSubmitSegment = async (values) => {
        if (editingSegment) {
            updateSegmentMutation.mutate({ id: editingSegment.id, data: values });
        } else {
            createSegmentMutation.mutate(values);
        }
    };

    const handleDeleteSegment = (id) => {
        deleteSegmentMutation.mutate(id);
    };

    const handleSelectSegment = (segment) => {
        // Stop previous ping when changing segment (use ref directly to avoid hoisting issue)
        shouldPingRef.current = false;
        currentSegmentIdRef.current = null;
        setIsPinging(false);

        setSelectedSegment(segment);
        setPingStats(null);
        setPingStatus({});
        setIpFilters({ page: 1, limit: 20, status: undefined, search: '', pingStatus: undefined });

        // Load cached status in background (non-blocking)
        pingService.getLatestStatus(segment.id)
            .then(result => {
                if (result.success && Object.keys(result.data).length > 0) {
                    setPingStatus(result.data);
                    // Calculate stats from cached data
                    const values = Object.values(result.data);
                    const online = values.filter(v => v.status === 'online').length;
                    const blocked = values.filter(v => v.status === 'blocked').length;
                    const offline = values.filter(v => v.status === 'offline').length;
                    const responseTimes = values.filter(v => v.responseTime).map(v => v.responseTime);
                    const avgTime = responseTimes.length > 0
                        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
                        : 0;
                    setPingStats({ total: values.length, online, blocked, offline, avgResponseTime: avgTime });
                }
            })
            .catch(err => console.error('Load cached status error:', err));
    };

    // Continuous ping loop - runs immediately after previous ping completes
    const startContinuousPing = (segmentId) => {
        shouldPingRef.current = true;
        currentSegmentIdRef.current = segmentId;
        setIsPinging(true);
        runPingLoop(segmentId);
    };

    const stopContinuousPing = () => {
        shouldPingRef.current = false;
        setIsPinging(false);
    };

    const runPingLoop = async (segmentId) => {
        // Check if we should continue pinging
        if (!shouldPingRef.current || currentSegmentIdRef.current !== segmentId) {
            return;
        }

        try {
            const result = await pingService.pingSegment(segmentId);
            if (result.success && shouldPingRef.current && currentSegmentIdRef.current === segmentId) {
                setPingStatus(result.data.results);
                setPingStats(result.data.summary);
            }
        } catch (error) {
            console.error('Ping error:', error);
        }

        // Immediately start next ping cycle (no delay!)
        if (shouldPingRef.current && currentSegmentIdRef.current === segmentId) {
            // Use setTimeout(0) to prevent stack overflow and allow React to process
            setTimeout(() => runPingLoop(segmentId), 0);
        }
    };

    // Auto-start continuous ping when segment changes
    useEffect(() => {
        if (selectedSegment) {
            // Start continuous ping in background
            startContinuousPing(selectedSegment.id);
        }

        return () => stopContinuousPing();
    }, [selectedSegment?.id]);

    // Pause ping when tab is hidden, resume when visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                stopContinuousPing();
            } else if (selectedSegment) {
                startContinuousPing(selectedSegment.id);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [selectedSegment?.id]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopContinuousPing();
        };
    }, []);

    const handleOpenAssignModal = (ip) => {
        setSelectedIp(ip);
        assignForm.setFieldsValue({
            hostname: ip.hostname,
            mac_address: ip.mac_address,
            notes: ip.notes,
        });
        setIsAssignModalOpen(true);
    };

    const handleAssignIp = (values) => {
        assignIpMutation.mutate({ ipId: selectedIp.id, data: values });
    };

    // Auto-fill device info when selecting device
    const handleDeviceSelect = (deviceId) => {
        if (deviceId) {
            const selectedDevice = devices.find((d) => d.id === deviceId);
            if (selectedDevice) {
                assignForm.setFieldsValue({
                    device_id: deviceId,
                    hostname: selectedDevice.hostname || selectedDevice.name,
                    mac_address: selectedDevice.mac_address || assignForm.getFieldValue('mac_address'),
                });
            }
        }
    };

    const handleReleaseIp = (ipId) => {
        releaseIpMutation.mutate(ipId);
    };

    const handleIpFilterChange = (key, value) => {
        setIpFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
    };

    const handleTableChange = (paginationInfo) => {
        setIpFilters((prev) => ({
            ...prev,
            page: paginationInfo.current,
            limit: paginationInfo.pageSize,
        }));
    };

    // Render helpers
    const getStatusIcon = (status) => {
        const icons = {
            free: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
            in_use: <WifiOutlined style={{ color: '#1890ff' }} />,
            reserved: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
            blocked: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
            gateway: <GlobalOutlined style={{ color: '#722ed1' }} />,
        };
        return icons[status] || null;
    };

    const getStatusTag = (status) => {
        const config = ipStatuses.find((s) => s.value === status);
        return (
            <Tag color={config?.color || 'default'} icon={getStatusIcon(status)}>
                {config?.label || status}
            </Tag>
        );
    };

    // IP Table columns
    const ipColumns = [
        {
            title: 'IP',
            dataIndex: 'ip_address',
            key: 'ip_address',
            width: 140,
            sorter: (a, b) => {
                // Sort IP addresses numerically by octets
                const aParts = a.ip_address.split('.').map(Number);
                const bParts = b.ip_address.split('.').map(Number);
                for (let i = 0; i < 4; i++) {
                    if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i];
                }
                return 0;
            },
            defaultSortOrder: 'ascend',
            render: (ip) => <Text code style={{ fontSize: 13 }}>{ip}</Text>,
        },
        {
            title: t('common.status'),
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status) => getStatusTag(status),
        },
        {
            title: 'Online',
            key: 'pingStatus',
            width: 80,
            align: 'center',
            render: (_, record) => {
                const ping = pingStatus[record.ip_address];
                if (!ping) {
                    return <PingStatusDot status="unknown" showTooltip />;
                }
                return (
                    <PingStatusDot
                        status={ping.status}
                        responseTime={ping.responseTime}
                        hasConflict={ping.hasConflict}
                        mac={ping.mac}
                        previousMac={ping.previousMac}
                        showTooltip
                    />
                );
            },
        },
        {
            title: t('devices.deviceName'),
            dataIndex: 'device',
            key: 'device',
            width: 180,
            render: (device) => device ? (
                <Space>
                    <span>{device.type || device.name || '-'}</span>
                </Space>
            ) : <Text type="secondary">-</Text>,
        },
        {
            title: 'Hostname',
            dataIndex: 'hostname',
            key: 'hostname',
            width: 150,
            ellipsis: true,
            render: (text) => text || <Text type="secondary">-</Text>,
        },
        {
            title: 'MAC',
            dataIndex: 'mac_address',
            key: 'mac_address',
            width: 150,
            render: (storedMac, record) => {
                // Prefer MAC from ping status (real-time), fallback to stored MAC
                const ping = pingStatus[record.ip_address];
                const mac = ping?.mac || storedMac;
                return mac ? <Text code style={{ fontSize: 11 }}>{mac}</Text> : <Text type="secondary">-</Text>;
            },
        },
        {
            title: t('ipMap.notes'),
            dataIndex: 'notes',
            key: 'notes',
            ellipsis: true,
            render: (text) => text || <Text type="secondary">-</Text>,
        },
        {
            title: t('common.actions'),
            key: 'actions',
            width: 120,
            fixed: 'right',
            render: (_, record) => {
                if (!canEdit) return null;

                if (record.status === 'free') {
                    return (
                        <Tooltip title={t('ipMap.assignIP')}>
                            <Button
                                type="primary"
                                size="small"
                                icon={<LinkOutlined />}
                                onClick={() => handleOpenAssignModal(record)}
                            />
                        </Tooltip>
                    );
                }

                if (record.status === 'in_use' || record.status === 'reserved') {
                    return (
                        <Space size="small">
                            <Tooltip title={t('common.edit')}>
                                <Button
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => handleOpenAssignModal(record)}
                                />
                            </Tooltip>
                            <Popconfirm
                                title="Giải phóng IP"
                                description="IP và tất cả thông tin liên quan sẽ được xóa"
                                onConfirm={() => handleReleaseIp(record.id)}
                                okText="Xác nhận"
                                cancelText="Hủy"
                            >
                                <Tooltip title="Giải phóng">
                                    <Button
                                        size="small"
                                        danger
                                        icon={<DisconnectOutlined />}
                                    />
                                </Tooltip>
                            </Popconfirm>
                        </Space>
                    );
                }

                if (record.status === 'blocked') {
                    return (
                        <Tooltip title="Mở khóa">
                            <Button
                                size="small"
                                icon={<LockOutlined />}
                                onClick={() => updateIpMutation.mutate({ id: record.id, data: { status: 'free' } })}
                            />
                        </Tooltip>
                    );
                }

                return null;
            },
        },
    ];

    return (
        <div className="ip-map-page">
            <div className="page-header">
                <div>
                    <Title level={3}>{t('ipMap.title')}</Title>
                    <Text type="secondary">{t('ipMap.subtitle')}</Text>
                </div>
                {canEdit && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenSegmentModal()}>
                        {t('ipMap.addSegment')}
                    </Button>
                )}
            </div>

            <Row gutter={24}>
                {/* Segment Sidebar */}
                <Col xs={24} lg={7} xl={6}>
                    <Card
                        title={t('ipMap.networkSegments')}
                        bordered={false}
                        className="segment-sidebar"
                        extra={
                            <Tooltip title={t('common.refresh')}>
                                <Button type="text" size="small" icon={<ReloadOutlined />} onClick={() => refetchSegments()} />
                            </Tooltip>
                        }
                    >
                        {segmentsLoading ? (
                            <div style={{ textAlign: 'center', padding: 40 }}>
                                <Spin />
                            </div>
                        ) : segments.length === 0 ? (
                            <Empty description={t('ipMap.noSegments')} />
                        ) : (
                            <List
                                dataSource={segments}
                                renderItem={(segment) => (
                                    <List.Item
                                        className={`segment-item ${selectedSegment?.id === segment.id ? 'selected' : ''}`}
                                        onClick={() => handleSelectSegment(segment)}
                                    >
                                        <div className="segment-info">
                                            <div className="segment-header">
                                                <Text strong>{segment.name}</Text>
                                                {segment.vlan_id && (
                                                    <Tag color="blue" style={{ marginLeft: 8 }}>VLAN {segment.vlan_id}</Tag>
                                                )}
                                            </div>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{segment.cidr}</Text>
                                            <div className="segment-progress">
                                                <Progress
                                                    percent={segment.stats?.usagePercent || 0}
                                                    size="small"
                                                    strokeColor={{
                                                        '0%': '#52c41a',
                                                        '50%': '#faad14',
                                                        '100%': '#ff4d4f',
                                                    }}
                                                />
                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    {segment.stats?.used || 0} / {segment.stats?.total || 0} sử dụng
                                                </Text>
                                            </div>
                                        </div>
                                        {canEdit && (
                                            <Space className="segment-actions" onClick={(e) => e.stopPropagation()}>
                                                <Tooltip title="Sửa">
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        icon={<EditOutlined />}
                                                        onClick={() => handleOpenSegmentModal(segment)}
                                                    />
                                                </Tooltip>
                                                <Popconfirm
                                                    title="Xóa dải mạng"
                                                    description="Tất cả IP trong dải sẽ bị xóa"
                                                    onConfirm={() => handleDeleteSegment(segment.id)}
                                                    okText="Xóa"
                                                    cancelText="Hủy"
                                                    okButtonProps={{ danger: true }}
                                                >
                                                    <Tooltip title="Xóa">
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            danger
                                                            icon={<DeleteOutlined />}
                                                        />
                                                    </Tooltip>
                                                </Popconfirm>
                                            </Space>
                                        )}
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>
                </Col>

                {/* IP Table */}
                <Col xs={24} lg={17} xl={18}>
                    {selectedSegment ? (
                        <>
                            <Card bordered={false} className="filter-card" style={{ marginBottom: 16 }}>
                                <Row gutter={[16, 16]} align="middle">
                                    <Col xs={24} sm={12} md={8}>
                                        <Input.Search
                                            placeholder="Tìm IP, hostname, MAC..."
                                            onSearch={(value) => handleIpFilterChange('search', value)}
                                            allowClear
                                            prefix={<SearchOutlined />}
                                        />
                                    </Col>
                                    <Col xs={12} sm={6} md={4}>
                                        <Select
                                            placeholder="Trạng thái"
                                            allowClear
                                            style={{ width: '100%' }}
                                            value={ipFilters.status}
                                            onChange={(value) => handleIpFilterChange('status', value)}
                                        >
                                            {ipStatuses.map((status) => (
                                                <Option key={status.value} value={status.value}>
                                                    {status.label}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Col>
                                    <Col xs={12} sm={6} md={4}>
                                        <Select
                                            placeholder="Trạng thái mạng"
                                            allowClear
                                            style={{ width: '100%' }}
                                            value={ipFilters.pingStatus}
                                            onChange={(value) => handleIpFilterChange('pingStatus', value)}
                                        >
                                            <Option value="online">🟢 Online</Option>
                                            <Option value="blocked">🟡 Chặn ICMP</Option>
                                            <Option value="offline">🔴 Offline</Option>
                                            <Option value="unregistered">⚠️ Chưa đăng ký</Option>
                                        </Select>
                                    </Col>
                                    <Col>
                                        <Tooltip title="Làm mới">
                                            <Button icon={<ReloadOutlined />} onClick={() => refetchIps()} />
                                        </Tooltip>
                                    </Col>
                                    {pingStats && (
                                        <Col>
                                            <Divider type="vertical" style={{ height: 24 }} />
                                        </Col>
                                    )}
                                    {pingStats && (
                                        <Col>
                                            <Space>
                                                <Tag color="green">Online: {pingStats.online}</Tag>
                                                {pingStats.blocked > 0 && (
                                                    <Tag color="orange">Chặn ICMP: {pingStats.blocked}</Tag>
                                                )}
                                                <Tag color="red">Offline: {pingStats.offline}</Tag>
                                                {unregisteredDevices.length > 0 && (
                                                    <Tag
                                                        color="warning"
                                                        style={{ cursor: 'pointer', fontWeight: 'bold' }}
                                                        onClick={() => handleIpFilterChange('pingStatus', 'unregistered')}
                                                    >
                                                        ⚠️ Chưa đăng ký: {unregisteredDevices.length}
                                                    </Tag>
                                                )}
                                                {pingStats.avgResponseTime > 0 && (
                                                    <Tag color="blue">Avg: {pingStats.avgResponseTime.toFixed(1)}ms</Tag>
                                                )}
                                            </Space>
                                        </Col>
                                    )}
                                </Row>
                            </Card>

                            <Card
                                bordered={false}
                                className="table-card"
                                title={
                                    <Space>
                                        <GlobalOutlined />
                                        <span>{selectedSegment.name}</span>
                                        <Text type="secondary">({selectedSegment.cidr})</Text>
                                    </Space>
                                }
                            >
                                <Table
                                    columns={ipColumns}
                                    dataSource={ips}
                                    rowKey="id"
                                    loading={ipsLoading}
                                    scroll={{ x: 900 }}
                                    size="small"
                                    pagination={{
                                        current: effectivePagination.page,
                                        pageSize: effectivePagination.limit || ipFilters.limit,
                                        total: effectivePagination.total,
                                        showSizeChanger: true,
                                        pageSizeOptions: ['20', '50', '100', '200'],
                                        showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} IP`,
                                    }}
                                    onChange={handleTableChange}
                                />
                            </Card>
                        </>
                    ) : (
                        <Card bordered={false}>
                            <Empty description="Chọn một dải mạng để xem danh sách IP" />
                        </Card>
                    )}
                </Col>
            </Row>

            {/* Add/Edit Segment Modal */}
            <Modal
                title={editingSegment ? 'Sửa dải mạng' : 'Thêm dải mạng mới'}
                open={isSegmentModalOpen}
                onCancel={handleCloseSegmentModal}
                footer={null}
                width={600}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmitSegment}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="name"
                                label="Tên dải mạng"
                                rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
                            >
                                <Input placeholder="VD: Office LAN, Server VLAN" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="vlan_id"
                                label="VLAN ID"
                            >
                                <Input type="number" placeholder="VD: 10, 20, 100" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="cidr"
                        label="CIDR"
                        rules={[
                            { required: true, message: 'Vui lòng nhập CIDR' },
                            { pattern: /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/, message: 'Format: 192.168.1.0/24' },
                        ]}
                        extra={!editingSegment && "Hệ thống sẽ tự động tạo danh sách IP từ CIDR"}
                    >
                        <Input
                            placeholder="VD: 192.168.1.0/24"
                            disabled={!!editingSegment}
                        />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="gateway" label="Gateway">
                                <Input placeholder="VD: 192.168.1.1" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="dns_primary" label="DNS Primary">
                                <Input placeholder="VD: 8.8.8.8" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="dns_secondary" label="DNS Secondary">
                                <Input placeholder="VD: 8.8.4.4" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="tags" label="Tags">
                        <Input placeholder="VD: office, server, wifi (phân cách bằng dấu phẩy)" />
                    </Form.Item>

                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea rows={2} placeholder="Mô tả thêm về dải mạng..." />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={handleCloseSegmentModal}>Hủy</Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={createSegmentMutation.isPending || updateSegmentMutation.isPending}
                            >
                                {editingSegment ? 'Cập nhật' : 'Tạo dải mạng'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Assign/Edit IP Modal */}
            <Modal
                title={selectedIp?.status === 'in_use' || selectedIp?.status === 'reserved'
                    ? `${t('ipMap.editIP')} ${selectedIp?.ip_address}`
                    : `${t('ipMap.assignIP')} ${selectedIp?.ip_address}`}
                open={isAssignModalOpen}
                onCancel={() => {
                    setIsAssignModalOpen(false);
                    assignForm.resetFields();
                }}
                footer={null}
                width={500}
                destroyOnClose
            >
                <Form
                    form={assignForm}
                    layout="vertical"
                    onFinish={handleAssignIp}
                >
                    <Form.Item
                        name="device_id"
                        label={t('ipMap.device')}
                    >
                        <Select
                            placeholder={t('ipMap.selectDeviceOptional')}
                            allowClear
                            showSearch
                            onChange={handleDeviceSelect}
                            optionFilterProp="label"
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            options={devices.map((device) => ({
                                value: device.id,
                                label: `${device.name} (${device.type})`,
                            }))}
                        />
                    </Form.Item>

                    <Form.Item name="hostname" label={t('devices.hostname')}>
                        <Input placeholder="VD: PC-KETOAN-01" />
                    </Form.Item>

                    <Form.Item name="mac_address" label={t('devices.macAddress')}>
                        <Input placeholder="VD: AA:BB:CC:DD:EE:FF" />
                    </Form.Item>

                    <Form.Item name="notes" label={t('common.notes')}>
                        <Input.TextArea rows={2} placeholder={t('ipMap.notesPlaceholder')} />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsAssignModalOpen(false)}>{t('common.cancel')}</Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={assignIpMutation.isPending}
                            >
                                {selectedIp?.status === 'in_use' || selectedIp?.status === 'reserved' ? t('common.update') : t('ipMap.assignIP')}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default IpMapPage;
