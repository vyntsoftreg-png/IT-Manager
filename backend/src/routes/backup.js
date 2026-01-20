const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const backupController = require('../controllers/backupController');

// All backup routes require admin authentication
router.use(authenticateToken);
router.use(requireRole('admin'));

// GET /api/backup/export - Download database export
router.get('/export', backupController.exportDatabase);

// POST /api/backup/import - Import database from JSON
router.post('/import', backupController.importDatabase);

// GET /api/backup/info - Get database info
router.get('/info', backupController.getBackupInfo);

module.exports = router;
