const express = require('express');
const router = express.Router();
const ipController = require('../controllers/ipController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get IP statuses for dropdown
router.get('/statuses', ipController.getIpStatuses);

// Find free IPs
router.get('/find-free', ipController.findFreeIps);

// CRUD operations
router.get('/', ipController.getIpAddresses);
router.get('/:id', ipController.getIpAddress);

// Update/Assign/Release require IT Ops or Admin role
router.put('/:id', requireRole('admin', 'it_ops'), ipController.updateIpAddress);
router.post('/:id/assign', requireRole('admin', 'it_ops'), ipController.assignIpToDevice);
router.post('/:id/release', requireRole('admin', 'it_ops'), ipController.releaseIp);

module.exports = router;
