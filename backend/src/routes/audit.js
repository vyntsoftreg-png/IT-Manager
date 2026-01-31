const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole('admin'));

// Get dropdown options
router.get('/actions', auditController.getActions);
router.get('/entity-types', auditController.getEntityTypes);
router.get('/stats', auditController.getAuditStats);

// Get logs
router.get('/export', auditController.exportAuditLogs);
router.get('/', auditController.getAuditLogs);
router.get('/:id', auditController.getAuditLog);

module.exports = router;
