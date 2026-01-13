const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get dropdowns
router.get('/system-types', accountController.getSystemTypes);
router.get('/environments', accountController.getEnvironments);
router.get('/stats', accountController.getAccountStats);

// Export/Import routes
router.post('/export', requireRole('admin', 'it_ops'), accountController.exportAccounts);
router.post('/import', requireRole('admin'), accountController.importAccounts);
router.get('/template', accountController.getImportTemplate);

// CRUD operations
router.get('/', accountController.getAccounts);
router.get('/:id', accountController.getAccount);

// Create/Update/Delete require IT Ops or Admin role
router.post('/', requireRole('admin', 'it_ops'), accountController.createAccount);
router.put('/:id', requireRole('admin', 'it_ops'), accountController.updateAccount);
router.delete('/:id', requireRole('admin'), accountController.deleteAccount); // Only admin can delete
router.post('/bulk-delete', requireRole('admin'), accountController.bulkDeleteAccounts);

// Reveal password - requires re-authentication
router.post('/:id/reveal-password', requireRole('admin', 'it_ops'), accountController.revealPassword);

module.exports = router;
