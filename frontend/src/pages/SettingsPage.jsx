import { useState, useEffect } from 'react';
import {
    Card, Form, Switch, Select, Button, Typography, Space, message,
    Divider, Radio, Row, Col, Tabs, Table, Modal, Input, Tag, Popconfirm, Empty, Spin,
    Alert, Collapse
} from 'antd';
import {
    SettingOutlined, SaveOutlined, SunOutlined, MoonOutlined,
    PlusOutlined, EditOutlined, DeleteOutlined, DatabaseOutlined,
    SendOutlined, CheckCircleOutlined, QuestionCircleOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { settingsService } from '../services/settingsService';
import { telegramService } from '../services/telegramService';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const SettingsPage = () => {
    const { isDarkMode, setTheme } = useTheme();
    const { user } = useAuth();
    const { t } = useTranslation();
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

    // Telegram settings state
    const [botToken, setBotToken] = useState('');
    const [chatId, setChatId] = useState('');
    const [telegramLoading, setTelegramLoading] = useState(false);
    const [botConfigured, setBotConfigured] = useState(false);
    const [chatConfigured, setChatConfigured] = useState(false);

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
            message.error(t('common.operationFailed'));
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

    // Load Telegram settings
    useEffect(() => {
        const loadTelegramSettings = async () => {
            try {
                // Load chat ID for current user
                const chatRes = await telegramService.getMyChatId();
                if (chatRes.success) {
                    setChatId(chatRes.data.telegram_chat_id || '');
                    setChatConfigured(chatRes.data.is_configured);
                }

                // Load bot token for admin
                if (user?.role === 'admin') {
                    const botRes = await telegramService.getBotToken();
                    if (botRes.success) {
                        setBotToken(botRes.data.bot_token || '');
                        setBotConfigured(botRes.data.is_configured);
                    }
                }
            } catch (error) {
                console.error('Load telegram settings error:', error);
            }
        };
        if (user) loadTelegramSettings();
    }, [user]);

    // Telegram handlers
    const handleSaveBotToken = async () => {
        setTelegramLoading(true);
        try {
            const res = await telegramService.updateBotToken(botToken);
            if (res.success) {
                message.success(res.message);
                setBotConfigured(true);
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi lưu Bot Token');
        } finally {
            setTelegramLoading(false);
        }
    };

    const handleSaveChatId = async () => {
        setTelegramLoading(true);
        try {
            const res = await telegramService.updateMyChatId(chatId);
            if (res.success) {
                message.success(res.message);
                setChatConfigured(true);
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi lưu Chat ID');
        } finally {
            setTelegramLoading(false);
        }
    };

    const handleTestTelegram = async () => {
        setTelegramLoading(true);
        try {
            const res = await telegramService.sendTestMessage();
            if (res.success) {
                message.success(res.message);
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi gửi tin nhắn test');
        } finally {
            setTelegramLoading(false);
        }
    };

    const handleSaveSettings = (values) => {
        setLoading(true);
        try {
            localStorage.setItem('userSettings', JSON.stringify(values));
            message.success(t('common.saveSuccess'));
        } catch (error) {
            message.error(t('common.error'));
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
            message.success(t('common.deleteSuccess'));
            loadSettings(selectedCategory);
        } catch (error) {
            message.error(t('common.operationFailed'));
        }
    };

    // Submit modal form
    const handleModalSubmit = async () => {
        try {
            const values = await itemForm.validateFields();

            if (editingItem) {
                await settingsService.update(editingItem.id, values);
                message.success(t('common.updateSuccess'));
            } else {
                await settingsService.create(values);
                message.success(t('common.createSuccess'));
            }

            setModalOpen(false);
            loadSettings(selectedCategory);
        } catch (error) {
            if (error.errorFields) return; // Validation error
            message.error(error.response?.data?.message || t('common.error'));
        }
    };

    // Seed defaults
    const handleSeedDefaults = async () => {
        try {
            const response = await settingsService.seedDefaults();
            message.success(response.message);
            loadSettings(selectedCategory);
        } catch (error) {
            message.error(t('common.operationFailed'));
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
            title: t('settings.displayLabel'),
            dataIndex: 'label',
            key: 'label',
        },
        {
            title: t('settings.color'),
            dataIndex: 'color',
            key: 'color',
            width: 100,
            render: (color) => color ? <Tag color={color}>{color}</Tag> : '-',
        },
        {
            title: t('settings.sortOrder'),
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
            label: t('settings.general'),
            children: (
                <>
                    <Card
                        title={<Space>{isDarkMode ? <MoonOutlined /> : <SunOutlined />} {t('settings.appearance')}</Space>}
                        bordered={false}
                        style={{ marginBottom: 24 }}
                    >
                        <Row align="middle" justify="space-between">
                            <Col>
                                <Text strong>{t('settings.darkMode')}</Text>
                                <br />
                                <Text type="secondary">{t('settings.darkModeDescription')}</Text>
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
                        <Card title={t('settings.display')} bordered={false} style={{ marginBottom: 24 }}>
                            <Form.Item name="tablePageSize" label={t('settings.rowsPerPage')}>
                                <Select style={{ width: 200 }}>
                                    <Select.Option value={10}>{t('settings.rows', { count: 10 })}</Select.Option>
                                    <Select.Option value={20}>{t('settings.rows', { count: 20 })}</Select.Option>
                                    <Select.Option value={50}>{t('settings.rows', { count: 50 })}</Select.Option>
                                    <Select.Option value={100}>{t('settings.rows', { count: 100 })}</Select.Option>
                                </Select>
                            </Form.Item>

                            <Form.Item name="dateFormat" label={t('settings.dateFormat')}>
                                <Radio.Group>
                                    <Radio value="DD/MM/YYYY">DD/MM/YYYY</Radio>
                                    <Radio value="YYYY-MM-DD">YYYY-MM-DD</Radio>
                                    <Radio value="MM/DD/YYYY">MM/DD/YYYY</Radio>
                                </Radio.Group>
                            </Form.Item>
                        </Card>

                        <Card title={t('settings.notifications')} bordered={false} style={{ marginBottom: 24 }}>
                            <Form.Item name="showNotifications" label={t('settings.showNotifications')} valuePropName="checked">
                                <Switch checkedChildren={t('common.on')} unCheckedChildren={t('common.off')} />
                            </Form.Item>

                            <Form.Item name="autoRefresh" label={t('settings.autoRefresh')} valuePropName="checked">
                                <Switch checkedChildren={t('common.on')} unCheckedChildren={t('common.off')} />
                            </Form.Item>

                            <Form.Item name="refreshInterval" label={t('settings.refreshInterval')}>
                                <Select style={{ width: 200 }}>
                                    <Select.Option value={30}>{t('settings.seconds', { count: 30 })}</Select.Option>
                                    <Select.Option value={60}>{t('settings.minutes', { count: 1 })}</Select.Option>
                                    <Select.Option value={120}>{t('settings.minutes', { count: 2 })}</Select.Option>
                                    <Select.Option value={300}>{t('settings.minutes', { count: 5 })}</Select.Option>
                                </Select>
                            </Form.Item>
                        </Card>

                        <Card bordered={false}>
                            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                                {t('settings.saveSettings')}
                            </Button>
                        </Card>
                    </Form>
                </>
            ),
        },
        {
            key: 'personal',
            label: (
                <Space>
                    <SettingOutlined />
                    {t('telegram.personalSettings')}
                </Space>
            ),
            children: (
                <Card title={t('telegram.title')} bordered={false}>
                    <Alert
                        message={t('telegram.alerts.reminderInfo')}
                        description={t('telegram.alerts.reminderDescription')}
                        type="info"
                        showIcon
                        style={{ marginBottom: 24 }}
                    />

                    <Collapse ghost defaultActiveKey={['howto']}>
                        <Collapse.Panel header={<Space><QuestionCircleOutlined /> {t('telegram.howToGetChatId')}</Space>} key="howto">
                            <ol>
                                <li>{t('telegram.chatIdInstructions.0')}</li>
                                <li>{t('telegram.chatIdInstructions.1')}</li>
                                <li>{t('telegram.chatIdInstructions.2')}</li>
                                <li>{t('telegram.chatIdInstructions.3')}</li>
                            </ol>
                        </Collapse.Panel>
                    </Collapse>

                    <Form layout="vertical" style={{ marginTop: 16 }}>
                        <Form.Item label={t('telegram.chatIdLabel')}>
                            <Space.Compact style={{ width: '100%' }}>
                                <Input
                                    placeholder="123456789"
                                    value={chatId}
                                    onChange={(e) => setChatId(e.target.value)}
                                    suffix={chatConfigured ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : null}
                                />
                                <Button
                                    type="primary"
                                    onClick={handleSaveChatId}
                                    loading={telegramLoading}
                                    icon={<SaveOutlined />}
                                >
                                    {t('telegram.save')}
                                </Button>
                            </Space.Compact>
                        </Form.Item>

                        {chatConfigured && (
                            <Button
                                onClick={handleTestTelegram}
                                loading={telegramLoading}
                                icon={<SendOutlined />}
                            >
                                {t('telegram.sendTest')}
                            </Button>
                        )}
                    </Form>
                </Card>
            ),
        },
    ];

    // Add lookup management tab for admins
    if (user?.role === 'admin') {
        tabItems.push({
            key: 'telegram-admin',
            label: (
                <Space>
                    <SendOutlined />
                    {t('telegram.adminSettings')}
                </Space>
            ),
            children: (
                <Card title={t('telegram.adminSettings')} bordered={false}>
                    <Alert
                        message={t('telegram.alerts.botConfigInfo')}
                        description={t('telegram.alerts.botConfigDescription')}
                        type="warning"
                        showIcon
                        style={{ marginBottom: 24 }}
                    />

                    <Collapse ghost>
                        <Collapse.Panel header={<Space><QuestionCircleOutlined /> {t('telegram.howToCreateBot')}</Space>} key="howto">
                            <ol>
                                <li>{t('telegram.botInstructions.0')}</li>
                                <li>{t('telegram.botInstructions.1')}</li>
                                <li>{t('telegram.botInstructions.2')}</li>
                                <li>{t('telegram.botInstructions.3')}</li>
                                <li>{t('telegram.botInstructions.4')}</li>
                            </ol>
                        </Collapse.Panel>
                    </Collapse>

                    <Form layout="vertical" style={{ marginTop: 16, maxWidth: 600 }}>
                        <Form.Item label={t('telegram.botTokenLabel')}>
                            <Space.Compact style={{ width: '100%' }}>
                                <Input.Password
                                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                                    value={botToken}
                                    onChange={(e) => setBotToken(e.target.value)}
                                />
                                <Button
                                    type="primary"
                                    onClick={handleSaveBotToken}
                                    loading={telegramLoading}
                                    icon={<SaveOutlined />}
                                >
                                    {t('telegram.saveAndTest')}
                                </Button>
                            </Space.Compact>
                        </Form.Item>

                        {botConfigured && (
                            <Alert
                                message={t('telegram.alerts.botConfigured')}
                                type="success"
                                showIcon
                                icon={<CheckCircleOutlined />}
                            />
                        )}
                    </Form>
                </Card>
            ),
        });

        tabItems.push({
            key: 'lookups',
            label: (
                <Space>
                    <DatabaseOutlined />
                    {t('settings.lookupManagement')}
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
                                    {t('common.add')}
                                </Button>
                                <Popconfirm
                                    title={t('settings.seedDefaultsTitle')}
                                    description={t('settings.seedDefaultsDesc')}
                                    onConfirm={handleSeedDefaults}
                                    okText={t('settings.initialize')}
                                    cancelText={t('common.cancel')}
                                >
                                    <Button icon={<DatabaseOutlined />}>
                                        {t('settings.seedDefaults')}
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
                            description={t('settings.noData')}
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
                    {t('settings.title')}
                </Title>
                <Text type="secondary">{t('settings.subtitle')}</Text>
            </div>

            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="large"
            />

            {/* Add/Edit Modal */}
            <Modal
                title={editingItem ? t('common.edit') : t('common.add')}
                open={modalOpen}
                onOk={handleModalSubmit}
                onCancel={() => setModalOpen(false)}
                okText={editingItem ? t('common.save') : t('common.add')}
                cancelText={t('common.cancel')}
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
