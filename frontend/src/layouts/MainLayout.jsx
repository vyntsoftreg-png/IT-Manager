import { useState } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, Typography, theme } from 'antd';
import {
    DashboardOutlined,
    LaptopOutlined,
    GlobalOutlined,
    KeyOutlined,
    UserOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    SettingOutlined,
    HistoryOutlined,
    FileTextOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import GlobalSearch from '../components/GlobalSearch';
import LanguageSwitcher from '../components/LanguageSwitcher';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { token } = theme.useToken();
    const { t } = useTranslation();

    const baseMenuItems = [
        {
            key: '/',
            icon: <DashboardOutlined />,
            label: t('menu.dashboard'),
        },
        {
            key: '/devices',
            icon: <LaptopOutlined />,
            label: t('menu.devices'),
        },
        {
            key: '/ip-map',
            icon: <GlobalOutlined />,
            label: t('menu.ipMap'),
        },
        {
            key: '/accounts',
            icon: <KeyOutlined />,
            label: t('menu.accounts'),
        },
        {
            key: '/tasks',
            icon: <FileTextOutlined />,
            label: t('menu.tasks'),
        },
    ];

    // Add audit logs menu for admin only
    const menuItems = user?.role === 'admin'
        ? [
            ...baseMenuItems,
            {
                key: '/audit-logs',
                icon: <HistoryOutlined />,
                label: t('menu.auditLog'),
            },
        ]
        : baseMenuItems;

    const userMenuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: t('menu.profile'),
        },
        {
            key: 'settings',
            icon: <SettingOutlined />,
            label: t('menu.settings'),
        },
        {
            type: 'divider',
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: t('menu.logout'),
            danger: true,
        },
    ];

    const handleMenuClick = ({ key }) => {
        navigate(key);
    };

    const handleUserMenuClick = ({ key }) => {
        if (key === 'logout') {
            logout();
            navigate('/login');
        } else if (key === 'profile') {
            navigate('/profile');
        } else if (key === 'settings') {
            navigate('/settings');
        }
    };

    const getRoleBadge = (role) => {
        const roleConfig = {
            admin: { color: '#f5222d', text: 'Admin' },
            it_ops: { color: '#1890ff', text: 'IT Ops' },
            viewer: { color: '#52c41a', text: 'Viewer' },
        };
        return roleConfig[role] || { color: '#999', text: role };
    };

    const roleBadge = getRoleBadge(user?.role);

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                theme="light"
                className="main-sider"
                width={240}
            >
                <div className="sider-logo">
                    <span className="logo-icon">🖥️</span>
                    {!collapsed && <span className="logo-text">IT Manager</span>}
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={handleMenuClick}
                    className="sider-menu"
                />
            </Sider>
            <Layout>
                <Header className="main-header">
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        className="collapse-button"
                    />
                    <GlobalSearch />
                    <div className="header-right">
                        <LanguageSwitcher />
                        <Dropdown
                            menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
                            placement="bottomRight"
                            trigger={['click']}
                        >
                            <div className="user-dropdown">
                                <Avatar
                                    style={{ backgroundColor: token.colorPrimary }}
                                    icon={<UserOutlined />}
                                />
                                <div className="user-info">
                                    <Text strong>{user?.display_name || user?.username}</Text>
                                    <Text
                                        style={{
                                            fontSize: 11,
                                            color: roleBadge.color,
                                            textTransform: 'uppercase',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {roleBadge.text}
                                    </Text>
                                </div>
                            </div>
                        </Dropdown>
                    </div>
                </Header>
                <Content className="main-content">
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;
