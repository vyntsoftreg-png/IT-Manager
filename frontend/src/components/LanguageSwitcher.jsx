import { useState } from 'react';
import { Dropdown, Button, Space } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const languages = [
    { key: 'en', label: 'English', flag: '🇺🇸' },
    { key: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
];

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const [currentLang, setCurrentLang] = useState(i18n.language || 'en');

    const handleLanguageChange = (langKey) => {
        i18n.changeLanguage(langKey);
        localStorage.setItem('language', langKey);
        setCurrentLang(langKey);
    };

    const currentLanguage = languages.find(l => l.key === currentLang) || languages[0];

    const items = languages.map(lang => ({
        key: lang.key,
        label: (
            <Space>
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
            </Space>
        ),
        onClick: () => handleLanguageChange(lang.key),
    }));

    return (
        <Dropdown
            menu={{ items, selectedKeys: [currentLang] }}
            trigger={['click']}
            placement="bottomRight"
        >
            <Button type="text" style={{ color: 'inherit' }}>
                <Space>
                    <GlobalOutlined />
                    <span>{currentLanguage.flag}</span>
                    <span style={{ fontSize: 12 }}>{currentLanguage.label}</span>
                </Space>
            </Button>
        </Dropdown>
    );
};

export default LanguageSwitcher;
