import { useEffect, useRef, useState } from 'react';
import { Spin, Button, Space, Typography } from 'antd';
import { LeftOutlined, RightOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
).toString();

const { Text } = Typography;

const PdfCanvasViewer = ({ url }) => {
    const containerRef = useRef(null);
    const [pdfDoc, setPdfDoc] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(1.5);
    const [loading, setLoading] = useState(true);
    const canvasRef = useRef(null);
    const renderTaskRef = useRef(null);

    useEffect(() => {
        if (!url) return;
        let cancelled = false;
        setLoading(true);

        const loadPdf = async () => {
            try {
                const doc = await pdfjsLib.getDocument(url).promise;
                if (!cancelled) {
                    setPdfDoc(doc);
                    setTotalPages(doc.numPages);
                    setCurrentPage(1);
                    setLoading(false);
                }
            } catch (err) {
                console.error('PDF load error:', err);
                setLoading(false);
            }
        };
        loadPdf();

        return () => { cancelled = true; };
    }, [url]);

    useEffect(() => {
        if (!pdfDoc || !canvasRef.current) return;

        const renderPage = async () => {
            try {
                const page = await pdfDoc.getPage(currentPage);
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');

                canvas.height = viewport.height;
                canvas.width = viewport.width;
                canvas.style.width = viewport.width + 'px';
                canvas.style.height = viewport.height + 'px';

                if (renderTaskRef.current) {
                    renderTaskRef.current.cancel();
                }

                renderTaskRef.current = page.render({
                    canvasContext: ctx,
                    viewport,
                });

                await renderTaskRef.current.promise;
            } catch (err) {
                if (err?.name !== 'RenderingCancelledException') {
                    console.error('PDF render error:', err);
                }
            }
        };

        renderPage();
    }, [pdfDoc, currentPage, scale]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!pdfDoc) {
        return <div style={{ textAlign: 'center', padding: 40 }}>Failed to load PDF</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)',
                flexShrink: 0,
            }}>
                <Space>
                    <Button
                        size="small" icon={<LeftOutlined />}
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    />
                    <Text style={{ minWidth: 80, textAlign: 'center' }}>
                        {currentPage} / {totalPages}
                    </Text>
                    <Button
                        size="small" icon={<RightOutlined />}
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    />
                </Space>
                <Space>
                    <Button
                        size="small" icon={<ZoomOutOutlined />}
                        disabled={scale <= 0.5}
                        onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                    />
                    <Text style={{ minWidth: 50, textAlign: 'center' }}>
                        {Math.round(scale * 100)}%
                    </Text>
                    <Button
                        size="small" icon={<ZoomInOutlined />}
                        disabled={scale >= 3}
                        onClick={() => setScale(s => Math.min(3, s + 0.25))}
                    />
                </Space>
            </div>
            <div
                ref={containerRef}
                style={{
                    flex: 1, overflow: 'auto', display: 'flex',
                    justifyContent: 'center', padding: 16,
                    userSelect: 'none', WebkitUserSelect: 'none',
                }}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
            >
                <canvas
                    ref={canvasRef}
                    style={{ display: 'block' }}
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                />
            </div>
        </div>
    );
};

export default PdfCanvasViewer;
