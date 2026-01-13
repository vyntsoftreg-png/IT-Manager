import { useState, useEffect } from 'react';
import {
    Card, Form, Switch, Select, Button, Typography, Space, message,
    Divider, Radio, Row, Col, Tabs, Table, Modal, Input, Tag, Popconfirm, Empty, Spin
} from 'antd';
import {
    SettingOutlined, SaveOutlined, SunOutlined, MoonOutlined,
    PlusOutlined, EditOutlined, DeleteOutlined, DatabaseOutlined
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import { settingsService } from '../services/settingsService';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const SettingsPage = () => {
    const { isDarkMode, setTheme } = useTheme();
    const { user } = useAuth();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    // Lookup management state
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('device_types');
    const [settings, setSettings] = useState([]);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [itemForm] = Form.useForm();

    // Load saved settings
    const savedSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');

    // Load categories
    const loadCategories = async () => {
        try {
            const response = await settingsService.getCategories();
            if (response.success) {
                setCategories(response.data);
            }
        } catch (error) {
            console.error('Load categories error:', error);
        }
    };

    // Load settings by category
    const loadSettings = async (category) => {
        setSettingsLoading(true);
        try {
            const response = await settingsService.getSettings(category);
            if (response.success) {
                setSettings(response.data);
            }
        } catch (error) {
            console.error('Load settings error:', error);
            message.error('Không thể tải cài đặt');
        } finally {
            setSettingsLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'admin') {
            loadCategories();
        }
    }, [user]);

    useEffect(() => {
        if (user?.role === 'admin' && selectedCategory) {
            loadSettings(selectedCategory);
        }
    }, [selectedCategory, user]);

    const handleSaveSettings = (values) => {
        setLoading(true);
        try {
            localStorage.setItem('userSettings', JSON.stringify(values));
            message.success('Đã lưu cài đặt!');
        } catch (error) {
            message.error('Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const handleThemeChange = (checked) => {
        setTheme(checked ? 'dark' : 'light');
    };

    // Add new item
    const handleAdd = () => {
        setEditingItem(null);
        itemForm.resetFields();
        itemForm.setFieldsValue({ category: selectedCategory });
        setModalOpen(true);
    };

    // Edit item
    const handleEdit = (record) => {
        setEditingItem(record);
        itemForm.setFieldsValue({
            key: record.key,
            label: record.label,
            icon: record.icon,
            color: record.color,
            category: record.category,
        });
        setModalOpen(true);
    };

    // Delete item
    const handleDelete = async (id) => {
        try {
            await settingsService.delete(id);
            message.success('Đã xóa thành công');
            loadSettings(selectedCategory);
        } catch (error) {
            message.error('Không thể xóa');
        }
    };

    // Submit modal form
    const handleModalSubmit = async () => {
        try {
            const values = await itemForm.validateFields();

            if (editingItem) {
                await settingsService.update(editingItem.id, values);
                message.success('Đã cập nhật thành công');
            } else {
                await settingsService.create(values);
                message.success('Đã thêm mới thành công');
            }

            setModalOpen(false);
            loadSettings(selectedCategory);
        } catch (error) {
            if (error.errorFields) return; // Validation error
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    // Seed defaults
    const handleSeedDefaults = async () => {
        try {
            const response = await settingsService.seedDefaults();
            message.success(response.message);
            loadSettings(selectedCategory);
        } catch (error) {
            message.error('Không thể khởi tạo dữ liệu mặc định');
        }
    };

    const categoryLabel = categories.find(c => c.key === selectedCategory)?.label || selectedCategory;

    const columns = [
        {
            title: 'Icon',
            dataIndex: 'icon',
            key: 'icon',
            width: 60,
            render: (icon) => <span style={{ fontSize: 20 }}>{icon}</span>,
        },
        {
            title: 'Key',
            dataIndex: 'key',
            key: 'key',
            width: 120,
            render: (key) => <code style={{ fontSize: 12 }}>{key}</code>,
        },
        {
            title: 'Nhãn hiển thị',
            dataIndex: 'label',
            key: 'label',
        },
        {
            title: 'Màu',
            dataIndex: 'color',
            key: 'color',
            width: 100,
            render: (color) => color ? <Tag color={color}>{color}</Tag> : '-',
        },
        {
            title: 'Thứ tự',
            dataIndex: 'sort_order',
            key: 'sort_order',
            width: 80,
        },
        {
            title: '',
            key: 'actions',
            width: 100,
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title="Xác nhận xóa?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const colorOptions = [
        'blue', 'cyan', 'green', 'lime', 'gold', 'yellow', 'orange', 'volcano',
        'red', 'magenta', 'purple', 'geekblue', 'processing', 'success', 'warning',
        'error', 'default'
    ];

    const tabItems = [
        {
            key: 'general',
            label: 'Cài đặt chung',
            children: (
                <>
                    <Card
                        title={<Space>{isDarkMode ? <MoonOutlined /> : <SunOutlined />} Giao diện</Space>}
                        bordered={false}
                        style={{ marginBottom: 24 }}
                    >
                        <Row align="middle" justify="space-between">
                            <Col>
                                <Text strong>Chế độ tối</Text>
                                <br />
                                <Text type="secondary">Giảm mỏi mắt khi làm việc trong môi trường thiếu sáng</Text>
                            </Col>
                            <Col>
                                <Switch
                                    checked={isDarkMode}
                                    onChange={handleThemeChange}
                                    checkedChildren={<MoonOutlined />}
                                    unCheckedChildren={<SunOutlined />}
                                    style={{ minWidth: 60 }}
                                />
                            </Col>
                        </Row>
                    </Card>

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSaveSettings}
                        initialValues={{
                            tablePageSize: savedSettings.tablePageSize || 20,
                            showNotifications: savedSettings.showNotifications !== false,
                            autoRefresh: savedSettings.autoRefresh || false,
                            refreshInterval: savedSettings.refreshInterval || 60,
                            dateFormat: savedSettings.dateFormat || 'DD/MM/YYYY',
                        }}
                    >
                        <Card title="Hiển thị" bordered={false} style={{ marginBottom: 24 }}>
                            <Form.Item name="tablePageSize" label="Số dòng mặc định trên mỗi trang">
                                <Select style={{ width: 200 }}>
                                    <Select.Option value={10}>10 dòng</Select.Option>
                                    <Select.Option value={20}>20 dòng</Select.Option>
                                    <Select.Option value={50}>50 dòng</Select.Option>
                                    <Select.Option value={100}>100 dòng</Select.Option>
                                </Select>
                            </Form.Item>

                            <Form.Item name="dateFormat" label="Định dạng ngày tháng">
                                <Radio.Group>
                                    <Radio value="DD/MM/YYYY">DD/MM/YYYY</Radio>
                                    <Radio value="YYYY-MM-DD">YYYY-MM-DD</Radio>
                                    <Radio value="MM/DD/YYYY">MM/DD/YYYY</Radio>
                                </Radio.Group>
                            </Form.Item>
                        </Card>

                        <Card title="Thông báo & Làm mới" bordered={false} style={{ marginBottom: 24 }}>
                            <Form.Item name="showNotifications" label="Hiển thị thông báo" valuePropName="checked">
                                <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
                            </Form.Item>

                            <Form.Item name="autoRefresh" label="Tự động làm mới dữ liệu" valuePropName="checked">
                                <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
                            </Form.Item>

                            <Form.Item name="refreshInterval" label="Thời gian làm mới">
                                <Select style={{ width: 200 }}>
                                    <Select.Option value={30}>30 giây</Select.Option>
                                    <Select.Option value={60}>1 phút</Select.Option>
                                    <Select.Option value={120}>2 phút</Select.Option>
                                    <Select.Option value={300}>5 phút</Select.Option>
                                </Select>
                            </Form.Item>
                        </Card>

                        <Card bordered={false}>
                            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                                Lưu cài đặt
                            </Button>
                        </Card>
                    </Form>
                </>
            ),
        },
    ];

    // Add lookup management tab for admins
    if (user?.role === 'admin') {
        tabItems.push({
            key: 'lookups',
            label: (
                <Space>
                    <DatabaseOutlined />
                    Quản lý danh mục
                </Space>
            ),
            children: (
                <Card bordered={false}>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                        <Col flex="auto">
                            <Select
                                value={selectedCategory}
                                onChange={setSelectedCategory}
                                style={{ width: 300 }}
                                size="large"
                            >
                                {categories.map(cat => (
                                    <Select.Option key={cat.key} value={cat.key}>
                                        <div>
                                            <Text strong>{cat.label}</Text>
                                            <br />
                                            <Text type="secondary" style={{ fontSize: 12 }}>{cat.description}</Text>
                                        </div>
                                    </Select.Option>
                                ))}
                            </Select>
                        </Col>
                        <Col>
                            <Space>
                                <Button icon={<PlusOutlined />} type="primary" onClick={handleAdd}>
                                    Thêm mới
                                </Button>
                                <Popconfirm
                                    title="Khởi tạo dữ liệu mặc định?"
                                    description="Các giá trị đã tồn tại sẽ được giữ nguyên."
                                    onConfirm={handleSeedDefaults}
                                    okText="Khởi tạo"
                                    cancelText="Hủy"
                                >
                                    <Button icon={<DatabaseOutlined />}>
                                        Khởi tạo mặc định
                                    </Button>
                                </Popconfirm>
                            </Space>
                        </Col>
                    </Row>

                    <Divider style={{ margin: '16px 0' }} />

                    <Title level={5} style={{ marginBottom: 16 }}>{categoryLabel}</Title>

                    {settingsLoading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <Spin size="large" />
                        </div>
                    ) : settings.length > 0 ? (
                        <Table
                            columns={columns}
                            dataSource={settings}
                            rowKey="id"
                            pagination={false}
                            size="small"
                        />
                    ) : (
                        <Empty
                            description="Chưa có dữ liệu. Nhấn 'Khởi tạo mặc định' để tạo giá trị mẫu."
                        />
                    )}
                </Card>
            ),
        });
    }

    return (
        <div className="settings-page">
            <div className="page-header">
                <Title level={3}>
                    <SettingOutlined style={{ marginRight: 8 }} />
                    Cài đặt
                </Title>
                <Text type="secondary">Tùy chỉnh ứng dụng theo ý thích của bạn</Text>
            </div>

            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="large"
            />

            {/* Add/Edit Modal */}
            <Modal
                title={editingItem ? 'Chỉnh sửa' : 'Thêm mới'}
                open={modalOpen}
                onOk={handleModalSubmit}
                onCancel={() => setModalOpen(false)}
                okText={editingItem ? 'Cập nhật' : 'Thêm'}
                cancelText="Hủy"
            >
                <Form form={itemForm} layout="vertical" style={{ marginTop: 24 }}>
                    <Form.Item name="category" hidden>
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="key"
                        label="Key (mã định danh)"
                        rules={[
                            { required: true, message: 'Vui lòng nhập key' },
                            { pattern: /^[a-z0-9_]+$/, message: 'Key chỉ chứa chữ thường, số và dấu _' },
                        ]}
                    >
                        <Input placeholder="vd: laptop, server, production" disabled={!!editingItem} />
                    </Form.Item>

                    <Form.Item
                        name="label"
                        label="Nhãn hiển thị"
                        rules={[{ required: true, message: 'Vui lòng nhập nhãn' }]}
                    >
                        <Input placeholder="vd: Laptop, Server, Production" />
                    </Form.Item>

                    <Form.Item name="icon" label="Icon (emoji)">
                        <Input placeholder="vd: 💻 🖥️ 🟢" style={{ fontSize: 20 }} maxLength={4} />
                    </Form.Item>

                    <Form.Item name="color" label="Màu">
                        <Select placeholder="Chọn màu" allowClear>
                            {colorOptions.map(color => (
                                <Select.Option key={color} value={color}>
                                    <Tag color={color}>{color}</Tag>
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SettingsPage;
