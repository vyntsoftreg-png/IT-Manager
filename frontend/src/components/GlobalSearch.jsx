import { useState, useCallback } from 'react';
import { Input, Dropdown, Space, Tag, Typography, Empty, Spin } from 'antd';
import {
    SearchOutlined, LaptopOutlined, GlobalOutlined, KeyOutlined,
    ApartmentOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { searchService } from '../services/searchService';
import debounce from 'lodash.debounce';

const { Text } = Typography;

// Type icons
const typeIcons = {
    device: <LaptopOutlined style={{ color: '#1890ff' }} />,
    ip: <GlobalOutlined style={{ color: '#52c41a' }} />,
    segment: <ApartmentOutlined style={{ color: '#722ed1' }} />,
    account: <KeyOutlined style={{ color: '#fa8c16' }} />,
};

// Type colors
const typeColors = {
    device: 'blue',
    ip: 'green',
    segment: 'purple',
    account: 'orange',
};

// Type labels
const typeLabels = {
    device: 'Thiết bị',
    ip: 'IP',
    segment: 'Dải mạng',
    account: 'Tài khoản',
};

const GlobalSearch = () => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [searchValue, setSearchValue] = useState('');

    const debouncedSearch = useCallback(
        debounce(async (query) => {
            if (!query || query.length < 2) {
                setResults(null);
                return;
            }

            setLoading(true);
            try {
                const response = await searchService.search(query, 5);
                if (response.success) {
                    setResults(response.data);
                    setOpen(true);
                }
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setLoading(false);
            }
        }, 300),
        []
    );

    const handleSearch = (e) => {
        const value = e.target.value;
        setSearchValue(value);
        debouncedSearch(value);
    };

    const handleResultClick = (item) => {
        setOpen(false);
        setSearchValue('');
        setResults(null);

        // Navigate based on type
        switch (item.type) {
            case 'device':
                navigate('/devices');
                break;
            case 'ip':
            case 'segment':
                navigate('/ip-map');
                break;
            case 'account':
                navigate('/accounts');
                break;
            default:
                break;
        }
    };

    // Build dropdown content
    const getAllResults = () => {
        if (!results) return [];

        const allItems = [
            ...results.devices,
            ...results.ips,
            ...results.segments,
            ...results.accounts,
        ];

        if (allItems.length === 0) {
            return null;
        }

        return allItems;
    };

    const dropdownContent = (
        <div style={{
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
            width: 350,
            maxHeight: 400,
            overflow: 'auto',
            padding: 8,
        }}>
            {loading ? (
                <div style={{ textAlign: 'center', padding: 24 }}>
                    <Spin />
                </div>
            ) : getAllResults() === null ? (
                <Empty description="Không tìm thấy kết quả" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                getAllResults().map((item, index) => (
                    <div
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleResultClick(item)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderRadius: 6,
                            marginBottom: index < getAllResults().length - 1 ? 4 : 0,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f5ff'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <span style={{ fontSize: 16 }}>{typeIcons[item.type]}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.name}
                            </div>
                            {item.description && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {item.description}
                                </Text>
                            )}
                        </div>
                        <Tag color={typeColors[item.type]} style={{ fontSize: 10 }}>
                            {typeLabels[item.type]}
                        </Tag>
                    </div>
                ))
            )}
        </div>
    );

    return (
        <Dropdown
            open={open && (loading || results)}
            dropdownRender={() => dropdownContent}
            placement="bottomLeft"
            trigger={[]}
        >
            <Input
                placeholder="Tìm kiếm..."
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                value={searchValue}
                onChange={handleSearch}
                onFocus={() => results && setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 200)}
                style={{ width: 280 }}
                allowClear
            />
        </Dropdown>
    );
};

export default GlobalSearch;
