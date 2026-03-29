import { useState, useEffect } from 'react';
import { Modal, Button, Spin, Empty, message, Space, Typography } from 'antd';
import { DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { deviceService } from '../services/deviceService';

const { Text, Title } = Typography;

const QrCodeModal = ({ isOpen, onClose, device }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [qrCodeData, setQrCodeData] = useState(null);

    useEffect(() => {
        if (isOpen && device) {
            fetchQrCode();
        } else {
            setQrCodeData(null);
        }
    }, [isOpen, device]);

    const fetchQrCode = async () => {
        setLoading(true);
        try {
            const result = await deviceService.getDeviceQRCode(device.id);
            if (result.success) {
                setQrCodeData(result.data.qrCode);
            }
        } catch (error) {
            message.error('Failed to load QR Code');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!qrCodeData) return;
        const link = document.createElement('a');
        link.href = qrCodeData;
        link.download = `device_qr_${device?.name || 'unknown'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        if (!qrCodeData) return;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print QR Code - ${device?.name}</title>
                    <style>
                        body {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            margin: 0;
                            font-family: Arial, sans-serif;
                        }
                        .container {
                            border: 1px solid #ccc;
                            padding: 20px;
                            border-radius: 8px;
                            text-align: center;
                            max-width: 300px;
                        }
                        img {
                            max-width: 100%;
                            height: auto;
                        }
                        h2 {
                            margin: 10px 0 5px 0;
                            font-size: 18px;
                        }
                        p {
                            margin: 0;
                            color: #666;
                            font-size: 14px;
                        }
                        @media print {
                            @page { margin: 0; }
                            body { margin: 1cm; height: auto; display: block;}
                            .container { border: none; padding: 0; margin-bottom: 20px;}
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>${device?.name}</h2>
                        ${device?.hostname ? `<p>${device.hostname}</p>` : ''}
                        <img src="${qrCodeData}" alt="QR Code" />
                        <p>Scan for details</p>
                    </div>
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.close();
                            }, 500);
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <Modal
            title="Device QR Code"
            open={isOpen}
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose}>{t('common.close')}</Button>
                    <Button 
                        icon={<DownloadOutlined />} 
                        onClick={handleDownload}
                        disabled={!qrCodeData || loading}
                    >
                        Download
                    </Button>
                    <Button 
                        type="primary" 
                        icon={<PrinterOutlined />} 
                        onClick={handlePrint}
                        disabled={!qrCodeData || loading}
                    >
                        Print
                    </Button>
                </Space>
            }
            width={400}
            centered
        >
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                {loading ? (
                    <Spin size="large" tip="Generating QR Code..." />
                ) : qrCodeData ? (
                    <div>
                        <Title level={4} style={{ marginBottom: 4 }}>{device?.name}</Title>
                        {device?.hostname && <Text type="secondary">{device.hostname}</Text>}
                        <div style={{ margin: '20px 0' }}>
                            <img src={qrCodeData} alt="Device QR Code" style={{ width: 200, height: 200, border: '1px solid #f0f0f0', borderRadius: 8, padding: 8 }} />
                        </div>
                        <Text type="secondary">Scan this code to view device details</Text>
                    </div>
                ) : (
                    <Empty description="No QR Code available" />
                )}
            </div>
        </Modal>
    );
};

export default QrCodeModal;
