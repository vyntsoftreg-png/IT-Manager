import { useState, useEffect } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, Typography, Tooltip, theme } from 'antd';
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
    DatabaseOutlined,
    BookOutlined,
    CheckSquareOutlined,
    EllipsisOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { settingsService } from '../services/settingsService';
import GlobalSearch from '../components/GlobalSearch';
import LanguageSwitcher from '../components/LanguageSwitcher';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { token } = theme.useToken();
    const { t } = useTranslation();
    const [branding, setBranding] = useState({ app_name: 'IT Manager', app_logo: '🖥️' });

    useEffect(() => {
        settingsService.getBranding()
            .then(res => {
                if (res.success) {
                    setBranding(res.data);
                    document.title = res.data.app_name || 'IT Manager';
                }
            })
            .catch(() => { });
    }, []);

    const menuItems = [
        {
            type: 'group',
            label: !collapsed ? 'OVERVIEW' : null,
            children: [
                {
                    key: '/',
                    icon: <DashboardOutlined />,
                    label: t('menu.dashboard'),
                },
                {
                    key: '/sla',
                    icon: <CheckSquareOutlined />,
                    label: 'SLA Dashboard',
                },
            ],
        },
        {
            type: 'group',
            label: !collapsed ? 'MANAGEMENT' : null,
            children: [
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
            ],
        },
        {
            type: 'group',
            label: !collapsed ? 'TASKS' : null,
            children: [
                {
                    key: '/tasks',
                    icon: <FileTextOutlined />,
                    label: t('menu.tasks'),
                },
                {
                    key: '/personal-tasks',
                    icon: <CheckSquareOutlined />,
                    label: t('menu.personalTasks') || 'Personal Tasks',
                },
            ],
        },
        {
            type: 'group',
            label: !collapsed ? 'RESOURCES' : null,
            children: [
                {
                    key: '/documents',
                    icon: <BookOutlined />,
                    label: t('menu.documents') || 'Documents',
                },
            ],
        },
        ...(user?.role === 'admin' ? [{
            type: 'group',
            label: !collapsed ? 'SYSTEM' : null,
            children: [
                {
                    key: '/audit-logs',
                    icon: <HistoryOutlined />,
                    label: t('menu.auditLog'),
                },
                {
                    key: '/backup',
                    icon: <DatabaseOutlined />,
                    label: t('menu.backup'),
                },
            ],
        }] : []),
    ];

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
            admin: { color: '#ef4444', text: 'Admin' },
            it_ops: { color: '#3b82f6', text: 'IT Ops' },
            viewer: { color: '#22c55e', text: 'Viewer' },
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
                theme="dark"
                className="main-sider"
                width={250}
                collapsedWidth={72}
            >
                {/* Logo */}
                <div className="sider-logo">
                    <span className="logo-icon">{branding.app_logo}</span>
                    {!collapsed && <span className="logo-text">{branding.app_name}</span>}
                </div>

                {/* Navigation */}
                <div className="sider-nav">
                    <Menu
                        mode="inline"
                        theme="dark"
                        selectedKeys={[location.pathname]}
                        items={menuItems}
                        onClick={handleMenuClick}
                        className="sider-menu"
                    />
                </div>

                {/* User Profile at Bottom */}
                <div className="sider-footer">
                    <Dropdown
                        menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
                        placement="topRight"
                        trigger={['click']}
                    >
                        <div className="sider-user">
                            <Avatar
                                size={collapsed ? 32 : 36}
                                style={{ backgroundColor: roleBadge.color, flexShrink: 0 }}
                                icon={<UserOutlined />}
                            />
                            {!collapsed && (
                                <div className="sider-user-info">
                                    <Text className="sider-user-name" ellipsis>
                                        {user?.display_name || user?.username}
                                    </Text>
                                    <Text className="sider-user-role">
                                        {roleBadge.text}
                                    </Text>
                                </div>
                            )}
                            {!collapsed && (
                                <EllipsisOutlined className="sider-user-more" />
                            )}
                        </div>
                    </Dropdown>
                </div>
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
                    </div>
                </Header>
                <Content className="main-content">
                    {children || <Outlet />}
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;
