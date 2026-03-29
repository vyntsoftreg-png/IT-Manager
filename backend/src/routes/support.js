const express = require('express');
const router = express.Router();
const { Task, User } = require('../models');
const { Op } = require('sequelize');
const { emitEvent } = require('../services/socketService');
const telegramService = require('../services/telegramService');
const wikiService = require('../services/wikiService');

// ─── Public: Submit a support request ───
router.post('/request', async (req, res) => {
    try {
        const {
            requester_name,
            requester_email,
            requester_phone,
            requester_department,
            requester_location,
            category,
            title,
            description,
            priority,
        } = req.body;

        if (!requester_name || !title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields',
            });
        }

        const year = new Date().getFullYear();
        const yearStart = new Date(`${year}-01-01`);
        const count = await Task.count({ where: { created_at: { [Op.gte]: yearStart } } });
        const task_number = `${year}-Task-${String(count + 1).padStart(4, '0')}`;

        const task = await Task.create({
            task_number,
            requester_name,
            requester_email,
            requester_phone,
            requester_department,
            requester_location,
            category: category || 'other',
            title,
            description,
            priority: priority || 'medium',
            status: 'open',
        });

        emitEvent('notification', {
            type: 'info',
            title: 'New Support Request',
            message: `New request #${task.task_number}: ${task.title}`
        });
        emitEvent('task:created', task);

        // Notify IT staff via Telegram
        try {
            const itStaff = await User.findAll({
                where: {
                    role: { [Op.in]: ['admin', 'it_ops'] },
                    telegram_chat_id: { [Op.ne]: null },
                    is_active: true
                }
            });
            if (itStaff.length > 0) {
                telegramService.notifyITStaff(itStaff, task, 'created')
                    .then(results => {
                        const sent = results.filter(r => r.success).length;
                        console.log(`[Telegram] Support notification sent to ${sent}/${itStaff.length} IT staff`);
                    })
                    .catch(err => console.error('[Telegram] Error notifying IT staff:', err));
            }
        } catch (telegramError) {
            console.error('[Telegram] Error fetching IT staff:', telegramError);
        }

        res.status(201).json({
            success: true,
            message: 'Request submitted successfully',
            data: {
                task_number: task.task_number,
                id: task.id,
            },
        });
    } catch (error) {
        console.error('Create support request error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to submit request. Please try again.',
        });
    }
});

// ─── Public: Search tickets (by ticket number or email) ───
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a ticket number or email to search.',
            });
        }

        const searchTerm = q.trim();
        let whereClause;

        // Check if it looks like an email
        if (searchTerm.includes('@')) {
            whereClause = { requester_email: { [Op.like]: searchTerm } };
        }
        // Check if it's just digits (partial ticket number like "0001")
        else if (/^\d+$/.test(searchTerm)) {
            whereClause = { task_number: { [Op.like]: `%-${searchTerm}` } };
        }
        // Otherwise treat as full/partial ticket number
        else {
            whereClause = { task_number: { [Op.like]: `%${searchTerm}%` } };
        }

        const tasks = await Task.findAll({
            where: whereClause,
            attributes: [
                'id', 'task_number', 'title', 'status', 'priority', 'category',
                'created_at', 'updated_at', 'resolved_at',
                'requester_name', 'requester_email',
                'rating', 'rating_comment', 'rated_at', 'assigned_to',
            ],
            order: [['created_at', 'DESC']],
            limit: 10,
        });

        if (tasks.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No tickets found. Please check your search term.',
            });
        }

        // Resolve assignee names
        const results = await Promise.all(tasks.map(async (task) => {
            let assignee_name = null;
            if (task.assigned_to) {
                const user = await User.findByPk(task.assigned_to, { attributes: ['full_name'] });
                if (user) assignee_name = user.full_name;
            }
            return { ...task.toJSON(), assignee_name };
        }));

        res.json({ success: true, data: results });
    } catch (error) {
        console.error('Search tickets error:', error);
        res.status(500).json({ success: false, message: 'Error searching tickets' });
    }
});

// ─── Public: Get single ticket detail with timeline ───
router.get('/status/:taskNumber', async (req, res) => {
    try {
        // Support partial number: if just digits, expand to pattern
        let searchValue = req.params.taskNumber;
        let whereClause;
        if (/^\d+$/.test(searchValue)) {
            whereClause = { task_number: { [Op.like]: `%-${searchValue}` } };
        } else {
            whereClause = { task_number: searchValue };
        }

        const task = await Task.findOne({
            where: whereClause,
            attributes: [
                'id', 'task_number', 'title', 'status', 'priority', 'category',
                'created_at', 'updated_at', 'resolved_at',
                'requester_name', 'requester_email',
                'rating', 'rating_comment', 'rated_at', 'assigned_to',
            ],
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Request not found. Please check your ticket number.',
            });
        }

        // Resolve assignee
        let assignee_name = null;
        if (task.assigned_to) {
            const user = await User.findByPk(task.assigned_to, { attributes: ['full_name'] });
            if (user) assignee_name = user.full_name;
        }

        // Build timeline
        const timeline = [];
        timeline.push({ status: 'open', label: 'Ticket Created', time: task.created_at, done: true });

        const statusOrder = ['open', 'in_progress', 'pending', 'resolved', 'closed'];
        const currentIdx = statusOrder.indexOf(task.status);

        if (currentIdx >= 1) {
            timeline.push({ status: 'in_progress', label: 'In Progress', time: task.updated_at, done: true });
        }
        if (task.status === 'pending') {
            timeline.push({ status: 'pending', label: 'Pending Info', time: task.updated_at, done: true });
        }
        if (currentIdx >= 3) {
            timeline.push({ status: 'resolved', label: 'Resolved', time: task.resolved_at || task.updated_at, done: true });
        }
        if (currentIdx >= 4) {
            timeline.push({ status: 'closed', label: 'Closed', time: task.updated_at, done: true });
        }

        // Add upcoming steps
        for (let i = currentIdx + 1; i < statusOrder.length; i++) {
            if (statusOrder[i] === 'pending') continue;
            timeline.push({
                status: statusOrder[i],
                label: statusOrder[i] === 'in_progress' ? 'In Progress' :
                       statusOrder[i] === 'resolved' ? 'Resolved' : 'Closed',
                time: null, done: false,
            });
        }

        res.json({
            success: true,
            data: {
                ...task.toJSON(),
                assignee_name,
                timeline,
                can_rate: ['resolved', 'closed'].includes(task.status) && !task.rating,
            },
        });
    } catch (error) {
        console.error('Check status error:', error);
        res.status(500).json({ success: false, message: 'Error checking status' });
    }
});

// ─── Public: Submit rating for resolved ticket ───
router.post('/rating/:taskNumber', async (req, res) => {
    try {
        const { rating, comment, email } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5',
            });
        }

        const task = await Task.findOne({
            where: { task_number: req.params.taskNumber },
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found',
            });
        }

        if (!['resolved', 'closed'].includes(task.status)) {
            return res.status(400).json({
                success: false,
                message: 'Only resolved or closed tickets can be rated',
            });
        }

        if (task.rating) {
            return res.status(400).json({
                success: false,
                message: 'This ticket has already been rated',
            });
        }

        // Verify email matches
        if (email && task.requester_email &&
            task.requester_email.toLowerCase() !== email.toLowerCase()) {
            return res.status(403).json({
                success: false,
                message: 'Email does not match the ticket requester',
            });
        }

        await task.update({
            rating,
            rating_comment: comment || null,
            rated_at: new Date(),
        });

        // Add rating as a comment in task history
        const { TaskComment } = require('../models');
        const starText = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
        const historyContent = `📊 User Rating: ${starText} (${rating}/5)${comment ? `\n💬 "${comment}"` : ''}`;
        await TaskComment.create({
            task_id: task.id,
            content: historyContent,
            user_id: null, // System-generated
        });

        // Notify IT staff via Telegram (Non-blocking)
        try {
            const itStaff = await User.findAll({
                where: { telegram_chat_id: { [Op.ne]: null } },
                attributes: ['id', 'telegram_chat_id'],
            });

            const ratingData = {
                ...task.toJSON(),
                rating,
                rating_comment: comment || null,
            };

            // Fire and forget
            Promise.all(itStaff.map(staff => 
                telegramService.sendRatingNotification(staff.telegram_chat_id, ratingData)
            )).catch(tgError => console.error('Telegram notification error:', tgError));
            
        } catch (tgError) {
            console.error('Telegram fetch staff error:', tgError);
        }

        res.json({
            success: true,
            message: 'Thank you for your feedback!',
            data: { rating, comment },
        });
    } catch (error) {
        console.error('Submit rating error:', error);
        res.status(500).json({ success: false, message: 'Error submitting rating' });
    }
});

// ─── Public: Knowledge Base - Get tree ───
router.get('/kb/tree', async (req, res) => {
    try {
        const tree = await wikiService.getPublicTree();
        res.json({ success: true, data: tree });
    } catch (error) {
        console.error('KB tree error:', error);
        res.json({ success: true, data: [] });
    }
});

// ─── Public: Knowledge Base - Get page ───
router.get('/kb/page', async (req, res) => {
    try {
        const { path } = req.query;
        if (!path) {
            return res.status(400).json({ success: false, message: 'Path is required' });
        }
        const content = await wikiService.getPublicPage(path);
        if (content === null) {
            return res.status(404).json({ success: false, message: 'Article not found' });
        }
        res.json({ success: true, data: content });
    } catch (error) {
        console.error('KB page error:', error);
        res.status(500).json({ success: false, message: 'Error loading article' });
    }
});

module.exports = router;
