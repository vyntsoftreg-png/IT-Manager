const express = require('express');
const router = express.Router();
const personalTaskCategoriesController = require('../controllers/personalTaskCategoriesController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// GET /api/personal-task-categories - Get all categories
router.get('/', personalTaskCategoriesController.getAll);

// POST /api/personal-task-categories - Create category
router.post('/', personalTaskCategoriesController.create);

// PUT /api/personal-task-categories/:id - Update category
router.put('/:id', personalTaskCategoriesController.update);

// DELETE /api/personal-task-categories/:id - Delete category
router.delete('/:id', personalTaskCategoriesController.delete);

module.exports = router;

