const express = require('express');
const router = express.Router();
const personalTasksController = require('../controllers/personalTasksController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// GET /api/personal-tasks/stats - Get statistics
router.get('/stats', personalTasksController.getStats);

// GET /api/personal-tasks - Get all tasks
router.get('/', personalTasksController.getAll);

// GET /api/personal-tasks/:id - Get single task
router.get('/:id', personalTasksController.getById);

// POST /api/personal-tasks - Create task
router.post('/', personalTasksController.create);

// PUT /api/personal-tasks/:id - Update task
router.put('/:id', personalTasksController.update);

// PATCH /api/personal-tasks/:id/status - Update status
router.patch('/:id/status', personalTasksController.updateStatus);

// DELETE /api/personal-tasks/:id - Delete task
router.delete('/:id', personalTasksController.delete);

module.exports = router;

