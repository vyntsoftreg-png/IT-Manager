import { useState } from 'react';
import {
    Form,
    Input,
    Select,
    Radio,
    Button,
    Card,
    Typography,
    message,
    Result,
    Divider,
    Row,
    Col,
    Space,
} from 'antd';
import {
    UserOutlined,
    MailOutlined,
    PhoneOutlined,
    BankOutlined,
    EnvironmentOutlined,
    ToolOutlined,
    CheckCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import taskService from '../services/taskService';
import LanguageSwitcher from '../components/LanguageSwitcher';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const SupportRequestPage = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [taskNumber, setTaskNumber] = useState('');
    const { t } = useTranslation();

    // Category options with translations
    const categoryOptions = [
        { value: 'hardware', label: `🖥️ ${t('tasks.categories.hardware')}`, icon: '🖥️' },
        { value: 'software', label: `💿 ${t('tasks.categories.software')}`, icon: '💿' },
        { value: 'network', label: `🌐 ${t('tasks.categories.network')}`, icon: '🌐' },
        { value: 'email', label: `📧 ${t('tasks.categories.email')}`, icon: '📧' },
        { value: 'account', label: `🔐 ${t('tasks.categories.account')}`, icon: '🔐' },
        { value: 'other', label: `📦 ${t('tasks.categories.other')}`, icon: '📦' },
    ];

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const response = await taskService.submitSupportRequest(values);
            if (response.success) {
                setTaskNumber(response.data.task_number);
                setSubmitted(true);
                message.success(t('support.success.title'));
            }
        } catch (error) {
            message.error(error.response?.data?.message || t('common.operationFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        form.resetFields();
        setSubmitted(false);
        setTaskNumber('');
    };

    if (submitted) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
            }}>
                <div style={{ position: 'absolute', top: 16, right: 16 }}>
                    <LanguageSwitcher />
                </div>
                <Card style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
                    <Result
                        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                        status="success"
                        title={t('support.success.title')}
                        subTitle={
                            <Space direction="vertical">
                                <Text>{t('support.success.message')}</Text>
                                <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                                    {taskNumber}
                                </Title>
                                <Paragraph type="secondary">
                                    {t('support.success.note')}
                                </Paragraph>
                            </Space>
                        }
                        extra={[
                            <Button type="primary" key="new" onClick={handleReset}>
                                {t('support.success.newRequest')}
                            </Button>,
                        ]}
                    />
                </Card>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '40px 24px',
        }}>
            <div style={{ position: 'absolute', top: 16, right: 16 }}>
                <LanguageSwitcher />
            </div>
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <ToolOutlined style={{ fontSize: 48, color: '#fff', marginBottom: 16 }} />
                    <Title level={2} style={{ color: '#fff', margin: 0 }}>
                        {t('support.title')}
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                        {t('support.subtitle')}
                    </Text>
                </div>

                {/* Form Card */}
                <Card bordered={false} style={{ borderRadius: 16 }}>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        initialValues={{ priority: 'medium' }}
                    >
                        {/* User Info Section */}
                        <Title level={5} style={{ marginBottom: 16 }}>
                            <UserOutlined /> {t('support.requesterInfo')}
                        </Title>

                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="requester_name"
                                    label={t('support.fullName')}
                                    rules={[{ required: true, message: t('validation.required') }]}
                                >
                                    <Input prefix={<UserOutlined />} placeholder="John Doe" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="requester_email"
                                    label={t('support.email')}
                                    rules={[
                                        { type: 'email', message: t('validation.invalidEmail') },
                                    ]}
                                >
                                    <Input prefix={<MailOutlined />} placeholder="email@company.com" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item name="requester_department" label={t('support.department')}>
                                    <Input prefix={<BankOutlined />} placeholder={t('support.department')} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="requester_phone" label={t('support.phone')}>
                                    <Input prefix={<PhoneOutlined />} placeholder="0901234567" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item name="requester_location" label={t('support.location')}>
                            <Input prefix={<EnvironmentOutlined />} placeholder={t('support.location')} />
                        </Form.Item>

                        <Divider />

                        {/* Request Details Section */}
                        <Title level={5} style={{ marginBottom: 16 }}>
                            📝 {t('support.requestDetails')}
                        </Title>

                        <Form.Item
                            name="category"
                            label={t('support.category')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <Select placeholder={t('common.selectPlaceholder')}>
                                {categoryOptions.map(cat => (
                                    <Select.Option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="title"
                            label={t('support.requestTitle')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <Input placeholder={t('support.requestTitle')} />
                        </Form.Item>

                        <Form.Item
                            name="description"
                            label={t('support.description')}
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <TextArea
                                rows={4}
                                placeholder={t('support.description')}
                            />
                        </Form.Item>

                        <Form.Item name="priority" label={t('support.priority')}>
                            <Radio.Group>
                                <Space direction="vertical">
                                    <Radio value="low">🟢 {t('support.priorities.low')}</Radio>
                                    <Radio value="medium">🟡 {t('support.priorities.medium')}</Radio>
                                    <Radio value="high">🟠 {t('support.priorities.high')}</Radio>
                                    <Radio value="urgent">🔴 {t('support.priorities.urgent')}</Radio>
                                </Space>
                            </Radio.Group>
                        </Form.Item>

                        <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                size="large"
                                block
                                style={{
                                    height: 48,
                                    fontSize: 16,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    border: 'none',
                                }}
                            >
                                🚀 {t('support.submit')}
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>

                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
                        {t('support.footer')}
                    </Text>
                </div>
            </div>
        </div>
    );
};

export default SupportRequestPage;
