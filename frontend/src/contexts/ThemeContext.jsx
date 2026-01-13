import { createContext, useContext, useState, useEffect } from 'react';
import { theme } from 'antd';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved ? saved === 'dark' : false;
    });

    useEffect(() => {
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        // Update body class for CSS customization
        document.body.classList.toggle('dark-theme', isDarkMode);
    }, [isDarkMode]);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    const setTheme = (mode) => {
        setIsDarkMode(mode === 'dark');
    };

    // Ant Design theme algorithm
    const algorithm = isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm;

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme, setTheme, algorithm }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
