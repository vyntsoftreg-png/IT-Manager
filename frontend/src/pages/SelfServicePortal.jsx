import { useState, useEffect } from 'react';
import {
    Card, Typography, Button, Form, Input, Select, Radio,
    Space, Row, Col, Divider, Result, Steps, Tag, Rate,
    message, Spin, Empty, Tree, Alert, Tabs,
} from 'antd';
import {
    CustomerServiceOutlined, SearchOutlined, BookOutlined,
    SendOutlined, UserOutlined, MailOutlined, PhoneOutlined,
    BankOutlined, EnvironmentOutlined, CheckCircleOutlined,
    ClockCircleOutlined, SyncOutlined, ExclamationCircleOutlined,
    FileTextOutlined, ArrowLeftOutlined, StarOutlined,
    QuestionCircleOutlined, ToolOutlined, TeamOutlined,
    SafetyCertificateOutlined,
} from '@ant-design/icons';
import portalService from '../services/portalService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// ─── Status color & icon mapping ───
const statusConfig = {
    open: { color: 'blue', icon: <ClockCircleOutlined />, label: 'Open' },
    in_progress: { color: 'processing', icon: <SyncOutlined spin />, label: 'In Progress' },
    pending: { color: 'warning', icon: <ExclamationCircleOutlined />, label: 'Pending Info' },
    resolved: { color: 'success', icon: <CheckCircleOutlined />, label: 'Resolved' },
    closed: { color: 'default', icon: <CheckCircleOutlined />, label: 'Closed' },
};

const priorityConfig = {
    low: { color: '#52c41a', label: '🟢 Low' },
    medium: { color: '#faad14', label: '🟡 Medium' },
    high: { color: '#fa8c16', label: '🟠 High' },
    urgent: { color: '#f5222d', label: '🔴 Urgent' },
};

// ─── Main Portal Component ───
const SelfServicePortal = () => {
    const [activeView, setActiveView] = useState('home');

    const renderView = () => {
        switch (activeView) {
            case 'submit': return <SubmitView onBack={() => setActiveView('home')} />;
            case 'track': return <TrackView onBack={() => setActiveView('home')} />;
            case 'kb': return <KnowledgeBaseView onBack={() => setActiveView('home')} />;
            default: return <HomeView onNavigate={setActiveView} />;
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        }}>
            {renderView()}
        </div>
    );
};

// ─── HOME VIEW ───
const HomeView = ({ onNavigate }) => (
    <div style={{ padding: '60px 24px 40px', maxWidth: 1000, margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{
                width: 80, height: 80, borderRadius: 20,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(59,130,246,0.3)',
            }}>
                <CustomerServiceOutlined style={{ fontSize: 36, color: '#fff' }} />
            </div>
            <Title level={1} style={{ color: '#fff', margin: 0, fontSize: 36, fontWeight: 700 }}>
                IT Help Center
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18, marginTop: 8 }}>
                Get help, track requests, and find answers — all in one place.
            </Paragraph>
        </div>

        {/* Action Cards */}
        <Row gutter={[24, 24]}>
            <Col xs={24} sm={12} md={8}>
                <ActionCard
                    icon={<SendOutlined />}
                    gradient="linear-gradient(135deg, #3b82f6, #2563eb)"
                    title="Submit Request"
                    desc="Report an issue or request IT assistance"
                    onClick={() => onNavigate('submit')}
                />
            </Col>
            <Col xs={24} sm={12} md={8}>
                <ActionCard
                    icon={<SearchOutlined />}
                    gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
                    title="Track My Ticket"
                    desc="Check the status of your existing request"
                    onClick={() => onNavigate('track')}
                />
            </Col>
            <Col xs={24} sm={12} md={8}>
                <ActionCard
                    icon={<BookOutlined />}
                    gradient="linear-gradient(135deg, #06b6d4, #0891b2)"
                    title="Knowledge Base"
                    desc="Browse guides and troubleshooting articles"
                    onClick={() => onNavigate('kb')}
                />
            </Col>
        </Row>

        {/* Quick Info */}
        <div style={{
            marginTop: 48, padding: '32px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)',
        }}>
            <Title level={4} style={{ color: '#fff', marginBottom: 24 }}>
                <QuestionCircleOutlined style={{ marginRight: 8 }} />
                Before You Submit
            </Title>
            <Row gutter={[24, 16]}>
                {[
                    { icon: <ToolOutlined />, title: 'Hardware Issues', desc: 'PC, printer, monitor problems' },
                    { icon: <SafetyCertificateOutlined />, title: 'Account & Access', desc: 'Password resets, permissions' },
                    { icon: <CustomerServiceOutlined />, title: 'Software Issues', desc: 'Application errors, installations' },
                    { icon: <TeamOutlined />, title: 'Network & Email', desc: 'Wi-Fi, VPN, email problems' },
                ].map((item, idx) => (
                    <Col xs={12} sm={6} key={idx}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                fontSize: 24, color: '#3b82f6', marginBottom: 8,
                            }}>{item.icon}</div>
                            <Text strong style={{ color: '#fff', display: 'block', fontSize: 13 }}>{item.title}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{item.desc}</Text>
                        </div>
                    </Col>
                ))}
            </Row>
        </div>
    </div>
);

// ─── ACTION CARD ───
const ActionCard = ({ icon, gradient, title, desc, onClick }) => (
    <Card
        hoverable
        onClick={onClick}
        style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, textAlign: 'center',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
        }}
        styles={{ body: { padding: 32 } }}
        onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.boxShadow = 'none';
        }}
    >
        <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: gradient, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 24, color: '#fff',
        }}>{icon}</div>
        <Title level={4} style={{ color: '#fff', margin: '0 0 8px' }}>{title}</Title>
        <Text style={{ color: 'rgba(255,255,255,0.5)' }}>{desc}</Text>
    </Card>
);

// ─── SUBMIT VIEW ───
const SubmitView = ({ onBack }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [taskNumber, setTaskNumber] = useState('');

    const categoryOptions = [
        { value: 'hardware', label: '🖥️ Hardware' },
        { value: 'software', label: '💿 Software' },
        { value: 'network', label: '🌐 Network' },
        { value: 'email', label: '📧 Email' },
        { value: 'account', label: '🔐 Account & Access' },
        { value: 'other', label: '📦 Other' },
    ];

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const response = await portalService.submitRequest(values);
            if (response.success) {
                setTaskNumber(response.data.task_number);
                setSubmitted(true);
                message.success('Request submitted successfully!');
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to submit request');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <ViewWrapper onBack={onBack} title="">
                <Card style={{
                    maxWidth: 500, margin: '0 auto', textAlign: 'center',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 16,
                }}>
                    <Result
                        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                        title={<span style={{ color: '#fff' }}>Request Submitted!</span>}
                        subTitle={
                            <Space direction="vertical" size={12}>
                                <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
                                    Your ticket number is:
                                </Text>
                                <Title level={3} style={{ color: '#3b82f6', margin: 0 }}>
                                    {taskNumber}
                                </Title>
                                <Text style={{ color: 'rgba(255,255,255,0.5)' }}>
                                    Save this number to track your request status.
                                </Text>
                            </Space>
                        }
                        extra={[
                            <Button key="new" onClick={() => { form.resetFields(); setSubmitted(false); }}>
                                Submit Another
                            </Button>,
                            <Button type="primary" key="track" onClick={onBack}>
                                Back to Help Center
                            </Button>,
                        ]}
                    />
                </Card>
            </ViewWrapper>
        );
    }

    return (
        <ViewWrapper onBack={onBack} title="Submit a Request" subtitle="Describe your issue and we'll get back to you as soon as possible.">
            <Card style={{
                maxWidth: 700, margin: '0 auto',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
            }}>
                <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ priority: 'medium' }}>
                    <Title level={5} style={{ color: '#fff', marginBottom: 16 }}>
                        <UserOutlined /> Your Information
                    </Title>
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item name="requester_name" label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Full Name</span>} rules={[{ required: true, message: 'Please enter your name' }]}>
                                <Input prefix={<UserOutlined />} placeholder="John Doe" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="requester_email" label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Email</span>} rules={[{ type: 'email', message: 'Invalid email' }]}>
                                <Input prefix={<MailOutlined />} placeholder="john@company.com" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item name="requester_department" label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Department</span>}>
                                <Input prefix={<BankOutlined />} placeholder="e.g., Accounting" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="requester_phone" label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Phone</span>}>
                                <Input prefix={<PhoneOutlined />} placeholder="Extension or mobile" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="requester_location" label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Location</span>}>
                        <Input prefix={<EnvironmentOutlined />} placeholder="Building/Floor/Room" />
                    </Form.Item>

                    <Divider style={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                    <Title level={5} style={{ color: '#fff', marginBottom: 16 }}>
                        📝 Issue Details
                    </Title>
                    <Form.Item name="category" label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Category</span>} rules={[{ required: true, message: 'Please select a category' }]}>
                        <Select placeholder="Select category">
                            {categoryOptions.map(c => (
                                <Select.Option key={c.value} value={c.value}>{c.label}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="title" label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Subject</span>} rules={[{ required: true, message: 'Please enter a subject' }]}>
                        <Input placeholder="Brief description of your issue" />
                    </Form.Item>
                    <Form.Item name="description" label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Description</span>} rules={[{ required: true, message: 'Please describe the issue' }]}>
                        <TextArea rows={4} placeholder="Provide as much detail as possible..." />
                    </Form.Item>
                    <Form.Item name="priority" label={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Urgency</span>}>
                        <Radio.Group>
                            <Space direction="vertical">
                                <Radio value="low">🟢 Low — No rush, when convenient</Radio>
                                <Radio value="medium">🟡 Medium — Affects my work</Radio>
                                <Radio value="high">🟠 High — Urgent, blocking my tasks</Radio>
                                <Radio value="urgent">🔴 Critical — System down, affects many users</Radio>
                            </Space>
                        </Radio.Group>
                    </Form.Item>

                    <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" loading={loading} size="large" block
                            style={{
                                height: 48, fontSize: 16,
                                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                border: 'none',
                            }}
                        >
                            🚀 Submit Request
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </ViewWrapper>
    );
};

// ─── TRACK VIEW ───
const TrackView = ({ onBack }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [ticket, setTicket] = useState(null);
    const [showRating, setShowRating] = useState(false);
    const [ratingValue, setRatingValue] = useState(0);
    const [ratingComment, setRatingComment] = useState('');
    const [ratingLoading, setRatingLoading] = useState(false);

    const handleSearch = async () => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            message.warning('Please enter a ticket number or email');
            return;
        }
        setLoading(true);
        setResults(null);
        setTicket(null);
        try {
            const response = await portalService.searchTickets(searchQuery.trim());
            if (response.success) {
                const data = response.data;
                // If only 1 result, go directly to detail
                if (data.length === 1) {
                    loadDetail(data[0].task_number);
                } else {
                    setResults(data);
                }
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'No tickets found';
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const loadDetail = async (taskNumber) => {
        setLoading(true);
        try {
            const response = await portalService.getTicketDetail(taskNumber);
            if (response.success) {
                setTicket(response.data);
                setResults(null);
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Could not load ticket details');
        } finally {
            setLoading(false);
        }
    };

    const handleRating = async () => {
        if (ratingValue === 0) {
            message.warning('Please select a rating');
            return;
        }
        setRatingLoading(true);
        try {
            await portalService.submitRating(ticket.task_number, ratingValue, ratingComment, ticket.requester_email);
            message.success('Thank you for your feedback!');
            setShowRating(false);
            setTicket(prev => ({ ...prev, rating: ratingValue, can_rate: false }));
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to submit rating');
        } finally {
            setRatingLoading(false);
        }
    };

    const backToResults = () => {
        setTicket(null);
        setShowRating(false);
        setRatingValue(0);
        setRatingComment('');
    };

    return (
        <ViewWrapper
            onBack={ticket ? backToResults : onBack}
            title="Track My Ticket"
            subtitle="Search by ticket number (e.g. 0001) or your email address."
        >
            {/* Search Bar */}
            <Card style={{
                maxWidth: 600, margin: '0 auto 24px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
            }}>
                <Input.Search
                    placeholder="Enter ticket number (0001) or email (john@company.com)"
                    enterButton={<><SearchOutlined /> Search</>}
                    size="large"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onSearch={handleSearch}
                    loading={loading}
                    style={{ marginBottom: 0 }}
                />
                <div style={{ marginTop: 8 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                        💡 Tip: Just type the last digits of your ticket number (e.g. <b>0001</b>) or your full email address.
                    </Text>
                </div>
            </Card>

            {/* Loading */}
            {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>}

            {/* Search Results List */}
            {results && results.length > 0 && (
                <div style={{ maxWidth: 600, margin: '0 auto' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 12, display: 'block' }}>
                        Found {results.length} ticket(s):
                    </Text>
                    {results.map(t => (
                        <Card
                            key={t.task_number}
                            hoverable
                            onClick={() => loadDetail(t.task_number)}
                            style={{
                                marginBottom: 12,
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 12, cursor: 'pointer',
                                transition: 'all 0.3s ease',
                            }}
                            styles={{ body: { padding: '16px 20px' } }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{t.task_number}</Text>
                                    <Title level={5} style={{ color: '#fff', margin: '4px 0 0' }}>{t.title}</Title>
                                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                                        {t.requester_name} • {new Date(t.created_at).toLocaleDateString()}
                                    </Text>
                                </div>
                                <Tag color={statusConfig[t.status]?.color} icon={statusConfig[t.status]?.icon}>
                                    {statusConfig[t.status]?.label}
                                </Tag>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Ticket Detail */}
            {ticket && !loading && (
                <Card style={{
                    maxWidth: 600, margin: '0 auto',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 16,
                }}>
                    {/* Ticket Header */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{ticket.task_number}</Text>
                            <Tag color={statusConfig[ticket.status]?.color} icon={statusConfig[ticket.status]?.icon}>
                                {statusConfig[ticket.status]?.label}
                            </Tag>
                        </div>
                        <Title level={4} style={{ color: '#fff', margin: 0 }}>{ticket.title}</Title>
                        <Space style={{ marginTop: 8 }}>
                            <Tag color={priorityConfig[ticket.priority]?.color}>{priorityConfig[ticket.priority]?.label}</Tag>
                            {ticket.category && <Tag>{ticket.category}</Tag>}
                        </Space>
                    </div>

                    <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '16px 0' }} />

                    {/* Timeline */}
                    <Title level={5} style={{ color: '#fff', marginBottom: 16 }}>Progress</Title>
                    <Steps
                        direction="vertical"
                        size="small"
                        current={ticket.timeline?.filter(t => t.done).length - 1}
                        items={ticket.timeline?.map(step => ({
                            title: <span style={{ color: step.done ? '#fff' : 'rgba(255,255,255,0.3)' }}>{step.label}</span>,
                            description: step.time ? (
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                                    {new Date(step.time).toLocaleString()}
                                </Text>
                            ) : null,
                            status: step.done ? 'finish' : 'wait',
                        }))}
                    />

                    {ticket.assignee_name && (
                        <div style={{ marginTop: 16 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)' }}>Assigned to: </Text>
                            <Text strong style={{ color: '#fff' }}>{ticket.assignee_name}</Text>
                        </div>
                    )}

                    {/* Rating Section */}
                    {ticket.can_rate && !showRating && (
                        <div style={{ marginTop: 24, textAlign: 'center' }}>
                            <Button type="primary" icon={<StarOutlined />} onClick={() => setShowRating(true)}
                                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none' }}
                            >
                                Rate This Service
                            </Button>
                        </div>
                    )}

                    {showRating && (
                        <div style={{
                            marginTop: 24, padding: 20,
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: 12, textAlign: 'center',
                        }}>
                            <Title level={5} style={{ color: '#fff' }}>How was the service?</Title>
                            <Rate value={ratingValue} onChange={setRatingValue} style={{ fontSize: 32 }} />
                            <TextArea
                                rows={2} placeholder="Any additional feedback (optional)..."
                                value={ratingComment} onChange={e => setRatingComment(e.target.value)}
                                style={{ marginTop: 16 }}
                            />
                            <Space style={{ marginTop: 16 }}>
                                <Button onClick={() => setShowRating(false)}>Cancel</Button>
                                <Button type="primary" loading={ratingLoading} onClick={handleRating}>
                                    Submit Feedback
                                </Button>
                            </Space>
                        </div>
                    )}

                    {ticket.rating && (
                        <div style={{ marginTop: 24, textAlign: 'center' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)' }}>Your Rating: </Text>
                            <Rate disabled value={ticket.rating} />
                            {ticket.rating_comment && (
                                <Paragraph style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
                                    "{ticket.rating_comment}"
                                </Paragraph>
                            )}
                        </div>
                    )}
                </Card>
            )}
        </ViewWrapper>
    );
};

// ─── KNOWLEDGE BASE VIEW ───
const KnowledgeBaseView = ({ onBack }) => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [articleContent, setArticleContent] = useState('');
    const [contentLoading, setContentLoading] = useState(false);

    useEffect(() => {
        loadArticles();
    }, []);

    const loadArticles = async () => {
        try {
            const response = await portalService.getKbTree();
            setArticles(response.data || []);
        } catch {
            setArticles([]);
        } finally {
            setLoading(false);
        }
    };

    const loadPage = async (key) => {
        setContentLoading(true);
        setSelectedArticle(key);
        try {
            const response = await portalService.getKbPage(key);
            setArticleContent(response.data || '');
        } catch {
            setArticleContent('Article not found.');
        } finally {
            setContentLoading(false);
        }
    };

    // Simple markdown renderer
    const renderMarkdown = (md) => {
        if (!md) return null;
        const lines = md.split('\n');
        const elements = [];
        let inTable = false;
        let tableRows = [];

        const flushTable = () => {
            if (tableRows.length === 0) return;
            const headers = tableRows[0].split('|').filter(c => c.trim());
            const dataRows = tableRows.slice(2);
            elements.push(
                <table key={`table-${elements.length}`} style={{
                    width: '100%', borderCollapse: 'collapse', margin: '16px 0',
                    color: 'rgba(255,255,255,0.85)',
                }}>
                    <thead>
                        <tr>
                            {headers.map((h, i) => (
                                <th key={i} style={{
                                    padding: '8px 12px', borderBottom: '2px solid rgba(255,255,255,0.2)',
                                    textAlign: 'left', fontWeight: 600,
                                }}>{h.trim()}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {dataRows.map((row, ri) => (
                            <tr key={ri}>
                                {row.split('|').filter(c => c.trim()).map((cell, ci) => (
                                    <td key={ci} style={{
                                        padding: '6px 12px',
                                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                                    }}>{cell.trim().replace(/\*\*/g, '')}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
            tableRows = [];
            inTable = false;
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.includes('|') && line.trim().startsWith('|')) {
                inTable = true;
                tableRows.push(line);
                continue;
            } else if (inTable) {
                flushTable();
            }

            if (line.startsWith('# ')) {
                elements.push(<Title key={i} level={3} style={{ color: '#fff', marginTop: 24 }}>{line.slice(2)}</Title>);
            } else if (line.startsWith('## ')) {
                elements.push(<Title key={i} level={4} style={{ color: '#fff', marginTop: 20 }}>{line.slice(3)}</Title>);
            } else if (line.startsWith('### ')) {
                elements.push(<Title key={i} level={5} style={{ color: '#fff', marginTop: 16 }}>{line.slice(4)}</Title>);
            } else if (line.startsWith('- ') || line.startsWith('* ')) {
                elements.push(
                    <div key={i} style={{ color: 'rgba(255,255,255,0.85)', padding: '2px 0 2px 16px' }}>
                        • {line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1')}
                    </div>
                );
            } else if (/^\d+\.\s/.test(line)) {
                elements.push(
                    <div key={i} style={{ color: 'rgba(255,255,255,0.85)', padding: '2px 0 2px 16px' }}>
                        {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                    </div>
                );
            } else if (line.startsWith('> ')) {
                elements.push(
                    <Alert key={i} type="info" showIcon
                        message={line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1')}
                        style={{ margin: '12px 0' }}
                    />
                );
            } else if (line.trim()) {
                elements.push(
                    <Paragraph key={i} style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 8 }}>
                        {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                    </Paragraph>
                );
            }
        }
        if (inTable) flushTable();
        return elements;
    };

    return (
        <ViewWrapper onBack={selectedArticle ? () => { setSelectedArticle(null); setArticleContent(''); } : onBack}
            title={selectedArticle ? articles.find(a => a.key === selectedArticle)?.title || 'Article' : 'Knowledge Base'}
            subtitle={selectedArticle ? null : 'Browse guides and troubleshooting articles'}
        >
            {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
            ) : selectedArticle ? (
                <Card style={{
                    maxWidth: 800, margin: '0 auto',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 16,
                }}>
                    {contentLoading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    ) : (
                        <div>{renderMarkdown(articleContent)}</div>
                    )}
                </Card>
            ) : articles.length === 0 ? (
                <Card style={{
                    maxWidth: 600, margin: '0 auto',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 16,
                }}>
                    <Empty
                        description={<Text style={{ color: 'rgba(255,255,255,0.5)' }}>No articles available yet. Check back later!</Text>}
                    />
                </Card>
            ) : (
                <Row gutter={[16, 16]} style={{ maxWidth: 800, margin: '0 auto' }}>
                    {articles.map(article => (
                        <Col xs={24} sm={12} key={article.key}>
                            <Card
                                hoverable
                                onClick={() => loadPage(article.key)}
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 12, cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = 'rgba(6,182,212,0.4)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <Space>
                                    <FileTextOutlined style={{ fontSize: 24, color: '#06b6d4' }} />
                                    <div>
                                        <Text strong style={{ color: '#fff', fontSize: 15 }}>{article.title}</Text>
                                        <br />
                                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                                            {article.isLeaf ? 'Article' : 'Section'}
                                        </Text>
                                    </div>
                                </Space>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </ViewWrapper>
    );
};

// ─── VIEW WRAPPER (Back button + Title) ───
const ViewWrapper = ({ children, onBack, title, subtitle }) => (
    <div style={{ padding: '40px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24, padding: '4px 0' }}
        >
            Back
        </Button>
        {title && (
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <Title level={2} style={{ color: '#fff', margin: 0 }}>{title}</Title>
                {subtitle && (
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>{subtitle}</Text>
                )}
            </div>
        )}
        {children}
    </div>
);

export default SelfServicePortal;
