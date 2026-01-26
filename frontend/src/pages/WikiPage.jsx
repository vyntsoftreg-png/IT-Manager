import React, { useState, useEffect } from 'react';
import { Layout, Tree, Button, Input, Empty, message, Card, Breadcrumb, Space, Tooltip, Modal, Typography } from 'antd';
import {
    FolderOutlined,
    FileMarkdownOutlined,
    PlusOutlined,
    SaveOutlined,
    DeleteOutlined,
    EditOutlined,
    ReloadOutlined,
    SearchOutlined,
    FileAddOutlined,
    FolderAddOutlined,
} from '@ant-design/icons';
import MDEditor from '@uiw/react-md-editor';
// import rehypeSanitize from 'rehype-sanitize'; // Optional: Use for sanitization if needed
// import rehypeSanitize from 'rehype-sanitize'; // Optional: Use for sanitization if needed
// import rehypeSanitize from 'rehype-sanitize'; // Optional: Use for sanitization if needed
import wikiService from '../services/wikiService';
import { useTheme } from '../contexts/ThemeContext';
import './WikiPage.css';

const { Sider, Content } = Layout;
const { Title } = Typography;
const { Search } = Input;
const { DirectoryTree } = Tree;

const WikiPage = () => {
    const { isDarkMode } = useTheme();
    const [treeData, setTreeData] = useState([]);
    const [selectedPath, setSelectedPath] = useState(null);
    const [content, setContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createType, setCreateType] = useState('file'); // 'file' or 'folder'
    const [newItemName, setNewItemName] = useState('');

    useEffect(() => {
        loadTree();
    }, []);

    const loadTree = async () => {
        try {
            const res = await wikiService.getTree();
            if (res.success) {
                setTreeData(loop(res.data));
            }
        } catch (error) {
            message.error('Failed to load wiki structure');
        }
    };

    // Helper to add keys/icons
    const loop = (data) =>
        data.map((item) => {
            if (item.children) {
                return {
                    ...item,
                    icon: <FolderOutlined />,
                    children: loop(item.children),
                };
            }
            return {
                ...item,
                icon: <FileMarkdownOutlined />,
            };
        });

    const onSelect = async (keys, info) => {
        if (!info.node.isLeaf) return;

        const path = info.node.key;
        setSelectedPath(path);
        setIsEditing(false);
        setLoading(true);

        try {
            const res = await wikiService.getPage(path);
            if (res.success) {
                setContent(res.data || '');
            }
        } catch (error) {
            message.error('Failed to load page content');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedPath) return;
        try {
            await wikiService.savePage(selectedPath, content);
            message.success('Page saved successfully');
            setIsEditing(false);
            loadTree();
        } catch (error) {
            message.error('Failed to save page');
        }
    };

    const handleDelete = () => {
        if (!selectedPath) return;
        Modal.confirm({
            title: 'Delete Page',
            content: `Are you sure you want to delete "${selectedPath}"?`,
            onOk: async () => {
                try {
                    await wikiService.deletePage(selectedPath);
                    message.success('Page deleted');
                    setSelectedPath(null);
                    setContent('');
                    loadTree();
                } catch (error) {
                    message.error('Failed to delete page');
                }
            },
        });
    };

    const handleCreate = async () => {
        if (!newItemName) return;

        // Construct path
        // For simplicity, creating at root or current folder context logic can be added
        // Here we just create at root for MVP, or we could add context menu later
        // Let's create at root for now to keep it simple

        let path = newItemName;
        if (createType === 'file' && !path.endsWith('.md')) {
            path += '.md';
        }

        try {
            // For folders, we just need to ensure the directory exists, but savePage mainly handles files
            // To create an empty folder, we might need a specific API or just save a dummy file inside it
            // For now, let's just support File creation

            await wikiService.savePage(path, '# New Page\n\nWrite something here...');
            message.success('File created');
            setCreateModalOpen(false);
            setNewItemName('');
            loadTree();

            // Auto select new file
            // setSelectedPath(path);
            // loadPage...
        } catch (error) {
            message.error('Failed to create');
        }
    };

    return (
        <Layout style={{ height: 'calc(100vh - 64px)', background: '#fff' }}>
            <Sider width={300} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
                <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
                    <Space>
                        <Button
                            icon={<FileAddOutlined />}
                            onClick={() => { setCreateType('file'); setCreateModalOpen(true); }}
                        >
                            New Page
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={loadTree} />
                    </Space>
                    <div style={{ marginTop: 12 }}>
                        <Search placeholder="Search..." />
                    </div>
                </div>
                <DirectoryTree
                    defaultExpandAll
                    onSelect={onSelect}
                    treeData={treeData}
                    height={600}
                    style={{ padding: '0 8px' }}
                />
            </Sider>
            <Content style={{ padding: 24, overflow: 'auto' }}>
                {!selectedPath ? (
                    <Empty description="Select a page to view" style={{ marginTop: 100 }} />
                ) : (
                    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <Breadcrumb items={[{ title: 'Wiki' }, ...selectedPath.split('/').map(p => ({ title: p }))]} />
                            <Space>
                                {isEditing ? (
                                    <>
                                        <Button onClick={() => setIsEditing(false)}>Cancel</Button>
                                        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>Save</Button>
                                    </>
                                ) : (
                                    <>
                                        <Button icon={<EditOutlined />} onClick={() => setIsEditing(true)}>Edit</Button>
                                        <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>Delete</Button>
                                    </>
                                )}
                            </Space>
                        </div>

                        {loading ? (
                            <div>Loading...</div>
                        ) : isEditing ? (
                            <div data-color-mode={isDarkMode ? 'dark' : 'light'}>
                                <MDEditor
                                    value={content}
                                    onChange={setContent}
                                    height={600}
                                />
                            </div>
                        ) : (
                            <Card className="wiki-card">
                                <div data-color-mode={isDarkMode ? 'dark' : 'light'} className="wiki-content">
                                    <MDEditor.Markdown source={content} style={{ whiteSpace: 'pre-wrap', backgroundColor: 'transparent' }} />
                                </div>
                            </Card>
                        )}
                    </div>
                )}
            </Content>

            <Modal
                title="Create New Page"
                open={createModalOpen}
                onOk={handleCreate}
                onCancel={() => setCreateModalOpen(false)}
            >
                <Input
                    placeholder="Page Name (e.g., Guide/Setup)"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    prefix={<FileMarkdownOutlined />}
                />
                <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                    Use / to create folders (e.g., "Network/VLANs")
                </div>
            </Modal>
        </Layout>
    );
};

export default WikiPage;
