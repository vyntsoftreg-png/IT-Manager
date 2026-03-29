const express = require('express');
const router = express.Router();
const multer = require('multer');
const segmentController = require('../controllers/segmentController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
        }
    },
});

// All routes require authentication
router.use(authenticateToken);

// Get statistics
router.get('/stats', segmentController.getSegmentStats);

// CRUD operations
router.get('/', segmentController.getSegments);
router.get('/:id', segmentController.getSegment);

// Export segment IPs to Excel
router.get('/:id/export', segmentController.exportSegment);

// Create/Update/Delete require IT Ops or Admin role
router.post('/', requireRole('admin', 'it_ops'), segmentController.createSegment);
router.put('/:id', requireRole('admin', 'it_ops'), segmentController.updateSegment);
router.delete('/:id', requireRole('admin', 'it_ops'), segmentController.deleteSegment);

// Import IPs from Excel
router.post('/:id/import', requireRole('admin', 'it_ops'), upload.single('file'), segmentController.importSegment);

module.exports = router;

