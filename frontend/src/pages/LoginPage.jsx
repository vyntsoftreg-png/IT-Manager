import { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const result = await login(values.username, values.password);
            if (result.success) {
                message.success('Đăng nhập thành công!');
                navigate('/');
            } else {
                message.error(result.message || 'Đăng nhập thất bại');
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Đăng nhập thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-background" />
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
                            Hệ thống quản lý hạ tầng IT
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
                            rules={[{ required: true, message: 'Vui lòng nhập username!' }]}
                        >
                            <Input
                                prefix={<UserOutlined />}
                                placeholder="Username"
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: 'Vui lòng nhập password!' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="Password"
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
                                Đăng nhập
                            </Button>
                        </Form.Item>
                    </Form>

                    <div className="login-footer">
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Demo accounts: admin / itops / viewer (password: [username]123)
                        </Text>
                    </div>
                </Space>
            </Card>
        </div>
    );
};

export default LoginPage;
