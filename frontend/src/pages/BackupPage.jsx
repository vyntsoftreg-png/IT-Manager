import { useState } from 'react';
import {
    Card, Button, Typography, Space, message, Row, Col,
    Statistic, Upload, Modal, Alert, Divider, Spin
} from 'antd';
import {
    DownloadOutlined, UploadOutlined, DatabaseOutlined,
    ExclamationCircleOutlined, CheckCircleOutlined,
    FileOutlined, TableOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import backupService from '../services/backupService';

const { Title, Text, Paragraph } = Typography;

const BackupPage = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importData, setImportData] = useState(null);
    const [importing, setImporting] = useState(false);

    // Fetch database info
    const { data: backupInfo, isLoading: infoLoading } = useQuery({
        queryKey: ['backupInfo'],
        queryFn: backupService.getInfo,
        enabled: user?.role === 'admin',
    });

    // Export mutation
    const exportMutation = useMutation({
        mutationFn: backupService.exportDatabase,
        onSuccess: (data) => {
            // Create and download JSON file
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `it-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            message.success(t('backup.exportSuccess'));
        },
        onError: (error) => {
            message.error(error.response?.data?.message || t('backup.exportFailed'));
        },
    });

    // Import mutation
    const importMutation = useMutation({
        mutationFn: backupService.importDatabase,
        onSuccess: (data) => {
            message.success(t('backup.importSuccess'));
            setImportModalOpen(false);
            setImportData(null);
            // Invalidate all queries to refresh data
            queryClient.invalidateQueries();
        },
        onError: (error) => {
            message.error(error.response?.data?.message || t('backup.importFailed'));
        },
    });

    // Handle file upload
    const handleFileUpload = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.version || !data.tables) {
                    message.error(t('backup.invalidFormat'));
                    return;
                }
                setImportData(data);
                setImportModalOpen(true);
            } catch (error) {
                message.error(t('backup.parseError'));
            }
        };
        reader.readAsText(file);
        return false; // Prevent auto upload
    };

    // Handle import confirm
    const handleImportConfirm = async () => {
        if (!importData) return;
        setImporting(true);
        try {
            await importMutation.mutateAsync(importData);
        } finally {
            setImporting(false);
        }
    };

    // Check admin access
    if (user?.role !== 'admin') {
        return (
            <div style={{ padding: 24 }}>
                <Alert
                    type="error"
                    message={t('common.unauthorized')}
                    description={t('backup.adminOnly')}
                    showIcon
                />
            </div>
        );
    }

    return (
        <div style={{ padding: 24 }}>
            <Title level={2}>
                <DatabaseOutlined /> {t('backup.title')}
            </Title>
            <Paragraph type="secondary">
                {t('backup.description')}
            </Paragraph>

            <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                {/* Database Stats */}
                <Col xs={24} lg={12}>
                    <Card title={t('backup.databaseInfo')} loading={infoLoading}>
                        {backupInfo && (
                            <Row gutter={[16, 16]}>
                                <Col span={8}>
                                    <Statistic
                                        title={t('sidebar.devices')}
                                        value={backupInfo.tables?.devices || 0}
                                        prefix={<TableOutlined />}
                                    />
                                </Col>
                                <Col span={8}>
                                    <Statistic
                                        title={t('sidebar.accounts')}
                                        value={backupInfo.tables?.adminAccounts || 0}
                                        prefix={<TableOutlined />}
                                    />
                                </Col>
                                <Col span={8}>
                                    <Statistic
                                        title={t('sidebar.segments')}
                                        value={backupInfo.tables?.networkSegments || 0}
                                        prefix={<TableOutlined />}
                                    />
                                </Col>
                                <Col span={8}>
                                    <Statistic
                                        title={t('sidebar.ipMap')}
                                        value={backupInfo.tables?.ipAddresses || 0}
                                        prefix={<TableOutlined />}
                                    />
                                </Col>
                                <Col span={8}>
                                    <Statistic
                                        title={t('sidebar.tasks')}
                                        value={backupInfo.tables?.tasks || 0}
                                        prefix={<TableOutlined />}
                                    />
                                </Col>
                                <Col span={8}>
                                    <Statistic
                                        title={t('backup.totalRecords')}
                                        value={backupInfo.totalRecords || 0}
                                        prefix={<FileOutlined />}
                                        valueStyle={{ color: '#1890ff' }}
                                    />
                                </Col>
                            </Row>
                        )}
                    </Card>
                </Col>

                {/* Export Card */}
                <Col xs={24} lg={12}>
                    <Card title={t('backup.exportTitle')}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Paragraph>
                                {t('backup.exportDescription')}
                            </Paragraph>
                            <Alert
                                type="info"
                                message={t('backup.exportNote')}
                                showIcon
                                style={{ marginBottom: 16 }}
                            />
                            <Button
                                type="primary"
                                size="large"
                                icon={<DownloadOutlined />}
                                loading={exportMutation.isPending}
                                onClick={() => exportMutation.mutate()}
                                block
                            >
                                {t('backup.exportButton')}
                            </Button>
                        </Space>
                    </Card>
                </Col>

                {/* Import Card */}
                <Col xs={24}>
                    <Card title={t('backup.importTitle')}>
                        <Row gutter={24}>
                            <Col xs={24} md={12}>
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Paragraph>
                                        {t('backup.importDescription')}
                                    </Paragraph>
                                    <Alert
                                        type="warning"
                                        message={t('backup.importWarning')}
                                        description={t('backup.importWarningDescription')}
                                        showIcon
                                        style={{ marginBottom: 16 }}
                                    />
                                </Space>
                            </Col>
                            <Col xs={24} md={12}>
                                <Upload.Dragger
                                    accept=".json"
                                    beforeUpload={handleFileUpload}
                                    showUploadList={false}
                                    style={{ padding: '20px 0' }}
                                >
                                    <p className="ant-upload-drag-icon">
                                        <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                                    </p>
                                    <p className="ant-upload-text">{t('backup.uploadText')}</p>
                                    <p className="ant-upload-hint">{t('backup.uploadHint')}</p>
                                </Upload.Dragger>
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>

            {/* Import Confirmation Modal */}
            <Modal
                title={
                    <Space>
                        <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                        {t('backup.confirmImport')}
                    </Space>
                }
                open={importModalOpen}
                onCancel={() => {
                    setImportModalOpen(false);
                    setImportData(null);
                }}
                footer={[
                    <Button key="cancel" onClick={() => {
                        setImportModalOpen(false);
                        setImportData(null);
                    }}>
                        {t('common.cancel')}
                    </Button>,
                    <Button
                        key="import"
                        type="primary"
                        danger
                        loading={importing}
                        onClick={handleImportConfirm}
                        icon={<UploadOutlined />}
                    >
                        {t('backup.confirmImportButton')}
                    </Button>,
                ]}
                width={600}
            >
                {importData && (
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Alert
                            type="warning"
                            message={t('backup.importConfirmWarning')}
                            showIcon
                        />
                        <Divider>{t('backup.fileInfo')}</Divider>
                        <Row gutter={[16, 8]}>
                            <Col span={12}>
                                <Text strong>{t('backup.version')}:</Text> {importData.version}
                            </Col>
                            <Col span={12}>
                                <Text strong>{t('backup.exportedAt')}:</Text>{' '}
                                {new Date(importData.exportedAt).toLocaleString()}
                            </Col>
                        </Row>
                        <Divider>{t('backup.recordsToImport')}</Divider>
                        <Row gutter={[16, 8]}>
                            <Col span={8}>
                                <Statistic
                                    title={t('sidebar.devices')}
                                    value={importData.tables?.devices?.length || 0}
                                    size="small"
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title={t('sidebar.accounts')}
                                    value={importData.tables?.adminAccounts?.length || 0}
                                    size="small"
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title={t('sidebar.segments')}
                                    value={importData.tables?.networkSegments?.length || 0}
                                    size="small"
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title={t('sidebar.ipMap')}
                                    value={importData.tables?.ipAddresses?.length || 0}
                                    size="small"
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title={t('sidebar.tasks')}
                                    value={importData.tables?.tasks?.length || 0}
                                    size="small"
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title={t('backup.totalRecords')}
                                    value={importData.metadata?.totalRecords || 0}
                                    valueStyle={{ color: '#1890ff' }}
                                    size="small"
                                />
                            </Col>
                        </Row>
                    </Space>
                )}
            </Modal>
        </div>
    );
};

export default BackupPage;
