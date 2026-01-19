import { useState, useEffect } from 'react';
import {
    Table,
    Card,
    Button,
    Tag,
    Space,
    Input,
    Select,
    Row,
    Col,
    Tooltip,
    message,
    Popconfirm,
    Typography,
    Badge,
    Statistic,
    Drawer,
    Form,
    Divider,
    Timeline,
    Avatar,
    Empty,
} from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    ExportOutlined,
    UserOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    CommentOutlined,
    SendOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import taskService from '../services/taskService';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import 'dayjs/locale/en';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const TasksPage = () => {
    const queryClient = useQueryClient();
    const { t, i18n } = useTranslation();
    const [filters, setFilters] = useState({});
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
    const [selectedTask, setSelectedTask] = useState(null);
    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
    const [newComment, setNewComment] = useState('');

    // Set dayjs locale based on current language
    useEffect(() => {
        dayjs.locale(i18n.language === 'vi' ? 'vi' : 'en');
    }, [i18n.language]);

    // Dynamic config with translations
    const statusConfig = {
        open: { color: 'blue', label: t('tasks.statuses.open'), icon: <ClockCircleOutlined /> },
        in_progress: { color: 'processing', label: t('tasks.statuses.in_progress'), icon: <ExclamationCircleOutlined /> },
        pending: { color: 'warning', label: t('tasks.statuses.pending'), icon: <ClockCircleOutlined /> },
        resolved: { color: 'success', label: t('tasks.statuses.resolved'), icon: <CheckCircleOutlined /> },
        closed: { color: 'default', label: t('tasks.statuses.closed'), icon: <CheckCircleOutlined /> },
    };

    const priorityConfig = {
        low: { color: 'default', label: t('tasks.priorities.low') },
        medium: { color: 'blue', label: t('tasks.priorities.medium') },
        high: { color: 'orange', label: t('tasks.priorities.high') },
        urgent: { color: 'red', label: t('tasks.priorities.urgent') },
    };

    const categoryLabels = {
        hardware: `🖥️ ${t('tasks.categories.hardware')}`,
        software: `💿 ${t('tasks.categories.software')}`,
        network: `🌐 ${t('tasks.categories.network')}`,
        email: `📧 ${t('tasks.categories.email')}`,
        account: `🔐 ${t('tasks.categories.account')}`,
        other: `📦 ${t('tasks.categories.other')}`,
    };

    // Fetch tasks
    const { data: tasksData, isLoading, refetch } = useQuery({
        queryKey: ['tasks', filters, pagination],
        queryFn: () => taskService.getTasks({
            ...filters,
            page: pagination.current,
            limit: pagination.pageSize,
        }),
    });

    // Fetch stats
    const { data: statsData } = useQuery({
        queryKey: ['taskStats'],
        queryFn: taskService.getStats,
    });

    // Fetch users for assignment
    const { data: usersData } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await fetch('/api/auth/users', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            return response.json();
        },
    });

    // Mutations
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }) => taskService.updateStatus(id, status),
        onSuccess: async () => {
            message.success('Đã cập nhật trạng thái');
            await queryClient.invalidateQueries({ queryKey: ['tasks'] });
            await queryClient.invalidateQueries({ queryKey: ['taskStats'] });
        },
    });

    const assignMutation = useMutation({
        mutationFn: ({ id, assignedTo }) => taskService.assignTask(id, assignedTo),
        onSuccess: async () => {
            message.success('Đã phân công');
            await queryClient.invalidateQueries({ queryKey: ['tasks'] });
            await queryClient.invalidateQueries({ queryKey: ['taskStats'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: taskService.deleteTask,
        onSuccess: async () => {
            message.success('Đã xóa task');
            await queryClient.invalidateQueries({ queryKey: ['tasks'] });
            await queryClient.invalidateQueries({ queryKey: ['taskStats'] });
        },
    });

    const addCommentMutation = useMutation({
        mutationFn: ({ taskId, content }) => taskService.addComment(taskId, content),
        onSuccess: () => {
            message.success('Đã thêm ghi chú');
            setNewComment('');
            refetchTaskDetail();
        },
    });

    // Fetch task detail
    const { data: taskDetail, refetch: refetchTaskDetail } = useQuery({
        queryKey: ['taskDetail', selectedTask?.id],
        queryFn: () => taskService.getTask(selectedTask?.id),
        enabled: !!selectedTask?.id,
    });

    const openDetail = (task) => {
        setSelectedTask(task);
        setDetailDrawerOpen(true);
    };

    const handleExport = async () => {
        try {
            const response = await taskService.exportTasks(filters);
            if (response.success) {
                // Convert to CSV and download
                const data = response.data;
                if (data.length === 0) {
                    message.warning(t('common.noData'));
                    return;
                }
                const headers = Object.keys(data[0]);
                const csv = [
                    headers.join(','),
                    ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(',')),
                ].join('\n');

                const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `tasks_report_${dayjs().format('YYYY-MM-DD')}.csv`;
                link.click();
                message.success(t('common.export') + ' OK');
            }
        } catch (error) {
            message.error(t('common.operationFailed'));
        }
    };

    const columns = [
        {
            title: t('tasks.taskNumber'),
            dataIndex: 'task_number',
            width: 130,
            render: (text, record) => (
                <Button type="link" onClick={() => openDetail(record)} style={{ padding: 0 }}>
                    {text}
                </Button>
            ),
        },
        {
            title: t('tasks.taskTitle'),
            dataIndex: 'title',
            ellipsis: true,
            render: (text, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{text}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {categoryLabels[record.category]}
                    </Text>
                </Space>
            ),
        },
        {
            title: t('tasks.requesterName'),
            dataIndex: 'requester_name',
            width: 150,
            render: (text, record) => (
                <Space direction="vertical" size={0}>
                    <Text>{text}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.requester_department}</Text>
                </Space>
            ),
        },
        {
            title: t('tasks.priority'),
            dataIndex: 'priority',
            width: 100,
            render: (priority) => (
                <Tag color={priorityConfig[priority]?.color}>
                    {priorityConfig[priority]?.label}
                </Tag>
            ),
        },
        {
            title: t('common.status'),
            dataIndex: 'status',
            width: 120,
            render: (status) => (
                <Tag color={statusConfig[status]?.color} icon={statusConfig[status]?.icon}>
                    {statusConfig[status]?.label}
                </Tag>
            ),
        },
        {
            title: t('tasks.assignee'),
            dataIndex: 'assignee',
            width: 150,
            render: (assignee, record) => (
                <Select
                    value={assignee?.id}
                    onChange={(val) => assignMutation.mutate({ id: record.id, assignedTo: val })}
                    placeholder={t('common.selectPlaceholder')}
                    style={{ width: '100%' }}
                    size="small"
                    allowClear
                >
                    {usersData?.data?.map(user => (
                        <Select.Option key={user.id} value={user.id}>
                            {user.display_name || user.username}
                        </Select.Option>
                    ))}
                </Select>
            ),
        },
        {
            title: t('common.createdAt'),
            dataIndex: 'created_at',
            width: 100,
            render: (date) => (
                <Tooltip title={dayjs(date).format('DD/MM/YYYY HH:mm')}>
                    {dayjs(date).fromNow()}
                </Tooltip>
            ),
        },
        {
            title: t('common.actions'),
            width: 120,
            render: (_, record) => (
                <Space>
                    <Tooltip title={t('common.view')}>
                        <Button icon={<EyeOutlined />} size="small" onClick={() => openDetail(record)} />
                    </Tooltip>
                    <Select
                        value={record.status}
                        onChange={(val) => updateStatusMutation.mutate({ id: record.id, status: val })}
                        size="small"
                        style={{ width: 90 }}
                    >
                        {Object.entries(statusConfig).map(([key, val]) => (
                            <Select.Option key={key} value={key}>{val.label}</Select.Option>
                        ))}
                    </Select>
                </Space>
            ),
        },
    ];

    const stats = statsData?.data || {};

    return (
        <div style={{ padding: 24 }}>
            {/* Header */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Title level={3} style={{ margin: 0 }}>📋 {t('tasks.title')}</Title>
                </Col>
                <Col>
                    <Space>
                        <Button icon={<ExportOutlined />} onClick={handleExport}>
                            {t('tasks.exportReport')}
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                            {t('common.refresh')}
                        </Button>
                    </Space>
                </Col>
            </Row>

            {/* Stats Cards */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6} md={4}>
                    <Card size="small">
                        <Statistic title={t('tasks.stats.total')} value={stats.total || 0} />
                    </Card>
                </Col>
                <Col xs={12} sm={6} md={4}>
                    <Card size="small">
                        <Statistic title={t('tasks.stats.open')} value={stats.open || 0} valueStyle={{ color: '#1890ff' }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6} md={4}>
                    <Card size="small">
                        <Statistic title={t('tasks.stats.inProgress')} value={stats.inProgress || 0} valueStyle={{ color: '#faad14' }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6} md={4}>
                    <Card size="small">
                        <Statistic title={t('tasks.stats.resolved')} value={stats.resolved || 0} valueStyle={{ color: '#52c41a' }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6} md={4}>
                    <Card size="small">
                        <Statistic title={t('tasks.stats.urgent')} value={stats.urgent || 0} valueStyle={{ color: '#ff4d4f' }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6} md={4}>
                    <Card size="small">
                        <Statistic title={t('tasks.stats.overdue')} value={stats.overdue || 0} valueStyle={{ color: '#ff4d4f' }} />
                    </Card>
                </Col>
            </Row>

            {/* Filters */}
            <Card size="small" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                    <Col xs={24} sm={8} md={6}>
                        <Input
                            placeholder={t('common.searchPlaceholder')}
                            prefix={<SearchOutlined />}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            allowClear
                        />
                    </Col>
                    <Col xs={12} sm={8} md={4}>
                        <Select
                            placeholder={t('common.status')}
                            style={{ width: '100%' }}
                            onChange={(val) => setFilters({ ...filters, status: val })}
                            allowClear
                        >
                            {Object.entries(statusConfig).map(([key, val]) => (
                                <Select.Option key={key} value={key}>{val.label}</Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={12} sm={8} md={4}>
                        <Select
                            placeholder={t('tasks.priority')}
                            style={{ width: '100%' }}
                            onChange={(val) => setFilters({ ...filters, priority: val })}
                            allowClear
                        >
                            {Object.entries(priorityConfig).map(([key, val]) => (
                                <Select.Option key={key} value={key}>{val.label}</Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={12} sm={8} md={4}>
                        <Select
                            placeholder={t('tasks.category')}
                            style={{ width: '100%' }}
                            onChange={(val) => setFilters({ ...filters, category: val })}
                            allowClear
                        >
                            {Object.entries(categoryLabels).map(([key, label]) => (
                                <Select.Option key={key} value={key}>{label}</Select.Option>
                            ))}
                        </Select>
                    </Col>
                </Row>
            </Card>

            {/* Table */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={tasksData?.data || []}
                    rowKey="id"
                    loading={isLoading}
                    pagination={{
                        ...pagination,
                        total: tasksData?.pagination?.total,
                        showSizeChanger: true,
                        showTotal: (total) => `${t('common.total')}: ${total}`,
                    }}
                    onChange={(pag) => setPagination({ current: pag.current, pageSize: pag.pageSize })}
                    size="middle"
                />
            </Card>

            {/* Detail Drawer */}
            <Drawer
                title={`${t('common.view')}: ${selectedTask?.task_number}`}
                open={detailDrawerOpen}
                onClose={() => setDetailDrawerOpen(false)}
                width={600}
            >
                {taskDetail?.data && (
                    <div>
                        <Space direction="vertical" style={{ width: '100%' }} size="large">
                            {/* Status & Priority */}
                            <Space>
                                <Tag color={statusConfig[taskDetail.data.status]?.color}>
                                    {statusConfig[taskDetail.data.status]?.label}
                                </Tag>
                                <Tag color={priorityConfig[taskDetail.data.priority]?.color}>
                                    {priorityConfig[taskDetail.data.priority]?.label}
                                </Tag>
                                <Tag>{categoryLabels[taskDetail.data.category]}</Tag>
                            </Space>

                            {/* Title & Description */}
                            <div>
                                <Title level={4}>{taskDetail.data.title}</Title>
                                <Paragraph>{taskDetail.data.description}</Paragraph>
                            </div>

                            <Divider />

                            {/* Requester Info */}
                            <div>
                                <Text strong>{t('tasks.requester')}:</Text>
                                <div>{taskDetail.data.requester_name}</div>
                                <div>{taskDetail.data.requester_email}</div>
                                <div>{taskDetail.data.requester_department}</div>
                                <div>{taskDetail.data.requester_phone}</div>
                            </div>

                            <Divider />

                            {/* Comments */}
                            <div>
                                <Title level={5}><CommentOutlined /> {t('tasks.comments')}</Title>
                                {taskDetail.data.comments?.length > 0 ? (
                                    <Timeline>
                                        {taskDetail.data.comments.map(comment => (
                                            <Timeline.Item key={comment.id}>
                                                <div>
                                                    <Text strong>{comment.user?.display_name || 'IT'}</Text>
                                                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                                                        {dayjs(comment.created_at).fromNow()}
                                                    </Text>
                                                </div>
                                                <div>{comment.content}</div>
                                            </Timeline.Item>
                                        ))}
                                    </Timeline>
                                ) : (
                                    <Empty description={t('tasks.noComments')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                )}

                                {/* Add Comment */}
                                <div style={{ marginTop: 16 }}>
                                    <TextArea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder={t('tasks.addComment')}
                                        rows={2}
                                    />
                                    <Button
                                        type="primary"
                                        icon={<SendOutlined />}
                                        onClick={() => addCommentMutation.mutate({ taskId: taskDetail.data.id, content: newComment })}
                                        loading={addCommentMutation.isPending}
                                        disabled={!newComment.trim()}
                                        style={{ marginTop: 8 }}
                                    >
                                        {t('common.save')}
                                    </Button>
                                </div>
                            </div>
                        </Space>
                    </div>
                )}
            </Drawer>
        </div >
    );
};

export default TasksPage;
