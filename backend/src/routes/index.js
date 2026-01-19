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

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'IT Manager API is running',
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;

