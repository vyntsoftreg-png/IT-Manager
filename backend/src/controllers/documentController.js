const { Document, User } = require('../models');
const { Op } = require('sequelize');
const { createAuditLog } = require('../middleware/audit');

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

        res.json({
            success: true,
            data: rows,
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

        const { title, description, allow_download } = req.body;
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

        const doc = await Document.create({
            title: title || originalName.replace(/\.[^/.]+$/, ''),
            description: description || '',
            file_name: originalName,
            file_data: file.buffer,
            file_size: file.size,
            file_type: file.mimetype,
            file_extension: ext,
            allow_download: allow_download !== 'false',
            uploaded_by: req.user.id,
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

        const oldValues = { title: doc.title, description: doc.description, allow_download: doc.allow_download };
        const { title, description, allow_download } = req.body;
        await doc.update({
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(allow_download !== undefined && { allow_download }),
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
            title: result.title, description: result.description, allow_download: result.allow_download,
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

        if (!doc.allow_download && doc.uploaded_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Download not allowed' });
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

        await doc.increment('view_count');

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
};
