const express = require('express');
const router = express.Router();
const slaController = require('../controllers/slaController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

// Manual trigger SLA worker
router.post('/trigger-worker', requireRole('admin'), slaController.triggerWorker);

// Get all SLA targets
router.get('/targets', slaController.getTargets);

// Update SLA target (Admin only)
router.put('/targets/:id', requireRole('admin'), slaController.updateTarget);

// Get dashboard metrics
router.get('/dashboard', slaController.getDashboardMetrics);

module.exports = router;
