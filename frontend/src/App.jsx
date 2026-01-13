import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import viVN from 'antd/locale/vi_VN';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DevicesPage from './pages/DevicesPage';
import IpMapPage from './pages/IpMapPage';
import AccountsPage from './pages/AccountsPage';
import AuditLogPage from './pages/AuditLogPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const baseThemeConfig = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 8,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  components: {
    Layout: {
      siderBg: '#ffffff',
      headerBg: '#ffffff',
    },
    Menu: {
      itemBorderRadius: 8,
      itemMarginBlock: 4,
      itemMarginInline: 8,
    },
    Card: {
      borderRadiusLG: 12,
    },
    Table: {
      borderRadiusLG: 12,
    },
    Button: {
      borderRadius: 8,
    },
    Input: {
      borderRadius: 8,
    },
    Select: {
      borderRadius: 8,
    },
  },
};

// Inner app component that uses theme context
const ThemedApp = () => {
  const { algorithm, isDarkMode } = useTheme();

  const themeConfig = {
    ...baseThemeConfig,
    algorithm,
    components: {
      ...baseThemeConfig.components,
      Layout: {
        siderBg: isDarkMode ? '#141414' : '#ffffff',
        headerBg: isDarkMode ? '#141414' : '#ffffff',
      },
    },
  };

  return (
    <ConfigProvider theme={themeConfig} locale={viVN}>
      <AntApp>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="devices" element={<DevicesPage />} />
                <Route path="ip-map" element={<IpMapPage />} />
                <Route path="accounts" element={<AccountsPage />} />
                <Route path="audit-logs" element={<AuditLogPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
