import { useState } from 'react';
import { Modal, Button, Input, Tooltip, Space, Tabs, Row, Col } from 'antd';
import {
    DesktopOutlined, LaptopOutlined, MobileOutlined, TabletOutlined,
    PrinterOutlined, HddOutlined, UsbOutlined, WifiOutlined,
    CloudOutlined, CloudServerOutlined, GlobalOutlined, ApiOutlined,
    ClusterOutlined, DeploymentUnitOutlined, GatewayOutlined, BranchesOutlined,
    LockOutlined, UnlockOutlined, SafetyOutlined, KeyOutlined,
    SecurityScanOutlined, ShieldOutlined, SafetyCertificateOutlined, BugOutlined,
    DatabaseOutlined, SaveOutlined, FolderOutlined, FileOutlined,
    CloudUploadOutlined, CloudDownloadOutlined, SyncOutlined, InboxOutlined,
    AppstoreOutlined, WindowsOutlined, AppleOutlined, AndroidOutlined,
    MailOutlined, CodeOutlined, SettingOutlined, ToolOutlined,
    LineChartOutlined, BarChartOutlined, PieChartOutlined, DashboardOutlined,
    FundOutlined, MonitorOutlined, AlertOutlined, BellOutlined,
    UserOutlined, TeamOutlined, HomeOutlined, BuildOutlined,
    BankOutlined, ShopOutlined, CameraOutlined, VideoCameraOutlined,
    PhoneOutlined, EnvironmentOutlined, CompassOutlined, RocketOutlined,
} from '@ant-design/icons';

// Icon components map
const IconComponents = {
    DesktopOutlined, LaptopOutlined, MobileOutlined, TabletOutlined,
    PrinterOutlined, HddOutlined, UsbOutlined, WifiOutlined,
    CloudOutlined, CloudServerOutlined, GlobalOutlined, ApiOutlined,
    ClusterOutlined, DeploymentUnitOutlined, GatewayOutlined, BranchesOutlined,
    LockOutlined, UnlockOutlined, SafetyOutlined, KeyOutlined,
    SecurityScanOutlined, ShieldOutlined, SafetyCertificateOutlined, BugOutlined,
    DatabaseOutlined, SaveOutlined, FolderOutlined, FileOutlined,
    CloudUploadOutlined, CloudDownloadOutlined, SyncOutlined, InboxOutlined,
    AppstoreOutlined, WindowsOutlined, AppleOutlined, AndroidOutlined,
    MailOutlined, CodeOutlined, SettingOutlined, ToolOutlined,
    LineChartOutlined, BarChartOutlined, PieChartOutlined, DashboardOutlined,
    FundOutlined, MonitorOutlined, AlertOutlined, BellOutlined,
    UserOutlined, TeamOutlined, HomeOutlined, BuildOutlined,
    BankOutlined, ShopOutlined, CameraOutlined, VideoCameraOutlined,
    PhoneOutlined, EnvironmentOutlined, CompassOutlined, RocketOutlined,
};

// Common IT/System icons organized by category
const iconCategories = {
    'Devices': [
        'DesktopOutlined', 'LaptopOutlined', 'MobileOutlined', 'TabletOutlined',
        'PrinterOutlined', 'HddOutlined', 'UsbOutlined', 'WifiOutlined',
    ],
    'Cloud': [
        'CloudOutlined', 'CloudServerOutlined', 'GlobalOutlined', 'ApiOutlined',
        'ClusterOutlined', 'DeploymentUnitOutlined', 'GatewayOutlined', 'BranchesOutlined',
    ],
    'Security': [
        'LockOutlined', 'UnlockOutlined', 'SafetyOutlined', 'KeyOutlined',
        'SecurityScanOutlined', 'ShieldOutlined', 'SafetyCertificateOutlined', 'BugOutlined',
    ],
    'Storage': [
        'DatabaseOutlined', 'SaveOutlined', 'FolderOutlined', 'FileOutlined',
        'CloudUploadOutlined', 'CloudDownloadOutlined', 'SyncOutlined', 'InboxOutlined',
    ],
    'Apps': [
        'AppstoreOutlined', 'WindowsOutlined', 'AppleOutlined', 'AndroidOutlined',
        'MailOutlined', 'CodeOutlined', 'SettingOutlined', 'ToolOutlined',
    ],
    'Charts': [
        'LineChartOutlined', 'BarChartOutlined', 'PieChartOutlined', 'DashboardOutlined',
        'FundOutlined', 'MonitorOutlined', 'AlertOutlined', 'BellOutlined',
    ],
    'General': [
        'UserOutlined', 'TeamOutlined', 'HomeOutlined', 'BuildOutlined',
        'BankOutlined', 'ShopOutlined', 'CameraOutlined', 'VideoCameraOutlined',
        'PhoneOutlined', 'EnvironmentOutlined', 'CompassOutlined', 'RocketOutlined',
    ],
};

const IconPicker = ({ value, onChange }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('Devices');

    const handleSelectIcon = (iconName) => {
        onChange?.(iconName);
        setIsModalOpen(false);
    };

    const renderIcon = (iconName, style = {}) => {
        const IconComponent = IconComponents[iconName];
        return IconComponent ? <IconComponent style={style} /> : null;
    };

    const tabItems = Object.entries(iconCategories).map(([category, icons]) => ({
        key: category,
        label: category,
        children: (
            <Row gutter={[8, 8]}>
                {icons.map(iconName => (
                    <Col key={iconName} span={4}>
                        <Tooltip title={iconName.replace('Outlined', '')}>
                            <Button
                                type={value === iconName ? 'primary' : 'default'}
                                onClick={() => handleSelectIcon(iconName)}
                                style={{ width: '100%', height: 48, fontSize: 20 }}
                            >
                                {renderIcon(iconName)}
                            </Button>
                        </Tooltip>
                    </Col>
                ))}
            </Row>
        ),
    }));

    return (
        <>
            <Space>
                <Button onClick={() => setIsModalOpen(true)} style={{ minWidth: 120 }}>
                    {value ? (
                        <Space>
                            {renderIcon(value)}
                            <span style={{ fontSize: 12 }}>{value.replace('Outlined', '')}</span>
                        </Space>
                    ) : (
                        'Chọn icon'
                    )}
                </Button>
                {value && (
                    <Button type="text" size="small" onClick={() => onChange?.(null)}>
                        ✕
                    </Button>
                )}
            </Space>

            <Modal
                title="Chọn Icon"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={550}
            >
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={tabItems}
                    size="small"
                />
            </Modal>
        </>
    );
};

export default IconPicker;
export { IconComponents, iconCategories };
