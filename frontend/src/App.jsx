import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp, Spin } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import viVN from 'antd/locale/vi_VN';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const DevicesPage = lazy(() => import('./pages/DevicesPage'));
const IpMapPage = lazy(() => import('./pages/IpMapPage'));
const AccountsPage = lazy(() => import('./pages/AccountsPage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const SupportRequestPage = lazy(() => import('./pages/SupportRequestPage'));
const BackupPage = lazy(() => import('./pages/BackupPage'));
const WikiPage = lazy(() => import('./pages/WikiPage'));
const PersonalTasksPage = lazy(() => import('./pages/PersonalTasksPage'));

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
          <SocketProvider>
            <BrowserRouter>
              <Suspense fallback={
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                  <Spin size="large" />
                </div>
              }>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/support" element={<SupportRequestPage />} />
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
                    <Route path="tasks" element={<TasksPage />} />
                    <Route path="personal-tasks" element={<PersonalTasksPage />} />
                    <Route path="audit-logs" element={<AuditLogPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="backup" element={<BackupPage />} />
                    <Route path="wiki" element={<WikiPage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </SocketProvider>
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
