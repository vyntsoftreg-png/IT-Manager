import { useState } from 'react';
import { Card, Form, Input, Button, Typography, Space, message, Divider, Descriptions, Avatar, Row, Col } from 'antd';
import { UserOutlined, LockOutlined, SaveOutlined, MailOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const { Title, Text } = Typography;

const ProfilePage = () => {
    const { user, refreshUser } = useAuth();
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    const handleUpdateProfile = async (values) => {
        setLoading(true);
        try {
            const response = await api.put('/auth/profile', values);
            if (response.data.success) {
                message.success(t('profile.profileUpdated'));
                if (refreshUser) refreshUser();
            }
        } catch (error) {
            message.error(error.response?.data?.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (values) => {
        setPasswordLoading(true);
        try {
            const response = await api.put('/auth/change-password', {
                current_password: values.current_password,
                new_password: values.new_password,
            });
            if (response.data.success) {
                message.success(t('profile.passwordChanged'));
                passwordForm.resetFields();
            }
        } catch (error) {
            message.error(error.response?.data?.message || t('common.error'));
        } finally {
            setPasswordLoading(false);
        }
    };

    const getRoleBadge = (role) => {
        const roleConfig = {
            admin: { color: '#f5222d', text: 'Administrator' },
            it_ops: { color: '#1890ff', text: 'IT Operations' },
            viewer: { color: '#52c41a', text: 'Viewer' },
        };
        return roleConfig[role] || { color: '#999', text: role };
    };

    const roleBadge = getRoleBadge(user?.role);

    return (
        <div className="profile-page">
            <div className="page-header">
                <Title level={3}>{t('profile.title')}</Title>
                <Text type="secondary">{t('profile.subtitle')}</Text>
            </div>

            <Row gutter={24}>
                <Col xs={24} lg={8}>
                    <Card bordered={false}>
                        <div style={{ textAlign: 'center' }}>
                            <Avatar
                                size={100}
                                icon={<UserOutlined />}
                                style={{ backgroundColor: '#1677ff', marginBottom: 16 }}
                            />
                            <Title level={4} style={{ marginBottom: 4 }}>
                                {user?.display_name || user?.username}
                            </Title>
                            <Text
                                style={{
                                    color: roleBadge.color,
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    fontSize: 12,
                                }}
                            >
                                {roleBadge.text}
                            </Text>
                        </div>
                        <Divider />
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Username">{user?.username}</Descriptions.Item>
                            <Descriptions.Item label="Email">{user?.email || t('common.none')}</Descriptions.Item>
                            <Descriptions.Item label={t('profile.role')}>{roleBadge.text}</Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>

                <Col xs={24} lg={16}>
                    <Card title={t('profile.updateInfo')} bordered={false} style={{ marginBottom: 24 }}>
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleUpdateProfile}
                            initialValues={{
                                display_name: user?.display_name,
                                email: user?.email,
                            }}
                        >
                            <Form.Item
                                name="display_name"
                                label={t('profile.displayName')}
                                rules={[{ required: true, message: t('validation.required') }]}
                            >
                                <Input prefix={<UserOutlined />} placeholder={t('profile.displayName')} />
                            </Form.Item>

                            <Form.Item
                                name="email"
                                label="Email"
                                rules={[{ type: 'email', message: t('validation.invalidEmail') }]}
                            >
                                <Input prefix={<MailOutlined />} placeholder="Email" />
                            </Form.Item>

                            <Form.Item>
                                <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                                    {t('profile.saveChanges')}
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>

                    <Card title={t('profile.changePassword')} bordered={false}>
                        <Form
                            form={passwordForm}
                            layout="vertical"
                            onFinish={handleChangePassword}
                        >
                            <Form.Item
                                name="current_password"
                                label={t('profile.currentPassword')}
                                rules={[{ required: true, message: t('validation.required') }]}
                            >
                                <Input.Password prefix={<LockOutlined />} placeholder={t('profile.currentPassword')} />
                            </Form.Item>

                            <Form.Item
                                name="new_password"
                                label={t('profile.newPassword')}
                                rules={[
                                    { required: true, message: t('validation.required') },
                                    { min: 6, message: t('validation.minLength', { min: 6 }) },
                                ]}
                            >
                                <Input.Password prefix={<LockOutlined />} placeholder={t('profile.newPassword')} />
                            </Form.Item>

                            <Form.Item
                                name="confirm_password"
                                label={t('profile.confirmPassword')}
                                dependencies={['new_password']}
                                rules={[
                                    { required: true, message: t('validation.required') },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (!value || getFieldValue('new_password') === value) {
                                                return Promise.resolve();
                                            }
                                            return Promise.reject(new Error(t('profile.passwordMismatch')));
                                        },
                                    }),
                                ]}
                            >
                                <Input.Password prefix={<LockOutlined />} placeholder={t('profile.confirmPassword')} />
                            </Form.Item>

                            <Form.Item>
                                <Button type="primary" htmlType="submit" loading={passwordLoading} icon={<LockOutlined />}>
                                    {t('profile.changePassword')}
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ProfilePage;
