import { useState, useCallback } from 'react';
import {
    Row, Col, Card, Button, Input, Empty, message, Space, Modal, Upload,
    Typography, Tag, Tooltip, Dropdown, Switch, Pagination, Spin, Select, DatePicker,
} from 'antd';
import {
    UploadOutlined, DownloadOutlined, EyeOutlined, DeleteOutlined,
    EditOutlined, FileWordOutlined, FilePdfOutlined, FileExcelOutlined,
    FilePptOutlined, FileOutlined, SearchOutlined, PlusOutlined,
    CloudUploadOutlined, InboxOutlined, MoreOutlined, UserOutlined,
    CalendarOutlined, DatabaseOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import documentService from '../services/documentService';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import './DocumentsPage.css';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;
const { RangePicker } = DatePicker;

const FILE_ICONS = {
    pdf: { icon: <FilePdfOutlined />, color: '#ff4d4f', label: 'PDF' },
    doc: { icon: <FileWordOutlined />, color: '#1677ff', label: 'Word' },
    docx: { icon: <FileWordOutlined />, color: '#1677ff', label: 'Word' },
    xls: { icon: <FileExcelOutlined />, color: '#52c41a', label: 'Excel' },
    xlsx: { icon: <FileExcelOutlined />, color: '#52c41a', label: 'Excel' },
    ppt: { icon: <FilePptOutlined />, color: '#fa8c16', label: 'PowerPoint' },
    pptx: { icon: <FilePptOutlined />, color: '#fa8c16', label: 'PowerPoint' },
};

const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const DocumentsPage = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [fileTypeFilter, setFileTypeFilter] = useState('');
    const [uploaderFilter, setUploaderFilter] = useState('');
    const [dateRange, setDateRange] = useState(null);
    const [sortBy, setSortBy] = useState('created_at');
    const [page, setPage] = useState(1);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [uploadForm, setUploadForm] = useState({ title: '', description: '', allow_download: true, file: null });
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const queryParams = {
        page, limit: 12, search,
        ...(fileTypeFilter && { file_type: fileTypeFilter }),
        ...(uploaderFilter && { uploaded_by: uploaderFilter }),
        ...(dateRange?.[0] && { from_date: dateRange[0].format('YYYY-MM-DD') }),
        ...(dateRange?.[1] && { to_date: dateRange[1].format('YYYY-MM-DD') }),
        sortBy,
        sortOrder: 'DESC',
    };

    const { data: docsData, isLoading } = useQuery({
        queryKey: ['documents', queryParams],
        queryFn: () => documentService.getDocuments(queryParams),
    });

    const { data: uploadersData } = useQuery({
        queryKey: ['document-uploaders'],
        queryFn: () => documentService.getUploaders(),
    });

    const documents = docsData?.data || [];
    const pagination = docsData?.pagination || {};

    const uploadMutation = useMutation({
        mutationFn: (formData) => documentService.uploadDocument(formData),
        onSuccess: () => {
            message.success(t('documents.uploadSuccess'));
            setUploadModalOpen(false);
            setUploadForm({ title: '', description: '', allow_download: true, file: null });
            queryClient.invalidateQueries({ queryKey: ['documents'] });
        },
        onError: (err) => {
            message.error(err?.response?.data?.message || t('common.operationFailed'));
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => documentService.updateDocument(id, data),
        onSuccess: () => {
            message.success(t('common.updateSuccess'));
            setEditModalOpen(false);
            setSelectedDoc(null);
            queryClient.invalidateQueries({ queryKey: ['documents'] });
        },
        onError: () => message.error(t('common.operationFailed')),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => documentService.deleteDocument(id),
        onSuccess: () => {
            message.success(t('common.deleteSuccess'));
            queryClient.invalidateQueries({ queryKey: ['documents'] });
        },
        onError: () => message.error(t('common.operationFailed')),
    });

    const handleUpload = () => {
        if (!uploadForm.file) {
            message.warning(t('documents.selectFile'));
            return;
        }
        const formData = new FormData();
        formData.append('file', uploadForm.file);
        formData.append('title', uploadForm.title || uploadForm.file.name.replace(/\.[^/.]+$/, ''));
        formData.append('description', uploadForm.description);
        formData.append('allow_download', uploadForm.allow_download);
        uploadMutation.mutate(formData);
    };

    const handlePreview = useCallback(async (doc) => {
        setSelectedDoc(doc);
        setPreviewModalOpen(true);
        setPreviewLoading(true);
        try {
            const blobUrl = await documentService.getPreviewBlob(doc.id, doc.file_type);
            setPreviewUrl(blobUrl);
        } catch {
            message.error(t('common.operationFailed'));
        } finally {
            setPreviewLoading(false);
        }
    }, [t]);

    const closePreview = useCallback(() => {
        setPreviewModalOpen(false);
        setSelectedDoc(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    }, [previewUrl]);

    const handleDownload = async (doc) => {
        try {
            await documentService.downloadDocument(doc.id, doc.file_name);
        } catch {
            message.error(t('common.operationFailed'));
        }
    };

    const handleDelete = (doc) => {
        Modal.confirm({
            title: t('common.confirmDelete'),
            content: `${doc.title} (${doc.file_name})`,
            okText: t('common.delete'),
            okType: 'danger',
            cancelText: t('common.cancel'),
            onOk: () => deleteMutation.mutate(doc.id),
        });
    };

    const handleEdit = (doc) => {
        setSelectedDoc(doc);
        setEditModalOpen(true);
    };

    const isOwnerOrAdmin = (doc) => {
        return doc.uploaded_by === user?.id || user?.role === 'admin';
    };

    const canDownload = (doc) => {
        return doc.allow_download || isOwnerOrAdmin(doc);
    };

    const getFileInfo = (ext) => FILE_ICONS[ext] || { icon: <FileOutlined />, color: '#999', label: ext?.toUpperCase() };

    const getCardActions = (doc) => {
        const items = [
            { key: 'preview', icon: <EyeOutlined />, label: t('documents.preview'), onClick: () => handlePreview(doc) },
        ];
        if (canDownload(doc)) {
            items.push({ key: 'download', icon: <DownloadOutlined />, label: t('documents.download'), onClick: () => handleDownload(doc) });
        }
        if (isOwnerOrAdmin(doc)) {
            items.push({ key: 'edit', icon: <EditOutlined />, label: t('common.edit'), onClick: () => handleEdit(doc) });
            items.push({ type: 'divider' });
            items.push({ key: 'delete', icon: <DeleteOutlined />, label: t('common.delete'), danger: true, onClick: () => handleDelete(doc) });
        }
        return items;
    };

    return (
        <div className="documents-page">
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 24 }}>
                <div>
                    <Title level={3} style={{ marginBottom: 0 }}>
                        {t('documents.title')} 📄
                    </Title>
                    <Text type="secondary">{t('documents.subtitle')}</Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={() => setUploadModalOpen(true)}
                    className="upload-btn"
                >
                    {t('documents.upload')}
                </Button>
            </div>

            {/* Filters */}
            <div className="documents-filters">
                <Input
                    placeholder={t('documents.searchPlaceholder')}
                    prefix={<SearchOutlined />}
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    allowClear
                    style={{ width: 240 }}
                />
                <Select
                    placeholder={t('documents.filterByType')}
                    value={fileTypeFilter || undefined}
                    onChange={(val) => { setFileTypeFilter(val || ''); setPage(1); }}
                    allowClear
                    style={{ width: 140 }}
                    options={[
                        { value: 'pdf', label: 'PDF' },
                        { value: 'docx', label: 'Word' },
                        { value: 'xlsx', label: 'Excel' },
                        { value: 'pptx', label: 'PowerPoint' },
                    ]}
                />
                <Select
                    placeholder={t('documents.filterByUploader') || 'Uploaded by'}
                    value={uploaderFilter || undefined}
                    onChange={(val) => { setUploaderFilter(val || ''); setPage(1); }}
                    allowClear
                    style={{ width: 180 }}
                    showSearch
                    optionFilterProp="label"
                    options={(uploadersData?.data || []).map(u => ({
                        value: u.id,
                        label: u.display_name || u.username,
                    }))}
                />
                <RangePicker
                    value={dateRange}
                    onChange={(dates) => { setDateRange(dates); setPage(1); }}
                    style={{ width: 260 }}
                    placeholder={[t('documents.fromDate') || 'From date', t('documents.toDate') || 'To date']}
                />
                <Select
                    value={sortBy}
                    onChange={(val) => setSortBy(val)}
                    style={{ width: 140 }}
                    options={[
                        { value: 'created_at', label: t('documents.sortNewest') || 'Newest' },
                        { value: 'title', label: t('documents.sortTitle') || 'Title' },
                        { value: 'file_size', label: t('documents.sortSize') || 'Size' },
                        { value: 'view_count', label: t('documents.sortViews') || 'Views' },
                    ]}
                />
                <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                        setSearch(''); setFileTypeFilter(''); setUploaderFilter(''); setDateRange(null); setSortBy('created_at'); setPage(1);
                        queryClient.invalidateQueries({ queryKey: ['documents'] });
                    }}
                />
            </div>

            {/* Document Grid */}
            {isLoading ? (
                <div className="documents-loading"><Spin size="large" /></div>
            ) : documents.length === 0 ? (
                <Empty
                    image={<InboxOutlined style={{ fontSize: 64, color: '#999' }} />}
                    description={search ? t('common.noData') : t('documents.empty')}
                >
                    {!search && (
                        <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => setUploadModalOpen(true)}>
                            {t('documents.uploadFirst')}
                        </Button>
                    )}
                </Empty>
            ) : (
                <>
                    <Row gutter={[16, 16]}>
                        {documents.map((doc) => {
                            const fileInfo = getFileInfo(doc.file_extension);
                            return (
                                <Col xs={24} sm={12} md={8} lg={6} key={doc.id}>
                                    <Card
                                        className="document-card"
                                        hoverable
                                        onClick={() => handlePreview(doc)}
                                        actions={[
                                            <Tooltip title={t('documents.preview')} key="preview">
                                                <EyeOutlined onClick={(e) => { e.stopPropagation(); handlePreview(doc); }} />
                                            </Tooltip>,
                                            canDownload(doc) ? (
                                                <Tooltip title={t('documents.download')} key="download">
                                                    <DownloadOutlined onClick={(e) => { e.stopPropagation(); handleDownload(doc); }} />
                                                </Tooltip>
                                            ) : (
                                                <Tooltip title={t('documents.viewOnly')} key="viewonly">
                                                    <EyeOutlined style={{ color: '#999' }} />
                                                </Tooltip>
                                            ),
                                            <Dropdown
                                                key="more"
                                                menu={{ items: getCardActions(doc), onClick: ({ domEvent }) => domEvent.stopPropagation() }}
                                                trigger={['click']}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreOutlined onClick={(e) => e.stopPropagation()} />
                                            </Dropdown>,
                                        ]}
                                    >
                                        <div className="doc-card-icon" style={{ color: fileInfo.color }}>
                                            {fileInfo.icon}
                                        </div>
                                        <div className="doc-card-body">
                                            <Tooltip title={doc.title}>
                                                <Text strong className="doc-card-title" ellipsis>
                                                    {doc.title}
                                                </Text>
                                            </Tooltip>
                                            {doc.description && (
                                                <Paragraph type="secondary" className="doc-card-desc" ellipsis={{ rows: 2 }}>
                                                    {doc.description}
                                                </Paragraph>
                                            )}
                                            <div className="doc-card-meta">
                                                <Tag color={fileInfo.color} className="doc-type-tag">
                                                    {fileInfo.label}
                                                </Tag>
                                                <Text type="secondary" className="doc-size">
                                                    {formatFileSize(doc.file_size)}
                                                </Text>
                                            </div>
                                            <div className="doc-card-footer">
                                                <Space size={4}>
                                                    <UserOutlined style={{ fontSize: 11 }} />
                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                        {doc.uploader?.display_name || doc.uploader?.username}
                                                    </Text>
                                                </Space>
                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    {dayjs(doc.created_at).fromNow()}
                                                </Text>
                                            </div>
                                            {!doc.allow_download && (
                                                <Tag color="orange" className="doc-readonly-tag">
                                                    {t('documents.viewOnly')}
                                                </Tag>
                                            )}
                                        </div>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                    {pagination.totalPages > 1 && (
                        <div className="documents-pagination">
                            <Pagination
                                current={pagination.page}
                                total={pagination.total}
                                pageSize={pagination.limit}
                                onChange={(p) => setPage(p)}
                                showTotal={(total) => `${total} ${t('documents.totalDocs')}`}
                            />
                        </div>
                    )}
                </>
            )}

            {/* Upload Modal */}
            <Modal
                title={<Space><CloudUploadOutlined /> {t('documents.uploadTitle')}</Space>}
                open={uploadModalOpen}
                onOk={handleUpload}
                onCancel={() => { setUploadModalOpen(false); setUploadForm({ title: '', description: '', allow_download: true, file: null }); }}
                confirmLoading={uploadMutation.isPending}
                okText={t('documents.upload')}
                cancelText={t('common.cancel')}
                width={520}
            >
                <div className="upload-modal-content">
                    <Dragger
                        name="file"
                        multiple={false}
                        maxCount={1}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        beforeUpload={(file) => {
                            if (file.size > 50 * 1024 * 1024) {
                                message.error(t('documents.fileTooLarge'));
                                return Upload.LIST_IGNORE;
                            }
                            setUploadForm((prev) => ({ ...prev, file, title: prev.title || file.name.replace(/\.[^/.]+$/, '') }));
                            return false;
                        }}
                        onRemove={() => setUploadForm((prev) => ({ ...prev, file: null }))}
                        fileList={uploadForm.file ? [uploadForm.file] : []}
                    >
                        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                        <p className="ant-upload-text">{t('documents.dragText')}</p>
                        <p className="ant-upload-hint">{t('documents.dragHint')}</p>
                    </Dragger>
                    <div style={{ marginTop: 16 }}>
                        <Text strong>{t('documents.docTitle')}</Text>
                        <Input
                            value={uploadForm.title}
                            onChange={(e) => setUploadForm((prev) => ({ ...prev, title: e.target.value }))}
                            placeholder={t('documents.titlePlaceholder')}
                            style={{ marginTop: 4, marginBottom: 12 }}
                        />
                        <Text strong>{t('common.description')}</Text>
                        <Input.TextArea
                            value={uploadForm.description}
                            onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder={t('documents.descPlaceholder')}
                            rows={3}
                            style={{ marginTop: 4, marginBottom: 12 }}
                        />
                        <div className="upload-option">
                            <Text>{t('documents.allowDownload')}</Text>
                            <Switch
                                checked={uploadForm.allow_download}
                                onChange={(checked) => setUploadForm((prev) => ({ ...prev, allow_download: checked }))}
                            />
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Preview Modal */}
            <Modal
                title={selectedDoc?.title}
                open={previewModalOpen}
                onCancel={closePreview}
                footer={selectedDoc ? [
                    canDownload(selectedDoc) && (
                        <Button key="download" icon={<DownloadOutlined />} onClick={() => handleDownload(selectedDoc)}>
                            {t('documents.download')}
                        </Button>
                    ),
                    <Button key="close" onClick={closePreview}>
                        {t('common.close')}
                    </Button>,
                ].filter(Boolean) : null}
                width="90vw"
                style={{ top: 20 }}
                className="preview-modal"
                destroyOnClose
            >
                {selectedDoc && (
                    <div className="preview-container">
                        {previewLoading ? (
                            <div className="preview-loading">
                                <Spin size="large" tip={t('common.loading') || 'Loading...'} />
                            </div>
                        ) : previewUrl && selectedDoc.file_extension === 'pdf' ? (
                            <iframe
                                src={previewUrl}
                                title={selectedDoc.title}
                                className="preview-iframe"
                            />
                        ) : previewUrl ? (
                            <div className="preview-fallback">
                                <div className="doc-card-icon" style={{ color: (FILE_ICONS[selectedDoc.file_extension] || {}).color || '#999', fontSize: 72 }}>
                                    {(FILE_ICONS[selectedDoc.file_extension] || { icon: <FileOutlined /> }).icon}
                                </div>
                                <Title level={4} style={{ marginTop: 16, marginBottom: 4 }}>{selectedDoc.title}</Title>
                                <Text type="secondary">
                                    {(FILE_ICONS[selectedDoc.file_extension] || {}).label || selectedDoc.file_extension?.toUpperCase()} • {formatFileSize(selectedDoc.file_size)}
                                </Text>
                                <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                                    {t('documents.officeNoPreview') || 'Office files preview is available after deployment to a public server.'}
                                </Text>
                                <Button
                                    type="primary"
                                    icon={<DownloadOutlined />}
                                    size="large"
                                    style={{ marginTop: 24 }}
                                    onClick={() => handleDownload(selectedDoc)}
                                >
                                    {t('documents.download')}
                                </Button>
                            </div>
                        ) : null}
                    </div>
                )}
            </Modal>

            {/* Edit Modal */}
            <Modal
                title={<Space><EditOutlined /> {t('documents.editTitle')}</Space>}
                open={editModalOpen}
                onOk={() => {
                    if (selectedDoc) {
                        updateMutation.mutate({
                            id: selectedDoc.id,
                            data: {
                                title: selectedDoc.title,
                                description: selectedDoc.description,
                                allow_download: selectedDoc.allow_download,
                            },
                        });
                    }
                }}
                onCancel={() => { setEditModalOpen(false); setSelectedDoc(null); }}
                confirmLoading={updateMutation.isPending}
                okText={t('common.save')}
                cancelText={t('common.cancel')}
            >
                {selectedDoc && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                            <Text strong>{t('documents.docTitle')}</Text>
                            <Input
                                value={selectedDoc.title}
                                onChange={(e) => setSelectedDoc((prev) => ({ ...prev, title: e.target.value }))}
                                style={{ marginTop: 4 }}
                            />
                        </div>
                        <div>
                            <Text strong>{t('common.description')}</Text>
                            <Input.TextArea
                                value={selectedDoc.description}
                                onChange={(e) => setSelectedDoc((prev) => ({ ...prev, description: e.target.value }))}
                                rows={3}
                                style={{ marginTop: 4 }}
                            />
                        </div>
                        <div className="upload-option">
                            <Text>{t('documents.allowDownload')}</Text>
                            <Switch
                                checked={selectedDoc.allow_download}
                                onChange={(checked) => setSelectedDoc((prev) => ({ ...prev, allow_download: checked }))}
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default DocumentsPage;
