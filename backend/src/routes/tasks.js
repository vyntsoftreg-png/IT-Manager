const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get task statistics
router.get('/stats', taskController.getTaskStats);

// Get my assigned tasks
router.get('/my-tasks', taskController.getMyTasks);

// Export tasks
router.get('/export', taskController.exportTasks);

// CRUD operations
router.get('/', taskController.getTasks);
router.get('/:id', taskController.getTaskById);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', requireRole('admin', 'it_ops'), taskController.deleteTask);

// Task actions
router.put('/:id/assign', requireRole('admin', 'it_ops'), taskController.assignTask);
router.put('/:id/status', taskController.updateTaskStatus);

// Comments
router.get('/:id/comments', taskController.getTaskComments);
router.post('/:id/comments', taskController.addComment);
router.delete('/:id/comments/:commentId', taskController.deleteComment);

module.exports = router;
