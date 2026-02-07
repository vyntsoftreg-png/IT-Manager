const { PersonalTask, PersonalTaskCategory, User } = require('../models');
const { Op } = require('sequelize');
const telegramService = require('../services/telegramService');

// Get all personal tasks for current user
const getAll = async (req, res) => {
    try {
        const { status, category_id, priority, from_date, to_date, include_subtasks } = req.query;

        const where = {
            user_id: req.user.id,
            parent_id: null // Only get parent tasks by default
        };

        if (status) where.status = status;
        if (category_id) where.category_id = category_id;
        if (priority) where.priority = priority;

        if (from_date || to_date) {
            where.due_date = {};
            if (from_date) where.due_date[Op.gte] = from_date;
            if (to_date) where.due_date[Op.lte] = to_date;
        }

        // If include_subtasks is true, remove parent_id filter
        if (include_subtasks === 'true') {
            delete where.parent_id;
        }

        const tasks = await PersonalTask.findAll({
            where,
            include: [
                { model: PersonalTaskCategory, as: 'category' },
                {
                    model: PersonalTask,
                    as: 'subtasks',
                    include: [{ model: PersonalTaskCategory, as: 'category' }]
                }
            ],
            order: [
                ['due_date', 'ASC'],
                ['priority', 'DESC'],
                ['created_at', 'DESC']
            ]
        });

        res.json({ success: true, data: tasks });
    } catch (error) {
        console.error('Get personal tasks error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách task' });
    }
};

// Get single task by ID
const getById = async (req, res) => {
    try {
        const task = await PersonalTask.findOne({
            where: { id: req.params.id, user_id: req.user.id },
            include: [
                { model: PersonalTaskCategory, as: 'category' },
                {
                    model: PersonalTask,
                    as: 'subtasks',
                    include: [{ model: PersonalTaskCategory, as: 'category' }]
                },
                { model: PersonalTask, as: 'parent' }
            ]
        });

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task không tồn tại' });
        }

        res.json({ success: true, data: task });
    } catch (error) {
        console.error('Get personal task error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin task' });
    }
};

// Create new task
const create = async (req, res) => {
    try {
        const { title, description, category_id, priority, due_date, recurring_type, recurring_end_date, parent_id } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Tiêu đề task là bắt buộc' });
        }

        const task = await PersonalTask.create({
            title,
            description,
            category_id,
            priority: priority || 'medium',
            due_date,
            recurring_type: recurring_type || 'none',
            recurring_end_date,
            parent_id,
            user_id: req.user.id
        });

        const fullTask = await PersonalTask.findByPk(task.id, {
            include: [
                { model: PersonalTaskCategory, as: 'category' },
                { model: PersonalTask, as: 'subtasks' }
            ]
        });

        // Send Telegram notification (only for main tasks, not subtasks)
        if (!parent_id) {
            // Fetch user with telegram_chat_id from database
            const user = await User.findByPk(req.user.id);
            if (user?.telegram_chat_id) {
                telegramService.sendTaskCreatedNotification(user.telegram_chat_id, task)
                    .then(result => {
                        if (result.success) {
                            console.log('[Telegram] Task created notification sent successfully');
                        } else {
                            console.error('[Telegram] Failed to send notification:', result.error);
                        }
                    })
                    .catch(err => console.error('[Telegram] Error sending notification:', err));
            }
        }

        res.status(201).json({ success: true, data: fullTask });
    } catch (error) {
        console.error('Create personal task error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi tạo task' });
    }
};

// Update task
const update = async (req, res) => {
    try {
        const task = await PersonalTask.findOne({
            where: { id: req.params.id, user_id: req.user.id }
        });

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task không tồn tại' });
        }

        const { title, description, category_id, priority, status, due_date, recurring_type, recurring_end_date } = req.body;

        // Handle status change - set completed_at if completing
        const updateData = {
            title: title ?? task.title,
            description: description ?? task.description,
            category_id: category_id ?? task.category_id,
            priority: priority ?? task.priority,
            status: status ?? task.status,
            due_date: due_date ?? task.due_date,
            recurring_type: recurring_type ?? task.recurring_type,
            recurring_end_date: recurring_end_date ?? task.recurring_end_date
        };

        // If completing task, set completed_at
        if (status === 'completed' && task.status !== 'completed') {
            updateData.completed_at = new Date();
        }

        await task.update(updateData);

        const fullTask = await PersonalTask.findByPk(task.id, {
            include: [
                { model: PersonalTaskCategory, as: 'category' },
                { model: PersonalTask, as: 'subtasks' }
            ]
        });

        // Send Telegram notification when task is completed
        if (status === 'completed' && task.status !== 'completed') {
            const user = await User.findByPk(req.user.id);
            if (user?.telegram_chat_id) {
                telegramService.sendTaskCompletedNotification(user.telegram_chat_id, task)
                    .catch(err => console.error('[Telegram] Error sending notification:', err));
            }
        }

        res.json({ success: true, data: fullTask });
    } catch (error) {
        console.error('Update personal task error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật task' });
    }
};

// Update status (quick action)
const updateStatus = async (req, res) => {
    try {
        const task = await PersonalTask.findOne({
            where: { id: req.params.id, user_id: req.user.id }
        });

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task không tồn tại' });
        }

        const { status } = req.body;
        const oldStatus = task.status;

        const updateData = { status };

        // If completing task, set completed_at
        if (status === 'completed' && oldStatus !== 'completed') {
            updateData.completed_at = new Date();

            // Handle recurring task - create new task immediately
            if (task.recurring_type !== 'none') {
                await createNextRecurringTask(task);
            }
        }

        await task.update(updateData);

        const fullTask = await PersonalTask.findByPk(task.id, {
            include: [
                { model: PersonalTaskCategory, as: 'category' },
                { model: PersonalTask, as: 'subtasks' }
            ]
        });

        // Send Telegram notification when task is completed
        if (status === 'completed' && oldStatus !== 'completed') {
            const user = await User.findByPk(req.user.id);
            if (user?.telegram_chat_id) {
                telegramService.sendTaskCompletedNotification(user.telegram_chat_id, task)
                    .then(result => {
                        if (result.success) {
                            console.log('[Telegram] Task completed notification sent successfully');
                        }
                    })
                    .catch(err => console.error('[Telegram] Error sending notification:', err));
            }
        }

        res.json({ success: true, data: fullTask });
    } catch (error) {
        console.error('Update personal task status error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái task' });
    }
};

// Helper function to create next recurring task
const createNextRecurringTask = async (originalTask) => {
    if (!originalTask.due_date) return;

    const currentDueDate = new Date(originalTask.due_date);
    let nextDueDate;

    switch (originalTask.recurring_type) {
        case 'daily':
            nextDueDate = new Date(currentDueDate);
            nextDueDate.setDate(nextDueDate.getDate() + 1);
            break;
        case 'weekly':
            nextDueDate = new Date(currentDueDate);
            nextDueDate.setDate(nextDueDate.getDate() + 7);
            break;
        case 'monthly':
            nextDueDate = new Date(currentDueDate);
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            break;
        default:
            return;
    }

    // Check if next due date is within recurring end date
    if (originalTask.recurring_end_date && nextDueDate > new Date(originalTask.recurring_end_date)) {
        return;
    }

    // Create new task
    await PersonalTask.create({
        title: originalTask.title,
        description: originalTask.description,
        category_id: originalTask.category_id,
        priority: originalTask.priority,
        due_date: nextDueDate.toISOString().split('T')[0],
        recurring_type: originalTask.recurring_type,
        recurring_end_date: originalTask.recurring_end_date,
        user_id: originalTask.user_id,
        status: 'pending'
    });
};

// Delete task
const deleteTask = async (req, res) => {
    try {
        const task = await PersonalTask.findOne({
            where: { id: req.params.id, user_id: req.user.id }
        });

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task không tồn tại' });
        }

        // Delete subtasks first
        await PersonalTask.destroy({ where: { parent_id: task.id } });

        // Delete the task
        await task.destroy();

        res.json({ success: true, message: 'Đã xóa task thành công' });
    } catch (error) {
        console.error('Delete personal task error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi xóa task' });
    }
};

// Get statistics
const getStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date().toISOString().split('T')[0];

        const [total, pending, inProgress, completed, overdue] = await Promise.all([
            PersonalTask.count({ where: { user_id: userId, parent_id: null } }),
            PersonalTask.count({ where: { user_id: userId, parent_id: null, status: 'pending' } }),
            PersonalTask.count({ where: { user_id: userId, parent_id: null, status: 'in_progress' } }),
            PersonalTask.count({ where: { user_id: userId, parent_id: null, status: 'completed' } }),
            PersonalTask.count({
                where: {
                    user_id: userId,
                    parent_id: null,
                    status: { [Op.ne]: 'completed' },
                    due_date: { [Op.lt]: today }
                }
            })
        ]);

        res.json({
            success: true,
            data: { total, pending, inProgress, completed, overdue }
        });
    } catch (error) {
        console.error('Get personal task stats error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy thống kê' });
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    updateStatus,
    delete: deleteTask,
    getStats
};
