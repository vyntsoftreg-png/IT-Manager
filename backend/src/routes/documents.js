const express = require('express');
const router = express.Router();
const multer = require('multer');
const documentController = require('../controllers/documentController');
const { authenticateToken } = require('../middleware/auth');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('File type not supported'), false);
        }
    },
});

router.use(authenticateToken);

router.get('/stats', documentController.getStats);
router.get('/uploaders', documentController.getUploaders);
router.get('/', documentController.getDocuments);
router.get('/:id', documentController.getDocumentById);
router.post('/', upload.single('file'), documentController.uploadDocument);
router.put('/:id', documentController.updateDocument);
router.delete('/:id', documentController.deleteDocument);
router.get('/:id/download', documentController.downloadDocument);
router.get('/:id/preview', documentController.previewDocument);

// Multer error handler
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'File size exceeds 50MB limit' });
        }
        return res.status(400).json({ success: false, message: err.message });
    }
    if (err.message === 'File type not supported') {
        return res.status(400).json({ success: false, message: 'File type not supported. Allowed: PDF, Word, Excel, PowerPoint' });
    }
    next(err);
});

module.exports = router;
