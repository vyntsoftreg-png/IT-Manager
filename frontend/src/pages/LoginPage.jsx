import { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined, GlobalOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const { Title, Text } = Typography;

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const result = await login(values.username, values.password);
            if (result.success) {
                message.success(t('auth.loginSuccess'));
                navigate('/');
            } else {
                message.error(result.message || t('auth.loginFailed'));
            }
        } catch (error) {
            message.error(error.response?.data?.message || t('auth.loginFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-background" />
            <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
                <LanguageSwitcher />
            </div>
            <Card className="login-card" bordered={false}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div className="login-header">
                        <div className="login-logo">
                            <span className="logo-icon">🖥️</span>
                        </div>
                        <Title level={2} style={{ margin: 0, color: '#1a1a2e' }}>
                            IT Manager
                        </Title>
                        <Text type="secondary">
                            {t('auth.loginTitle')}
                        </Text>
                    </div>

                    <Form
                        name="login"
                        onFinish={onFinish}
                        autoComplete="off"
                        layout="vertical"
                        size="large"
                    >
                        <Form.Item
                            name="username"
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <Input
                                prefix={<UserOutlined />}
                                placeholder={t('auth.username')}
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: t('validation.required') }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder={t('auth.password')}
                            />
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                block
                                className="login-button"
                            >
                                {t('auth.loginButton')}
                            </Button>
                        </Form.Item>
                    </Form>

                    <div className="login-footer">
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('auth.demoAccounts')}
                        </Text>
                    </div>
                </Space>
            </Card>
        </div>
    );
};

export default LoginPage;
