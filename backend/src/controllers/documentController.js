const { Document, User } = require('../models');
const { Op } = require('sequelize');
const { createAuditLog } = require('../middleware/audit');
const XLSX = require('xlsx');
const mammoth = require('mammoth');

const escapeXml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const generateExcelThumbnail = (buffer) => {
    try {
        const wb = XLSX.read(buffer, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) return null;
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const rows = data.slice(0, 12);
        const maxCols = Math.min(6, Math.max(...rows.map(r => r.length), 1));

        const colW = 280 / maxCols;
        let svgRows = '';
        rows.forEach((row, ri) => {
            const y = 28 + ri * 18;
            for (let ci = 0; ci < maxCols; ci++) {
                const x = 10 + ci * colW;
                const val = String(row[ci] || '').substring(0, 12);
                const bg = ri === 0 ? '#217346' : (ri % 2 === 0 ? '#f0f0f0' : '#ffffff');
                const fill = ri === 0 ? '#fff' : '#333';
                const fontSize = ri === 0 ? '7' : '6.5';
                svgRows += `<rect x="${x}" y="${y}" width="${colW - 1}" height="16" fill="${bg}" rx="1"/>`;
                svgRows += `<text x="${x + 3}" y="${y + 11}" font-family="Arial,sans-serif" font-size="${fontSize}" fill="${fill}">${escapeXml(val)}</text>`;
            }
        });

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="250" viewBox="0 0 300 250">
<rect width="300" height="250" fill="#fff" rx="4"/>
<rect width="300" height="24" fill="#217346" rx="4"/>
<text x="10" y="16" font-family="Arial,sans-serif" font-size="10" fill="#fff" font-weight="bold">${escapeXml(wb.SheetNames[0].substring(0, 35))}</text>
${svgRows}
</svg>`;
        return Buffer.from(svg, 'utf-8');
    } catch (e) {
        console.error('Excel thumbnail error:', e.message);
        return null;
    }
};

const generateWordThumbnail = async (buffer) => {
    try {
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value || '';
        const lines = text.split('\n').filter(l => l.trim()).slice(0, 14);

        let textLines = '';
        lines.forEach((line, i) => {
            const y = 36 + i * 16;
            const truncated = line.substring(0, 45);
            const fontSize = i === 0 ? '9' : '7.5';
            const weight = i === 0 ? 'bold' : 'normal';
            const fill = i === 0 ? '#1a1a1a' : '#444';
            textLines += `<text x="20" y="${y}" font-family="Georgia,serif" font-size="${fontSize}" fill="${fill}" font-weight="${weight}">${escapeXml(truncated)}</text>`;
        });

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="250" viewBox="0 0 300 250">
<rect width="300" height="250" fill="#fff" rx="4"/>
<rect x="12" y="12" width="276" height="226" fill="none" stroke="#ddd" stroke-width="1" rx="2"/>
<line x1="20" y1="24" x2="120" y2="24" stroke="#2B579A" stroke-width="2"/>
${textLines}
</svg>`;
        return Buffer.from(svg, 'utf-8');
    } catch (e) {
        console.error('Word thumbnail error:', e.message);
        return null;
    }
};

const generatePptThumbnail = (buffer) => {
    try {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(buffer);
        // Try to find an image in the presentation
        const entries = zip.getEntries();
        const mediaImg = entries.find(e =>
            e.entryName.startsWith('ppt/media/') &&
            (e.entryName.endsWith('.png') || e.entryName.endsWith('.jpg') || e.entryName.endsWith('.jpeg'))
        );
        if (mediaImg) return mediaImg.getData();

        // Fallback: generate a simple PPT-style SVG
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="250" viewBox="0 0 300 250">
<rect width="300" height="250" fill="#D24726" rx="4"/>
<rect x="10" y="10" width="280" height="230" fill="#fff" rx="4"/>
<rect x="20" y="20" width="260" height="40" fill="#f5f5f5" rx="2"/>
<text x="150" y="46" font-family="Arial,sans-serif" font-size="12" fill="#D24726" text-anchor="middle" font-weight="bold">PowerPoint</text>
<rect x="30" y="80" width="240" height="4" fill="#eee" rx="2"/>
<rect x="30" y="92" width="200" height="4" fill="#eee" rx="2"/>
<rect x="30" y="104" width="220" height="4" fill="#eee" rx="2"/>
<rect x="60" y="130" width="180" height="90" fill="#f8f8f8" rx="4" stroke="#ddd"/>
</svg>`;
        return Buffer.from(svg, 'utf-8');
    } catch (e) {
        console.error('PPT thumbnail error:', e.message);
        return null;
    }
};

const generateThumbnail = async (fileBuffer, ext) => {
    try {
        if (ext === 'xlsx' || ext === 'xls') return generateExcelThumbnail(fileBuffer);
        if (ext === 'docx') return await generateWordThumbnail(fileBuffer);
        if (ext === 'pptx') return generatePptThumbnail(fileBuffer);
        return null;
    } catch (err) {
        console.error('Thumbnail generation error:', err.message);
        return null;
    }
};

const getDocuments = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            file_type,
            uploaded_by,
            from_date,
            to_date,
            sortBy = 'created_at',
            sortOrder = 'DESC',
        } = req.query;

        const where = {};
        if (search) {
            where[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } },
                { file_name: { [Op.like]: `%${search}%` } },
            ];
        }
        if (file_type) {
            where.file_extension = file_type;
        }
        if (uploaded_by) {
            where.uploaded_by = uploaded_by;
        }
        if (from_date || to_date) {
            where.created_at = {};
            if (from_date) where.created_at[Op.gte] = new Date(from_date);
            if (to_date) {
                const end = new Date(to_date);
                end.setHours(23, 59, 59, 999);
                where.created_at[Op.lte] = end;
            }
        }

        // Visibility filter
        const { visibility } = req.query;
        if (visibility === 'public') {
            where.is_public = true;
        } else if (visibility === 'private') {
            where.is_public = false;
        }

        // Anonymous users only see public documents
        if (!req.user) {
            where.is_public = true;
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows } = await Document.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'uploader',
                    attributes: ['id', 'username', 'display_name'],
                },
            ],
            order: [[sortBy, sortOrder]],
            limit: parseInt(limit),
            offset,
            attributes: { exclude: ['file_data'] },
        });
        const data = rows.map(row => {
            const json = row.toJSON();
            const thumb = row.getDataValue('thumbnail');
            if (thumb) {
                const isSvg = thumb.toString('utf-8', 0, 5).includes('<svg');
                const mime = isSvg ? 'image/svg+xml' : 'image/jpeg';
                json.thumbnail_url = `data:${mime};base64,${thumb.toString('base64')}`;
            }
            json.has_thumbnail = !!thumb;
            return json;
        });

        res.json({
            success: true,
            data,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ success: false, message: 'Failed to load documents' });
    }
};

const getUploaders = async (req, res) => {
    try {
        const uploaders = await Document.findAll({
            attributes: ['uploaded_by'],
            include: [{
                model: User,
                as: 'uploader',
                attributes: ['id', 'username', 'display_name'],
            }],
            group: ['uploaded_by'],
            raw: false,
        });
        const users = uploaders.map(d => d.uploader).filter(Boolean);
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Get uploaders error:', error);
        res.status(500).json({ success: false, message: 'Failed to load uploaders' });
    }
};

const getDocumentById = async (req, res) => {
    try {
        const doc = await Document.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'uploader',
                    attributes: ['id', 'username', 'display_name'],
                },
            ],
            attributes: { exclude: ['file_data'] },
        });

        if (!doc) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        if (!doc.is_public && !req.user) {
            return res.status(403).json({ success: false, message: 'Authentication required to view this document' });
        }

        res.json({ success: true, data: doc });
    } catch (error) {
        console.error('Get document error:', error);
        res.status(500).json({ success: false, message: 'Failed to load document' });
    }
};

const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { title, description, allow_download, is_public } = req.body;
        const file = req.file;

        // Multer encodes originalname as latin1 — decode to utf8 for Vietnamese support
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

        const ext = originalName.split('.').pop().toLowerCase();
        const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
        if (!allowedExtensions.includes(ext)) {
            return res.status(400).json({
                success: false,
                message: `File type .${ext} is not supported. Allowed: ${allowedExtensions.join(', ')}`,
            });
        }

        const thumbnail = await generateThumbnail(file.buffer, ext);

        const doc = await Document.create({
            title: title || originalName.replace(/\.[^/.]+$/, ''),
            description: description || '',
            file_name: originalName,
            file_data: file.buffer,
            file_size: file.size,
            file_type: file.mimetype,
            file_extension: ext,
            allow_download: allow_download !== 'false',
            is_public: is_public !== 'false',
            uploaded_by: req.user.id,
            thumbnail,
        });

        const result = await Document.findByPk(doc.id, {
            include: [
                {
                    model: User,
                    as: 'uploader',
                    attributes: ['id', 'username', 'display_name'],
                },
            ],
            attributes: { exclude: ['file_data'] },
        });

        await createAuditLog(req.user.id, 'create', 'Document', doc.id, null, {
            title: result.title, file_name: result.file_name, file_size: result.file_size, file_extension: result.file_extension,
        }, req);

        res.status(201).json({ success: true, data: result, message: 'Document uploaded successfully' });
    } catch (error) {
        console.error('Upload document error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload document' });
    }
};

const updateDocument = async (req, res) => {
    try {
        const doc = await Document.findByPk(req.params.id);
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        if (doc.uploaded_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Permission denied' });
        }

        const oldValues = { title: doc.title, description: doc.description, allow_download: doc.allow_download, is_public: doc.is_public };
        const { title, description, allow_download, is_public } = req.body;
        await doc.update({
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(allow_download !== undefined && { allow_download }),
            ...(is_public !== undefined && { is_public }),
        });

        const result = await Document.findByPk(doc.id, {
            include: [
                {
                    model: User,
                    as: 'uploader',
                    attributes: ['id', 'username', 'display_name'],
                },
            ],
            attributes: { exclude: ['file_data'] },
        });

        await createAuditLog(req.user.id, 'update', 'Document', doc.id, oldValues, {
            title: result.title, description: result.description, allow_download: result.allow_download, is_public: result.is_public,
        }, req);

        res.json({ success: true, data: result, message: 'Document updated successfully' });
    } catch (error) {
        console.error('Update document error:', error);
        res.status(500).json({ success: false, message: 'Failed to update document' });
    }
};

const deleteDocument = async (req, res) => {
    try {
        const doc = await Document.findByPk(req.params.id);
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        if (doc.uploaded_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Permission denied' });
        }

        const oldValues = { title: doc.title, file_name: doc.file_name, file_size: doc.file_size };
        await doc.destroy();
        await createAuditLog(req.user.id, 'delete', 'Document', req.params.id, oldValues, null, req);
        res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete document' });
    }
};

const downloadDocument = async (req, res) => {
    try {
        const doc = await Document.findByPk(req.params.id);
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        if (!doc.is_public && !req.user) {
            return res.status(403).json({ success: false, message: 'Authentication required' });
        }

        if (!doc.allow_download) {
            if (!req.user || (doc.uploaded_by !== req.user.id && req.user.role !== 'admin')) {
                return res.status(403).json({ success: false, message: 'Download not allowed' });
            }
        }

        await doc.increment('download_count');

        res.set({
            'Content-Type': doc.file_type,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.file_name)}"`,
            'Content-Length': doc.file_size,
        });
        res.send(doc.file_data);
    } catch (error) {
        console.error('Download document error:', error);
        res.status(500).json({ success: false, message: 'Failed to download document' });
    }
};

const previewDocument = async (req, res) => {
    try {
        const doc = await Document.findByPk(req.params.id);
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        if (!doc.is_public && !req.user) {
            return res.status(403).json({ success: false, message: 'Authentication required' });
        }

        await doc.increment('view_count');

        const ext = doc.file_extension;
        const readonly = !doc.allow_download;

        // Security: block right-click, copy, save, print for readonly docs
        const securityCss = readonly ? `
  * { -webkit-user-select: none !important; -moz-user-select: none !important; -ms-user-select: none !important; user-select: none !important; }
  @media print { body { display: none !important; } }` : '';

        const securityScript = readonly ? `<script>
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && ['s','p','c','a','u'].includes(e.key.toLowerCase())) e.preventDefault();
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['i','j','c'].includes(e.key.toLowerCase()))) e.preventDefault();
});
document.addEventListener('dragstart', e => e.preventDefault());
document.addEventListener('copy', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());
</script>` : '';

        // Convert Word to HTML
        if (ext === 'docx') {
            try {
                const result = await mammoth.convertToHtml({ buffer: doc.file_data });
                const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; color: #333; background: #fff; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  td, th { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background: #f5f5f5; font-weight: bold; }
  img { max-width: 100%; height: auto; }
  h1 { font-size: 24px; color: #1a1a1a; }
  h2 { font-size: 20px; color: #333; }
  p { margin: 8px 0; }
  a { pointer-events: none; color: #666; text-decoration: none; }
  ${securityCss}
</style></head><body>${result.value}${securityScript}</body></html>`;
                res.set({ 'Content-Type': 'text/html; charset=utf-8' });
                return res.send(html);
            } catch (e) {
                console.error('Word preview error:', e.message);
            }
        }

        // Convert Excel to HTML
        if (ext === 'xlsx' || ext === 'xls') {
            try {
                const wb = XLSX.read(doc.file_data, { type: 'buffer' });
                let tablesHtml = '';
                wb.SheetNames.forEach((name, idx) => {
                    const ws = wb.Sheets[name];
                    const htmlTable = XLSX.utils.sheet_to_html(ws, { id: `sheet-${idx}` });
                    tablesHtml += `<h2>${escapeXml(name)}</h2>${htmlTable}`;
                });
                const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: #fff; color: #333; }
  h2 { color: #217346; font-size: 16px; margin-top: 24px; padding-bottom: 4px; border-bottom: 2px solid #217346; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0 24px; font-size: 13px; }
  td, th { border: 1px solid #d0d0d0; padding: 6px 10px; text-align: left; white-space: nowrap; }
  th { background: #217346; color: #fff; font-weight: 600; }
  tr:nth-child(even) td { background: #f8faf8; }
  tr:hover td { background: #e8f5e9; }
  ${securityCss}
</style></head><body>${tablesHtml}${securityScript}</body></html>`;
                res.set({ 'Content-Type': 'text/html; charset=utf-8' });
                return res.send(html);
            } catch (e) {
                console.error('Excel preview error:', e.message);
            }
        }

        // Default: serve raw file (PDF, etc.)
        res.set({
            'Content-Type': doc.file_type,
            'Content-Disposition': `inline; filename="${encodeURIComponent(doc.file_name)}"`,
            'Content-Length': doc.file_size,
        });
        res.send(doc.file_data);
    } catch (error) {
        console.error('Preview document error:', error);
        res.status(500).json({ success: false, message: 'Failed to preview document' });
    }
};

const getStats = async (req, res) => {
    try {
        const total = await Document.count();
        const totalSize = await Document.sum('file_size') || 0;

        const byType = await Document.findAll({
            attributes: [
                'file_extension',
                [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
            ],
            group: ['file_extension'],
            raw: true,
        });

        const recentCount = await Document.count({
            where: {
                created_at: {
                    [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                },
            },
        });

        res.json({
            success: true,
            data: {
                total,
                totalSize,
                byType,
                recentCount,
            },
        });
    } catch (error) {
        console.error('Get document stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to load stats' });
    }
};

const getThumbnail = async (req, res) => {
    try {
        const doc = await Document.findByPk(req.params.id, {
            attributes: ['id', 'thumbnail', 'file_extension'],
        });
        if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
        if (!doc.thumbnail) return res.status(404).json({ success: false, message: 'No thumbnail' });

        const isSvg = doc.thumbnail.toString('utf-8', 0, 5).includes('<svg');
        res.set('Content-Type', isSvg ? 'image/svg+xml' : 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(doc.thumbnail);
    } catch (error) {
        console.error('Get thumbnail error:', error);
        res.status(500).json({ success: false, message: 'Failed to load thumbnail' });
    }
};

module.exports = {
    getDocuments,
    getUploaders,
    getDocumentById,
    uploadDocument,
    updateDocument,
    deleteDocument,
    downloadDocument,
    previewDocument,
    getStats,
    getThumbnail,
    generateThumbnailForExisting: generateThumbnail,
};
