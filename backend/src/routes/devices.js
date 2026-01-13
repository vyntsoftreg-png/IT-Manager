const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get device types and statuses (for dropdowns)
router.get('/types', deviceController.getDeviceTypes);
router.get('/statuses', deviceController.getDeviceStatuses);
router.get('/stats', deviceController.getDeviceStats);

// CRUD operations
router.get('/', deviceController.getDevices);
router.get('/:id', deviceController.getDevice);

// Create/Update/Delete require IT Ops or Admin role
router.post('/', requireRole('admin', 'it_ops'), deviceController.createDevice);
router.put('/:id', requireRole('admin', 'it_ops'), deviceController.updateDevice);
router.delete('/:id', requireRole('admin', 'it_ops'), deviceController.deleteDevice);
router.post('/bulk-delete', requireRole('admin', 'it_ops'), deviceController.bulkDeleteDevices);

// Import/Export CSV
router.get('/export/csv', requireRole('admin', 'it_ops'), deviceController.exportDevicesCSV);
router.post('/import/csv', requireRole('admin', 'it_ops'), deviceController.importDevicesCSV);

module.exports = router;
