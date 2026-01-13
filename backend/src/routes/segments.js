const express = require('express');
const router = express.Router();
const segmentController = require('../controllers/segmentController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get statistics
router.get('/stats', segmentController.getSegmentStats);

// CRUD operations
router.get('/', segmentController.getSegments);
router.get('/:id', segmentController.getSegment);

// Create/Update/Delete require IT Ops or Admin role
router.post('/', requireRole('admin', 'it_ops'), segmentController.createSegment);
router.put('/:id', requireRole('admin', 'it_ops'), segmentController.updateSegment);
router.delete('/:id', requireRole('admin', 'it_ops'), segmentController.deleteSegment);

module.exports = router;
