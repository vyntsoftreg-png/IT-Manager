import { useState } from 'react';
import { Card, Form, Input, Button, Typography, Space, message, Divider, Descriptions, Avatar, Row, Col } from 'antd';
import { UserOutlined, LockOutlined, SaveOutlined, MailOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const { Title, Text } = Typography;

const ProfilePage = () => {
    const { user, refreshUser } = useAuth();
    const [form] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    const handleUpdateProfile = async (values) => {
        setLoading(true);
        try {
            const response = await api.put('/auth/profile', values);
            if (response.data.success) {
                message.success('Cập nhật thông tin thành công!');
                if (refreshUser) refreshUser();
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
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
                message.success('Đổi mật khẩu thành công!');
                passwordForm.resetFields();
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
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
                <Title level={3}>Thông tin cá nhân</Title>
                <Text type="secondary">Quản lý thông tin tài khoản của bạn</Text>
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
                            <Descriptions.Item label="Email">{user?.email || 'Chưa có'}</Descriptions.Item>
                            <Descriptions.Item label="Vai trò">{roleBadge.text}</Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>

                <Col xs={24} lg={16}>
                    <Card title="Cập nhật thông tin" bordered={false} style={{ marginBottom: 24 }}>
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
                                label="Tên hiển thị"
                                rules={[{ required: true, message: 'Vui lòng nhập tên hiển thị' }]}
                            >
                                <Input prefix={<UserOutlined />} placeholder="Tên hiển thị" />
                            </Form.Item>

                            <Form.Item
                                name="email"
                                label="Email"
                                rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
                            >
                                <Input prefix={<MailOutlined />} placeholder="Email" />
                            </Form.Item>

                            <Form.Item>
                                <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                                    Lưu thay đổi
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>

                    <Card title="Đổi mật khẩu" bordered={false}>
                        <Form
                            form={passwordForm}
                            layout="vertical"
                            onFinish={handleChangePassword}
                        >
                            <Form.Item
                                name="current_password"
                                label="Mật khẩu hiện tại"
                                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
                            >
                                <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu hiện tại" />
                            </Form.Item>

                            <Form.Item
                                name="new_password"
                                label="Mật khẩu mới"
                                rules={[
                                    { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                                    { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
                                ]}
                            >
                                <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu mới" />
                            </Form.Item>

                            <Form.Item
                                name="confirm_password"
                                label="Xác nhận mật khẩu mới"
                                dependencies={['new_password']}
                                rules={[
                                    { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (!value || getFieldValue('new_password') === value) {
                                                return Promise.resolve();
                                            }
                                            return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                                        },
                                    }),
                                ]}
                            >
                                <Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu mới" />
                            </Form.Item>

                            <Form.Item>
                                <Button type="primary" htmlType="submit" loading={passwordLoading} icon={<LockOutlined />}>
                                    Đổi mật khẩu
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
