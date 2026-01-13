const express = require('express');
const router = express.Router();
const pingController = require('../controllers/pingController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Ping all IPs in a segment
router.post('/segment/:segmentId', pingController.pingSegment);

// Get latest ping status for segment (without new ping)
router.get('/segment/:segmentId/latest', pingController.getLatestStatus);

// Get all latest ping status (for devices page)
router.get('/latest', pingController.getAllLatestStatus);

// Ping single IP
router.post('/ip/:id', pingController.pingSingleIp);

// Get ping history for an IP
router.get('/ip/:id/history', pingController.getIpHistory);

// Cleanup old history (admin only)
router.delete('/cleanup', pingController.cleanupHistory);

// Get IP conflicts detected
router.get('/conflicts', pingController.getConflicts);

module.exports = router;
