import { useEffect, useRef, useState, useCallback } from 'react';
import { Alert, Spin, Space, Tag, Typography, Button, Tooltip } from 'antd';
import {
    FullscreenOutlined, FullscreenExitOutlined, DownloadOutlined,
    ZoomInOutlined, ZoomOutOutlined, CompressOutlined,
} from '@ant-design/icons';
import mermaid from 'mermaid';

const { Text } = Typography;

// Initialize mermaid with dark theme
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'basis',
        padding: 15,
        nodeSpacing: 20,
        rankSpacing: 40,
    },
    themeVariables: {
        primaryColor: '#177ddc',
        primaryTextColor: '#fff',
        primaryBorderColor: '#177ddc',
        lineColor: '#434343',
        secondaryColor: '#1f1f1f',
        tertiaryColor: '#141414',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '12px',
    },
});

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.15;

const NetworkMap = ({ segment, pingStatus = {}, rawIps = [] }) => {
    const containerRef = useRef(null);
    const viewportRef = useRef(null);
    const [error, setError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [rendering, setRendering] = useState(true);

    // Zoom & Pan state
    const [zoom, setZoom] = useState(0.5);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const panStart = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!segment || rawIps.length === 0) return;

        const renderDiagram = async () => {
            setRendering(true);
            setError(null);

            try {
                const definition = buildDiagram(segment, pingStatus, rawIps);

                if (containerRef.current) {
                    containerRef.current.innerHTML = '';
                }

                const { svg } = await mermaid.render(`netmap-${String(segment.id)}`, definition);

                if (containerRef.current) {
                    containerRef.current.innerHTML = svg;

                    const svgEl = containerRef.current.querySelector('svg');
                    if (svgEl) {
                        svgEl.removeAttribute('width');
                        svgEl.removeAttribute('height');
                        svgEl.style.width = '100%';
                        svgEl.style.height = '100%';
                    }
                }

                // Auto fit after render
                setTimeout(() => handleFitToScreen(), 100);
            } catch (err) {
                console.error('Mermaid render error:', err);
                setError(err.message || 'Failed to render network map');
            } finally {
                setRendering(false);
            }
        };

        renderDiagram();
    }, [segment?.id, Object.keys(pingStatus).length, rawIps.length]);

    // Zoom handlers
    const handleZoomIn = useCallback(() => {
        setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoom(z => Math.max(z - ZOOM_STEP, MIN_ZOOM));
    }, []);

    const handleFitToScreen = useCallback(() => {
        if (!containerRef.current || !viewportRef.current) return;

        const svgEl = containerRef.current.querySelector('svg');
        if (!svgEl) return;

        const viewBox = svgEl.viewBox?.baseVal;
        if (!viewBox || viewBox.width === 0) {
            setZoom(0.4);
            setPan({ x: 0, y: 0 });
            return;
        }

        const viewport = viewportRef.current.getBoundingClientRect();
        const scaleX = (viewport.width - 40) / viewBox.width;
        const scaleY = (viewport.height - 40) / viewBox.height;
        const fitZoom = Math.min(scaleX, scaleY, 1);

        setZoom(Math.max(fitZoom, MIN_ZOOM));
        setPan({ x: 0, y: 0 });
    }, []);

    // Mouse wheel zoom
    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)));
    }, []);

    // Pan handlers
    const handleMouseDown = useCallback((e) => {
        if (e.button !== 0) return;
        isDragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
        panStart.current = { ...pan };
        e.currentTarget.style.cursor = 'grabbing';
    }, [pan]);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging.current) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPan({
            x: panStart.current.x + dx,
            y: panStart.current.y + dy,
        });
    }, []);

    const handleMouseUp = useCallback((e) => {
        isDragging.current = false;
        if (e.currentTarget) e.currentTarget.style.cursor = 'grab';
    }, []);

    const handleDownloadSvg = () => {
        if (!containerRef.current) return;
        const svg = containerRef.current.querySelector('svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `network-map-${segment?.name || 'topology'}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    };

    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    // Stats
    const onlineCount = Object.values(pingStatus).filter(p => p.status === 'online').length;
    const blockedCount = Object.values(pingStatus).filter(p => p.status === 'blocked').length;
    const offlineCount = Object.values(pingStatus).filter(p => p.status === 'offline').length;

    const zoomPercent = Math.round(zoom * 100);

    return (
        <div style={{
            position: isFullscreen ? 'fixed' : 'relative',
            top: isFullscreen ? 0 : 'auto',
            left: isFullscreen ? 0 : 'auto',
            width: isFullscreen ? '100vw' : '100%',
            height: isFullscreen ? '100vh' : '100%',
            zIndex: isFullscreen ? 9999 : 'auto',
            background: '#141414',
            borderRadius: isFullscreen ? 0 : 8,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                borderBottom: '1px solid #303030',
                background: '#1a1a1a',
                flexShrink: 0,
            }}>
                <Space size="small" wrap>
                    <Text strong style={{ color: '#fff', fontSize: 14 }}>
                        🗺️ {segment?.name || 'Network'} Topology
                    </Text>
                    <Tag color="green">{onlineCount} Online</Tag>
                    {blockedCount > 0 && <Tag color="orange">{blockedCount} Blocked</Tag>}
                    <Tag color="red">{offlineCount} Offline</Tag>
                </Space>
                <Space size={4}>
                    {/* Zoom Controls */}
                    <Tooltip title="Zoom Out (-)">
                        <Button type="text" size="small" icon={<ZoomOutOutlined />}
                            onClick={handleZoomOut} disabled={zoom <= MIN_ZOOM}
                            style={{ color: '#8c8c8c' }}
                        />
                    </Tooltip>
                    <Text style={{ color: '#8c8c8c', fontSize: 12, minWidth: 36, textAlign: 'center', userSelect: 'none' }}>
                        {zoomPercent}%
                    </Text>
                    <Tooltip title="Zoom In (+)">
                        <Button type="text" size="small" icon={<ZoomInOutlined />}
                            onClick={handleZoomIn} disabled={zoom >= MAX_ZOOM}
                            style={{ color: '#8c8c8c' }}
                        />
                    </Tooltip>
                    <Tooltip title="Fit to Screen">
                        <Button type="text" size="small" icon={<CompressOutlined />}
                            onClick={handleFitToScreen}
                            style={{ color: '#8c8c8c' }}
                        />
                    </Tooltip>
                    <div style={{ width: 1, height: 16, background: '#303030', margin: '0 4px' }} />
                    <Tooltip title="Download SVG">
                        <Button type="text" size="small" icon={<DownloadOutlined />}
                            onClick={handleDownloadSvg} style={{ color: '#8c8c8c' }}
                        />
                    </Tooltip>
                    <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                        <Button type="text" size="small"
                            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                            onClick={toggleFullscreen} style={{ color: '#8c8c8c' }}
                        />
                    </Tooltip>
                </Space>
            </div>

            {/* Zoomable Viewport */}
            <div
                ref={viewportRef}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                    flex: 1,
                    overflow: 'hidden',
                    cursor: 'grab',
                    position: 'relative',
                    background: '#0d0d0d',
                }}
            >
                {rendering && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Spin tip="Rendering topology..." />
                    </div>
                )}
                {error && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Alert type="warning" message="Render Error" description={error} showIcon
                            style={{ maxWidth: 500 }}
                        />
                    </div>
                )}
                <div
                    ref={containerRef}
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: 'center center',
                        transition: isDragging.current ? 'none' : 'transform 0.15s ease',
                        display: rendering ? 'none' : 'flex',
                        justifyContent: 'center',
                        padding: 20,
                        minHeight: '100%',
                    }}
                />
            </div>
        </div>
    );
};

/**
 * Build a Mermaid flowchart definition from network data.
 * Uses LR (left-to-right) layout for better screen fit.
 */
function buildDiagram(segment, pingStatus, rawIps) {
    const lines = ['graph LR'];

    const esc = (str) => (str || '').replace(/"/g, '#quot;').replace(/[[\](){}]/g, '');

    // Gateway node
    const gwLabel = `🌐 ${esc(segment.name)}\\n${segment.cidr}`;
    lines.push(`    GW["${gwLabel}"]:::gateway`);

    // Group IPs by status
    const onlineIps = [];
    const blockedIps = [];
    const offlineIps = [];

    for (const ip of rawIps) {
        const ping = pingStatus[ip.ip_address];
        if (!ping) continue;

        const entry = { ...ip, ping };
        if (ping.status === 'online') onlineIps.push(entry);
        else if (ping.status === 'blocked') blockedIps.push(entry);
        else offlineIps.push(entry);
    }

    // Only render discovered devices + up to 10 offline
    const devicesToRender = [
        ...onlineIps,
        ...blockedIps,
        ...offlineIps.slice(0, 10),
    ];

    // Build subgraphs by vendor
    const vendorGroups = {};
    for (const entry of devicesToRender) {
        const vendor = entry.ping.vendor || 'Unknown';
        const groupKey = (vendor === 'Resolving...' || vendor === 'Unknown' || vendor === 'Unknown Vendor')
            ? 'Other Devices'
            : vendor;

        if (!vendorGroups[groupKey]) vendorGroups[groupKey] = [];
        vendorGroups[groupKey].push(entry);
    }

    let nodeIndex = 0;
    for (const [vendor, entries] of Object.entries(vendorGroups)) {
        const subId = `sub_${nodeIndex}`;
        lines.push(`    subgraph ${subId}["🏭 ${esc(vendor)}"]`);

        for (const entry of entries) {
            const id = `N${nodeIndex++}`;
            const hostname = entry.hostname || entry.device?.name || '';
            const ip = entry.ip_address;
            const ping = entry.ping;
            const responseMs = ping.responseTime ? `${ping.responseTime}ms` : '';

            let labelParts = [ip];
            if (hostname) labelParts.push(esc(hostname));
            if (responseMs) labelParts.push(responseMs);

            const label = labelParts.join('\\n');
            const statusClass = ping.status === 'online' ? 'online'
                : ping.status === 'blocked' ? 'blocked'
                : 'offline';

            lines.push(`        ${id}["${label}"]:::${statusClass}`);
            lines.push(`        GW --- ${id}`);
        }

        lines.push('    end');
    }

    if (devicesToRender.length === 0) {
        lines.push('    EMPTY["No devices discovered yet\\nStart a scan to populate"]:::offline');
        lines.push('    GW --- EMPTY');
    }

    // Styles
    lines.push('');
    lines.push('    classDef gateway fill:#177ddc,stroke:#177ddc,color:#fff,stroke-width:2px,font-weight:bold');
    lines.push('    classDef online fill:#274916,stroke:#49aa19,color:#fff,stroke-width:1px');
    lines.push('    classDef blocked fill:#594214,stroke:#d89614,color:#fff,stroke-width:1px');
    lines.push('    classDef offline fill:#431418,stroke:#a61d24,color:#fff,stroke-width:1px,stroke-dasharray:5');

    return lines.join('\n');
}

export default NetworkMap;
