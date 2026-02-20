import { useEffect, useRef, useState } from 'react';
import { Spin } from 'antd';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
).toString();

const thumbnailCache = new Map();

const PdfThumbnail = ({ documentId, fetchBlob, height = 140 }) => {
    const canvasRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!documentId || !fetchBlob || !canvasRef.current) return;
        let cancelled = false;

        const renderThumbnail = async () => {
            try {
                if (thumbnailCache.has(documentId)) {
                    const cached = thumbnailCache.get(documentId);
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    canvas.width = cached.width;
                    canvas.height = cached.height;
                    canvas.getContext('2d').putImageData(cached.imageData, 0, 0);
                    if (!cancelled) setLoading(false);
                    return;
                }

                const blobUrl = await fetchBlob(documentId);
                if (cancelled) return;

                const doc = await pdfjsLib.getDocument(blobUrl).promise;
                const page = await doc.getPage(1);

                const baseViewport = page.getViewport({ scale: 1 });
                const scale = (height * 2) / baseViewport.height;
                const viewport = page.getViewport({ scale });

                const canvas = canvasRef.current;
                if (!canvas || cancelled) return;

                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');

                await page.render({ canvasContext: ctx, viewport }).promise;

                thumbnailCache.set(documentId, {
                    width: viewport.width,
                    height: viewport.height,
                    imageData: ctx.getImageData(0, 0, viewport.width, viewport.height),
                });

                URL.revokeObjectURL(blobUrl);
                if (!cancelled) setLoading(false);
            } catch (err) {
                console.error('Thumbnail error:', err);
                if (!cancelled) { setError(true); setLoading(false); }
            }
        };

        renderThumbnail();
        return () => { cancelled = true; };
    }, [documentId, fetchBlob, height]);

    if (error) return null;

    return (
        <div style={{
            position: 'relative', width: '100%', height,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            overflow: 'hidden', borderRadius: '6px 6px 0 0',
            background: 'rgba(255,255,255,0.03)',
        }}>
            {loading && <Spin size="small" style={{ position: 'absolute' }} />}
            <canvas
                ref={canvasRef}
                style={{
                    maxWidth: '100%',
                    maxHeight: height,
                    objectFit: 'contain',
                    opacity: loading ? 0 : 1,
                    transition: 'opacity 0.3s',
                }}
                onContextMenu={(e) => e.preventDefault()}
            />
        </div>
    );
};

export default PdfThumbnail;
