const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const deviceRoutes = require('./devices');
const segmentRoutes = require('./segments');
const ipRoutes = require('./ips');
const accountRoutes = require('./accounts');
const auditRoutes = require('./audit');
const searchRoutes = require('./search');
const settingsRoutes = require('./settings');
const pingRoutes = require('./ping');
const taskRoutes = require('./tasks');
const supportRoutes = require('./support');
const backupRoutes = require('./backup');
const personalTaskRoutes = require('./personalTasks');
const personalTaskCategoryRoutes = require('./personalTaskCategories');

router.use('/auth', authRoutes);
router.use('/devices', deviceRoutes);
router.use('/segments', segmentRoutes);
router.use('/ips', ipRoutes);
router.use('/accounts', accountRoutes);
router.use('/audit', auditRoutes);
router.use('/search', searchRoutes);
router.use('/settings', settingsRoutes);
router.use('/ping', pingRoutes);
router.use('/tasks', taskRoutes);
router.use('/support', supportRoutes);
router.use('/backup', backupRoutes);
router.use('/wiki', require('./wiki'));
router.use('/personal-tasks', personalTaskRoutes);
router.use('/personal-task-categories', personalTaskCategoryRoutes);
router.use('/telegram', require('./telegram'));

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'IT Manager API is running',
        timestamp: new Date().toISOString(),
    });
});

const { startNetworkScan } = require('../services/scanService');

// ... other routes

router.post('/scan', (req, res) => {
    const { subnet } = req.body;
    // Basic validation
    startNetworkScan(subnet || '192.168.1');
    res.json({ success: true, message: 'Scan started in background' });
});

module.exports = router;

