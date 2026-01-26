const { Task, TaskComment, User, AuditLog } = require('../models');
const { Op } = require('sequelize');
const { emitEvent } = require('../services/socketService');

// Get all tasks with filters and pagination
const getTasks = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            priority,
            category,
            assigned_to,
            search,
            from_date,
            to_date,
        } = req.query;

        const where = {};

        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (category) where.category = category;
        if (assigned_to) where.assigned_to = assigned_to;

        if (search) {
            where[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { task_number: { [Op.like]: `%${search}%` } },
                { requester_name: { [Op.like]: `%${search}%` } },
            ];
        }

        if (from_date || to_date) {
            where.created_at = {};
            if (from_date) where.created_at[Op.gte] = new Date(from_date);
            if (to_date) where.created_at[Op.lte] = new Date(to_date + 'T23:59:59');
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { rows: tasks, count: total } = await Task.findAndCountAll({
            where,
            include: [
                { model: User, as: 'assignee', attributes: ['id', 'username', 'display_name'] },
                { model: User, as: 'creator', attributes: ['id', 'username', 'display_name'] },
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset,
        });

        res.json({
            success: true,
            data: tasks,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Get tasks error:', error.message);
        console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        res.status(500).json({ success: false, message: 'Failed to get tasks', error: error.message });
    }
};

// Get single task by ID
const getTaskById = async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id, {
            include: [
                { model: User, as: 'assignee', attributes: ['id', 'username', 'display_name'] },
                { model: User, as: 'creator', attributes: ['id', 'username', 'display_name'] },
                {
                    model: TaskComment,
                    as: 'comments',
                    include: [{ model: User, as: 'user', attributes: ['id', 'username', 'display_name'] }],
                    order: [['created_at', 'ASC']],
                },
            ],
        });

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        res.json({ success: true, data: task });
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({ success: false, message: 'Failed to get task' });
    }
};

// Create new task (support request)
const createTask = async (req, res) => {
    try {
        const taskData = {
            ...req.body,
            created_by: req.user?.id || null,
        };

        const task = await Task.create(taskData);

        // Log audit
        if (req.user) {
            await AuditLog.create({
                user_id: req.user.id,
                action: 'CREATE',
                entity_type: 'task',
                entity_id: task.id,
                new_values: taskData,
                ip_address: req.ip,
                ip_address: req.ip,
            });
        }

        // Emit real-time notification
        emitEvent('notification', {
            type: 'info',
            title: 'New Support Request',
            message: `New request #${task.task_number}: ${task.title}`
        });

        // Emit task created event for refreshing lists
        emitEvent('task:created', task);

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: task,
        });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ success: false, message: 'Failed to create task' });
    }
};

// Update task
const updateTask = async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const oldValues = task.toJSON();

        // If status changed to resolved, set resolved_at
        if (req.body.status === 'resolved' && task.status !== 'resolved') {
            req.body.resolved_at = new Date();
        }

        await task.update(req.body);

        // Log audit
        await AuditLog.create({
            user_id: req.user.id,
            action: 'UPDATE',
            entity_type: 'task',
            entity_id: task.id,
            old_values: oldValues,
            new_values: req.body,
            ip_address: req.ip,
        });

        res.json({ success: true, message: 'Task updated', data: task });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ success: false, message: 'Failed to update task' });
    }
};

// Delete task
const deleteTask = async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        await TaskComment.destroy({ where: { task_id: task.id } });
        await task.destroy();

        await AuditLog.create({
            user_id: req.user.id,
            action: 'DELETE',
            entity_type: 'task',
            entity_id: req.params.id,
            old_values: task.toJSON(),
            ip_address: req.ip,
        });

        res.json({ success: true, message: 'Task deleted' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete task' });
    }
};

// Assign task
const assignTask = async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const oldAssignee = task.assigned_to;
        await task.update({
            assigned_to: req.body.assigned_to,
            status: task.status === 'open' ? 'in_progress' : task.status,
        });

        await AuditLog.create({
            user_id: req.user.id,
            action: 'UPDATE',
            entity_type: 'task',
            entity_id: task.id,
            old_values: { assigned_to: oldAssignee },
            new_values: { assigned_to: req.body.assigned_to },
            ip_address: req.ip,
        });

        res.json({ success: true, message: 'Task assigned', data: task });
    } catch (error) {
        console.error('Assign task error:', error);
        res.status(500).json({ success: false, message: 'Failed to assign task' });
    }
};

// Update task status
const updateTaskStatus = async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const oldStatus = task.status;
        const updateData = { status: req.body.status };

        if (req.body.status === 'resolved') {
            updateData.resolved_at = new Date();
        }

        await task.update(updateData);

        await AuditLog.create({
            user_id: req.user.id,
            action: 'UPDATE',
            entity_type: 'task',
            entity_id: task.id,
            old_values: { status: oldStatus },
            new_values: { status: req.body.status },
            ip_address: req.ip,
        });

        res.json({ success: true, message: 'Status updated', data: task });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
};

// Get task comments
const getTaskComments = async (req, res) => {
    try {
        const comments = await TaskComment.findAll({
            where: { task_id: req.params.id },
            include: [{ model: User, as: 'user', attributes: ['id', 'username', 'display_name'] }],
            order: [['created_at', 'ASC']],
        });

        res.json({ success: true, data: comments });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ success: false, message: 'Failed to get comments' });
    }
};

// Add comment
const addComment = async (req, res) => {
    try {
        const comment = await TaskComment.create({
            task_id: req.params.id,
            user_id: req.user.id,
            content: req.body.content,
            is_internal: req.body.is_internal || false,
        });

        const commentWithUser = await TaskComment.findByPk(comment.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'username', 'display_name'] }],
        });

        res.status(201).json({ success: true, data: commentWithUser });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, message: 'Failed to add comment' });
    }
};

// Delete comment
const deleteComment = async (req, res) => {
    try {
        const comment = await TaskComment.findByPk(req.params.commentId);
        if (!comment) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }

        await comment.destroy();
        res.json({ success: true, message: 'Comment deleted' });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete comment' });
    }
};

// Get task statistics
const getTaskStats = async (req, res) => {
    try {
        const [
            total,
            open,
            inProgress,
            pending,
            resolved,
            closed,
            urgent,
            overdue,
        ] = await Promise.all([
            Task.count(),
            Task.count({ where: { status: 'open' } }),
            Task.count({ where: { status: 'in_progress' } }),
            Task.count({ where: { status: 'pending' } }),
            Task.count({ where: { status: 'resolved' } }),
            Task.count({ where: { status: 'closed' } }),
            Task.count({ where: { priority: 'urgent', status: { [Op.notIn]: ['resolved', 'closed'] } } }),
            Task.count({
                where: {
                    due_date: { [Op.lt]: new Date() },
                    status: { [Op.notIn]: ['resolved', 'closed'] },
                },
            }),
        ]);

        res.json({
            success: true,
            data: {
                total,
                open,
                inProgress,
                pending,
                resolved,
                closed,
                urgent,
                overdue,
            },
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to get stats' });
    }
};

// Get my tasks (assigned to current user)
const getMyTasks = async (req, res) => {
    try {
        const tasks = await Task.findAll({
            where: { assigned_to: req.user.id },
            include: [
                { model: User, as: 'creator', attributes: ['id', 'username', 'display_name'] },
            ],
            order: [
                ['priority', 'DESC'],
                ['created_at', 'DESC'],
            ],
        });

        res.json({ success: true, data: tasks });
    } catch (error) {
        console.error('Get my tasks error:', error);
        res.status(500).json({ success: false, message: 'Failed to get tasks' });
    }
};

// Export tasks to JSON (frontend will convert to Excel)
const exportTasks = async (req, res) => {
    try {
        const { from_date, to_date, status, priority, assigned_to } = req.query;

        const where = {};
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (assigned_to) where.assigned_to = assigned_to;

        if (from_date || to_date) {
            where.created_at = {};
            if (from_date) where.created_at[Op.gte] = new Date(from_date);
            if (to_date) where.created_at[Op.lte] = new Date(to_date + 'T23:59:59');
        }

        const tasks = await Task.findAll({
            where,
            include: [
                { model: User, as: 'assignee', attributes: ['id', 'username', 'display_name'] },
                {
                    model: TaskComment,
                    as: 'comments',
                    include: [{ model: User, as: 'user', attributes: ['display_name'] }],
                    order: [['created_at', 'ASC']]
                },
            ],
            order: [['created_at', 'DESC']],
        });

        // Format for export
        const exportData = tasks.map(t => {
            // Combine all comments into one string
            const notes = t.comments?.map(c =>
                `[${c.user?.display_name || 'IT'}] ${c.content}`
            ).join(' | ') || '';

            return {
                'Mã yêu cầu': t.task_number,
                'Tiêu đề': t.title,
                'Mô tả': t.description || '',
                'Loại': t.category,
                'Mức độ': t.priority,
                'Trạng thái': t.status,
                'Người yêu cầu': t.requester_name,
                'Email': t.requester_email,
                'Phòng ban': t.requester_department,
                'Người xử lý': t.assignee?.display_name || '',
                'Ghi chú': notes,
                'Ngày tạo': t.created_at,
                'Ngày hoàn thành': t.resolved_at || '',
            };
        });

        res.json({ success: true, data: exportData });
    } catch (error) {
        console.error('Export tasks error:', error);
        res.status(500).json({ success: false, message: 'Failed to export tasks' });
    }
};

module.exports = {
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    assignTask,
    updateTaskStatus,
    getTaskComments,
    addComment,
    deleteComment,
    getTaskStats,
    getMyTasks,
    exportTasks,
};
