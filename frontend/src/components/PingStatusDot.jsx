import { Tooltip, Badge } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import './PingStatusDot.css';

const PingStatusDot = ({
    status,
    responseTime,
    size = 'small',
    showTooltip = true,
    hasConflict = false,
    mac = null,
    previousMac = null,
}) => {
    const sizeClass = size === 'large' ? 'ping-dot-large' : 'ping-dot-small';

    const statusConfig = {
        online: {
            className: 'ping-dot-online',
            label: 'Online',
            color: '#52c41a',
        },
        offline: {
            className: 'ping-dot-offline',
            label: 'Offline',
            color: '#ff4d4f',
        },
        blocked: {
            className: 'ping-dot-blocked',
            label: 'Online (Chặn ICMP)',
            color: '#faad14',
        },
        unknown: {
            className: 'ping-dot-unknown',
            label: 'Chưa kiểm tra',
            color: '#8c8c8c',
        },
        checking: {
            className: 'ping-dot-checking',
            label: 'Đang kiểm tra...',
            color: '#1677ff',
        },
        error: {
            className: 'ping-dot-error',
            label: 'Lỗi',
            color: '#ff4d4f',
        },
    };

    const config = statusConfig[status] || statusConfig.unknown;

    const tooltipContent = (
        <div>
            <div><strong>{config.label}</strong></div>
            {responseTime !== null && responseTime !== undefined && (
                <div>Response: {responseTime.toFixed(1)}ms</div>
            )}
            {mac && <div style={{ fontSize: 11, color: '#aaa' }}>MAC: {mac}</div>}
            {hasConflict && previousMac && (
                <div style={{ color: '#ff4d4f', marginTop: 4 }}>
                    <WarningOutlined /> Xung đột IP!<br />
                    <span style={{ fontSize: 11 }}>MAC trước: {previousMac}</span>
                </div>
            )}
        </div>
    );

    const dot = (
        <span
            className={`ping-dot ${sizeClass} ${config.className}`}
            style={{ '--dot-color': config.color }}
        />
    );

    // Wrap with conflict badge if has conflict
    const dotWithBadge = hasConflict ? (
        <Badge count={<WarningOutlined style={{ color: '#ff4d4f', fontSize: 10 }} />} size="small" offset={[-2, 2]}>
            {dot}
        </Badge>
    ) : dot;

    if (!showTooltip) return dotWithBadge;

    return (
        <Tooltip title={tooltipContent}>
            {dotWithBadge}
        </Tooltip>
    );
};

export default PingStatusDot;
