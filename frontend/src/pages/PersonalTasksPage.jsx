import { useState, useEffect } from 'react';
import {
    Card, Row, Col, Button, Table, Tag, Space, Input, Select,
    Statistic, Typography, Modal, Form, DatePicker, Popconfirm,
    message, Tabs, Badge, Tooltip, Empty, Spin, Collapse, ColorPicker
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined,
    ClockCircleOutlined, ExclamationCircleOutlined, ReloadOutlined,
    AppstoreOutlined, UnorderedListOutlined, FilterOutlined,
    TagOutlined, CalendarOutlined, FlagOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import personalTaskService from '../services/personalTaskService';
import personalTaskCategoryService from '../services/personalTaskCategoryService';

const { Title, Text } = Typography;
const { TextArea } = Input;

const getPriorityConfig = (t) => ({
    low: { color: 'green', label: t('personalTasks.priorities.low'), icon: '🟢' },
    medium: { color: 'orange', label: t('personalTasks.priorities.medium'), icon: '🟡' },
    high: { color: 'red', label: t('personalTasks.priorities.high'), icon: '🔴' }
});

const getStatusConfig = (t) => ({
    pending: { color: 'default', label: t('personalTasks.statuses.pending'), icon: <ClockCircleOutlined /> },
    in_progress: { color: 'processing', label: t('personalTasks.statuses.in_progress'), icon: <ReloadOutlined spin /> },
    completed: { color: 'success', label: t('personalTasks.statuses.completed'), icon: <CheckOutlined /> }
});

const getRecurringConfig = (t) => ({
    none: t('personalTasks.recurringTypes.none'),
    daily: t('personalTasks.recurringTypes.daily'),
    weekly: t('personalTasks.recurringTypes.weekly'),
    monthly: t('personalTasks.recurringTypes.monthly')
});

const PersonalTasksPage = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState('list');
    const [filters, setFilters] = useState({});
    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [taskForm] = Form.useForm();
    const [categoryForm] = Form.useForm();

    // Queries
    const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
        queryKey: ['personalTasks', filters],
        queryFn: () => personalTaskService.getAll(filters)
    });

    const { data: statsData } = useQuery({
        queryKey: ['personalTaskStats'],
        queryFn: () => personalTaskService.getStats()
    });

    const { data: categoriesData, refetch: refetchCategories } = useQuery({
        queryKey: ['personalTaskCategories'],
        queryFn: () => personalTaskCategoryService.getAll()
    });

    const tasks = tasksData?.data || [];
    const stats = statsData?.data || {};
    const categories = categoriesData?.data || [];

    const priorityConfig = getPriorityConfig(t);
    const statusConfig = getStatusConfig(t);
    const recurringConfig = getRecurringConfig(t);

    // Mutations
    const createTaskMutation = useMutation({
        mutationFn: personalTaskService.create,
        onSuccess: () => {
            message.success(t('personalTasks.messages.createSuccess'));
            queryClient.invalidateQueries(['personalTasks']);
            queryClient.invalidateQueries(['personalTaskStats']);
            setTaskModalOpen(false);
            taskForm.resetFields();
        },
        onError: (error) => message.error(error.response?.data?.message || t('common.operationFailed'))
    });

    const updateTaskMutation = useMutation({
        mutationFn: ({ id, data }) => personalTaskService.update(id, data),
        onSuccess: () => {
            message.success(t('personalTasks.messages.updateSuccess'));
            queryClient.invalidateQueries(['personalTasks']);
            queryClient.invalidateQueries(['personalTaskStats']);
            setTaskModalOpen(false);
            setEditingTask(null);
            taskForm.resetFields();
        },
        onError: (error) => message.error(error.response?.data?.message || t('common.operationFailed'))
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }) => personalTaskService.updateStatus(id, status),
        onSuccess: () => {
            message.success(t('personalTasks.messages.statusUpdated'));
            queryClient.invalidateQueries(['personalTasks']);
            queryClient.invalidateQueries(['personalTaskStats']);
        },
        onError: (error) => message.error(error.response?.data?.message || t('common.operationFailed'))
    });

    const deleteTaskMutation = useMutation({
        mutationFn: personalTaskService.delete,
        onSuccess: () => {
            message.success(t('personalTasks.messages.deleteSuccess'));
            queryClient.invalidateQueries(['personalTasks']);
            queryClient.invalidateQueries(['personalTaskStats']);
        },
        onError: (error) => message.error(error.response?.data?.message || t('common.operationFailed'))
    });

    const createCategoryMutation = useMutation({
        mutationFn: personalTaskCategoryService.create,
        onSuccess: () => {
            message.success(t('personalTasks.messages.categoryCreated'));
            refetchCategories();
            setCategoryModalOpen(false);
            categoryForm.resetFields();
        }
    });

    const updateCategoryMutation = useMutation({
        mutationFn: ({ id, data }) => personalTaskCategoryService.update(id, data),
        onSuccess: () => {
            message.success(t('personalTasks.messages.categoryUpdated'));
            refetchCategories();
            setCategoryModalOpen(false);
            setEditingCategory(null);
            categoryForm.resetFields();
        }
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: personalTaskCategoryService.delete,
        onSuccess: () => {
            message.success(t('personalTasks.messages.categoryDeleted'));
            refetchCategories();
        }
    });

    // Handlers
    const handleAddTask = () => {
        setEditingTask(null);
        taskForm.resetFields();
        taskForm.setFieldsValue({ priority: 'medium', recurring_type: 'none' });
        setTaskModalOpen(true);
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        taskForm.setFieldsValue({
            ...task,
            due_date: task.due_date ? dayjs(task.due_date) : null,
            recurring_end_date: task.recurring_end_date ? dayjs(task.recurring_end_date) : null
        });
        setTaskModalOpen(true);
    };

    const handleTaskSubmit = async () => {
        try {
            const values = await taskForm.validateFields();
            const data = {
                ...values,
                due_date: values.due_date?.format('YYYY-MM-DD'),
                recurring_end_date: values.recurring_end_date?.format('YYYY-MM-DD')
            };

            if (editingTask) {
                updateTaskMutation.mutate({ id: editingTask.id, data });
            } else {
                createTaskMutation.mutate(data);
            }
        } catch (error) {
            // Validation error
        }
    };

    const handleAddCategory = () => {
        setEditingCategory(null);
        categoryForm.resetFields();
        categoryForm.setFieldsValue({ color: '#1677ff' });
        setCategoryModalOpen(true);
    };

    const handleEditCategory = (category) => {
        setEditingCategory(category);
        categoryForm.setFieldsValue(category);
        setCategoryModalOpen(true);
    };

    const handleCategorySubmit = async () => {
        try {
            const values = await categoryForm.validateFields();
            const data = {
                ...values,
                color: typeof values.color === 'object' ? values.color.toHexString() : values.color
            };

            if (editingCategory) {
                updateCategoryMutation.mutate({ id: editingCategory.id, data });
            } else {
                createCategoryMutation.mutate(data);
            }
        } catch (error) {
            // Validation error
        }
    };

    const isOverdue = (task) => {
        if (task.status === 'completed' || !task.due_date) return false;
        return dayjs(task.due_date).isBefore(dayjs(), 'day');
    };

    // Table columns
    const columns = [
        {
            title: t('personalTasks.task'),
            dataIndex: 'title',
            key: 'title',
            render: (text, record) => (
                <div>
                    <div>
                        <Text strong style={{
                            textDecoration: record.status === 'completed' ? 'line-through' : 'none',
                            color: isOverdue(record) ? '#ff4d4f' : undefined
                        }}>
                            {text}
                        </Text>
                        {record.subtasks?.length > 0 && (
                            <Badge
                                count={record.subtasks.length}
                                size="small"
                                style={{ marginLeft: 8, backgroundColor: '#1677ff' }}
                            />
                        )}
                        {record.recurring_type !== 'none' && (
                            <Tooltip title={recurringConfig[record.recurring_type]}>
                                <ReloadOutlined style={{ marginLeft: 8, color: '#1677ff' }} />
                            </Tooltip>
                        )}
                    </div>
                    {record.description && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {record.description.length > 80
                                ? record.description.substring(0, 80) + '...'
                                : record.description}
                        </Text>
                    )}
                </div>
            )
        },
        {
            title: t('personalTasks.category'),
            dataIndex: 'category',
            key: 'category',
            width: 120,
            render: (category) => category ? (
                <Tag color={category.color}>{category.icon} {category.name}</Tag>
            ) : '-'
        },
        {
            title: t('personalTasks.priority'),
            dataIndex: 'priority',
            key: 'priority',
            width: 100,
            render: (priority) => {
                const config = priorityConfig[priority];
                return <Tag color={config.color}>{config.icon} {config.label}</Tag>;
            }
        },
        {
            title: t('personalTasks.status'),
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status) => {
                const config = statusConfig[status];
                return <Tag icon={config.icon} color={config.color}>{config.label}</Tag>;
            }
        },
        {
            title: t('personalTasks.dueDate'),
            dataIndex: 'due_date',
            key: 'due_date',
            width: 120,
            render: (date, record) => date ? (
                <Text type={isOverdue(record) ? 'danger' : undefined}>
                    {dayjs(date).format('DD/MM/YYYY')}
                </Text>
            ) : '-'
        },
        {
            title: '',
            key: 'actions',
            width: 150,
            render: (_, record) => (
                <Space size="small">
                    {record.status !== 'completed' && (
                        <Tooltip title={t('personalTasks.complete')}>
                            <Button
                                type="text"
                                size="small"
                                icon={<CheckOutlined />}
                                onClick={() => updateStatusMutation.mutate({ id: record.id, status: 'completed' })}
                            />
                        </Tooltip>
                    )}
                    <Tooltip title={t('common.edit')}>
                        <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEditTask(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title={t('personalTasks.confirmDelete')}
                        onConfirm={() => deleteTaskMutation.mutate(record.id)}
                        okText={t('common.delete')}
                        cancelText={t('common.cancel')}
                    >
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    // Kanban view
    const renderKanbanColumn = (status, title, icon) => {
        const columnTasks = tasks.filter(t => t.status === status);
        return (
            <Card
                title={<Space>{icon} {title} <Badge count={columnTasks.length} /></Space>}
                size="small"
                style={{ minHeight: 400 }}
            >
                {columnTasks.length === 0 ? (
                    <Empty description={t('personalTasks.noTasks')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    <Space direction="vertical" style={{ width: '100%' }}>
                        {columnTasks.map(task => (
                            <Card
                                key={task.id}
                                size="small"
                                style={{
                                    borderLeft: `3px solid ${priorityConfig[task.priority].color === 'green' ? '#52c41a' :
                                        priorityConfig[task.priority].color === 'orange' ? '#faad14' : '#ff4d4f'}`,
                                    background: isOverdue(task) ? '#fff2f0' : undefined
                                }}
                                actions={[
                                    status !== 'completed' && (
                                        <CheckOutlined
                                            key="complete"
                                            onClick={() => updateStatusMutation.mutate({ id: task.id, status: 'completed' })}
                                        />
                                    ),
                                    <EditOutlined key="edit" onClick={() => handleEditTask(task)} />,
                                    <Popconfirm
                                        key="delete"
                                        title={t('personalTasks.confirmDelete')}
                                        onConfirm={() => deleteTaskMutation.mutate(task.id)}
                                    >
                                        <DeleteOutlined />
                                    </Popconfirm>
                                ].filter(Boolean)}
                            >
                                <Text strong>{task.title}</Text>
                                {task.category && (
                                    <div><Tag size="small" color={task.category.color}>{task.category.name}</Tag></div>
                                )}
                                {task.due_date && (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        <CalendarOutlined /> {dayjs(task.due_date).format('DD/MM')}
                                    </Text>
                                )}
                            </Card>
                        ))}
                    </Space>
                )}
            </Card>
        );
    };

    return (
        <div className="personal-tasks-page">
            <div className="page-header" style={{ marginBottom: 24 }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Title level={3} style={{ margin: 0 }}>
                            <CheckOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                            {t('personalTasks.title')}
                        </Title>
                        <Text type="secondary">{t('personalTasks.subtitle')}</Text>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<TagOutlined />} onClick={handleAddCategory}>
                                {t('personalTasks.categories')}
                            </Button>
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTask}>
                                {t('personalTasks.addTask')}
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </div>

            {/* Statistics */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic title={t('personalTasks.stats.total')} value={stats.total || 0} prefix={<AppstoreOutlined />} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic title={t('personalTasks.stats.pending')} value={stats.pending || 0} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14' }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic title={t('personalTasks.stats.completed')} value={stats.completed || 0} prefix={<CheckOutlined />} valueStyle={{ color: '#52c41a' }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic title={t('personalTasks.stats.overdue')} value={stats.overdue || 0} prefix={<ExclamationCircleOutlined />} valueStyle={{ color: '#ff4d4f' }} />
                    </Card>
                </Col>
            </Row>

            {/* Filters & View Toggle */}
            <Card size="small" style={{ marginBottom: 16 }}>
                <Row gutter={16} align="middle">
                    <Col flex="auto">
                        <Space wrap>
                            <Select
                                placeholder={t('personalTasks.status')}
                                allowClear
                                style={{ width: 130 }}
                                onChange={(v) => setFilters({ ...filters, status: v })}
                                options={Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label }))}
                            />
                            <Select
                                placeholder={t('personalTasks.category')}
                                allowClear
                                style={{ width: 150 }}
                                onChange={(v) => setFilters({ ...filters, category_id: v })}
                                options={categories.map(c => ({ value: c.id, label: c.name }))}
                            />
                            <Select
                                placeholder={t('personalTasks.priority')}
                                allowClear
                                style={{ width: 120 }}
                                onChange={(v) => setFilters({ ...filters, priority: v })}
                                options={Object.entries(priorityConfig).map(([k, v]) => ({ value: k, label: v.label }))}
                            />
                        </Space>
                    </Col>
                    <Col>
                        <Space.Compact>
                            <Button
                                icon={<UnorderedListOutlined />}
                                type={viewMode === 'list' ? 'primary' : 'default'}
                                onClick={() => setViewMode('list')}
                            />
                            <Button
                                icon={<AppstoreOutlined />}
                                type={viewMode === 'kanban' ? 'primary' : 'default'}
                                onClick={() => setViewMode('kanban')}
                            />
                        </Space.Compact>
                    </Col>
                </Row>
            </Card>

            {/* Task List/Kanban */}
            {tasksLoading ? (
                <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>
            ) : viewMode === 'list' ? (
                <Card>
                    <Table
                        columns={columns}
                        dataSource={tasks}
                        rowKey="id"
                        pagination={{ pageSize: 20, showTotal: (total) => `${total} tasks` }}
                        locale={{ emptyText: <Empty description={t('personalTasks.noTasks')} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                    />
                </Card>
            ) : (
                <Row gutter={16}>
                    <Col xs={24} md={8}>{renderKanbanColumn('pending', statusConfig.pending.label, <ClockCircleOutlined />)}</Col>
                    <Col xs={24} md={8}>{renderKanbanColumn('in_progress', statusConfig.in_progress.label, <ReloadOutlined />)}</Col>
                    <Col xs={24} md={8}>{renderKanbanColumn('completed', statusConfig.completed.label, <CheckOutlined />)}</Col>
                </Row>
            )}

            {/* Task Modal */}
            <Modal
                title={editingTask ? t('personalTasks.editTask') : t('personalTasks.addTask')}
                open={taskModalOpen}
                onOk={handleTaskSubmit}
                onCancel={() => { setTaskModalOpen(false); setEditingTask(null); }}
                okText={editingTask ? t('common.update') : t('common.save')}
                cancelText={t('common.cancel')}
                width={600}
                confirmLoading={createTaskMutation.isLoading || updateTaskMutation.isLoading}
            >
                <Form form={taskForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item
                        name="title"
                        label={t('tasks.taskTitle')}
                        rules={[{ required: true, message: t('validation.required') }]}
                    >
                        <Input placeholder={t('personalTasks.task')} />
                    </Form.Item>

                    <Form.Item name="description" label={t('personalTasks.description')}>
                        <TextArea rows={3} placeholder={t('personalTasks.description')} />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="category_id" label={t('personalTasks.category')}>
                                <Select placeholder={t('personalTasks.category')} allowClear>
                                    {categories.map(c => (
                                        <Select.Option key={c.id} value={c.id}>
                                            <Tag color={c.color}>{c.icon} {c.name}</Tag>
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="priority" label={t('personalTasks.priority')}>
                                <Select>
                                    {Object.entries(priorityConfig).map(([k, v]) => (
                                        <Select.Option key={k} value={k}>{v.icon} {v.label}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="due_date" label={t('personalTasks.dueDate')}>
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="status" label={t('personalTasks.status')} initialValue="pending">
                                <Select>
                                    {Object.entries(statusConfig).map(([k, v]) => (
                                        <Select.Option key={k} value={k}>{v.label}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Collapse ghost>
                        <Collapse.Panel header={t('personalTasks.recurringSettings')} key="recurring">
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="recurring_type" label={t('personalTasks.recurringType')}>
                                        <Select>
                                            {Object.entries(recurringConfig).map(([k, v]) => (
                                                <Select.Option key={k} value={k}>{v}</Select.Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="recurring_end_date" label={t('personalTasks.recurringEndDate')}>
                                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Collapse.Panel>
                    </Collapse>
                </Form>
            </Modal>

            {/* Category Modal */}
            <Modal
                title={editingCategory ? t('personalTasks.editCategory') : t('personalTasks.addCategory')}
                open={categoryModalOpen}
                onOk={handleCategorySubmit}
                onCancel={() => { setCategoryModalOpen(false); setEditingCategory(null); }}
                okText={editingCategory ? t('common.update') : t('common.save')}
                cancelText={t('common.cancel')}
            >
                <Form form={categoryForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item
                        name="name"
                        label={t('common.name')}
                        rules={[{ required: true, message: t('validation.required') }]}
                    >
                        <Input placeholder="Ví dụ: Công việc, Cá nhân, Dự án X..." />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="color" label={t('settings.color')}>
                                <ColorPicker />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="icon" label="Icon (emoji)">
                                <Input placeholder="📁 💼 🎯" maxLength={4} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>

                {/* Category List */}
                {categories.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                        <Text type="secondary">{t('personalTasks.existingCategories')}</Text>
                        <div style={{ marginTop: 8 }}>
                            {categories.map(c => (
                                <Tag
                                    key={c.id}
                                    color={c.color}
                                    style={{ marginBottom: 8, cursor: 'pointer' }}
                                    closable
                                    onClose={(e) => {
                                        e.preventDefault();
                                        deleteCategoryMutation.mutate(c.id);
                                    }}
                                    onClick={() => handleEditCategory(c)}
                                >
                                    {c.icon} {c.name}
                                </Tag>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default PersonalTasksPage;
