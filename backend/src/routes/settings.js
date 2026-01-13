const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Public routes (for dropdowns - needs authentication)
router.get('/categories', authenticateToken, settingsController.getCategories);
router.get('/category/:category', authenticateToken, settingsController.getSettingsByCategory);

// Admin routes
router.use(authenticateToken);
router.use(requireRole('admin'));

router.get('/', settingsController.getSettings);
router.post('/', settingsController.createSetting);
router.put('/:id', settingsController.updateSetting);
router.delete('/:id', settingsController.deleteSetting);
router.post('/seed', settingsController.seedDefaults);

module.exports = router;
