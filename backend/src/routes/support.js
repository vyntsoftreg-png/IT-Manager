const express = require('express');
const router = express.Router();
const { Task, User } = require('../models');
const { Op } = require('sequelize');
const { emitEvent } = require('../services/socketService');
const telegramService = require('../services/telegramService');

// Public endpoint - no authentication required
// Anyone can submit a support request

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

        // Validate required fields
        if (!requester_name || !title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin bắt buộc',
            });
        }

        // Generate task number
        const year = new Date().getFullYear();
        const count = await Task.count();
        const task_number = `TASK-${year}-${String(count + 1).padStart(4, '0')}`;

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

        // Emit real-time notification
        emitEvent('notification', {
            type: 'info',
            title: 'New Public Request',
            message: `New request #${task.task_number}: ${task.title}`
        });

        // Emit task created event for refreshing lists
        emitEvent('task:created', task);

        // Send Telegram notification to all IT staff
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
                        console.log(`[Telegram] Support ticket notification sent to ${sent}/${itStaff.length} IT staff`);
                    })
                    .catch(err => console.error('[Telegram] Error notifying IT staff:', err));
            }
        } catch (telegramError) {
            console.error('[Telegram] Error fetching IT staff:', telegramError);
        }

        res.status(201).json({
            success: true,
            message: 'Yêu cầu đã được gửi thành công',
            data: {
                task_number: task.task_number,
                id: task.id,
            },
        });
    } catch (error) {
        console.error('Create support request error:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể gửi yêu cầu. Vui lòng thử lại.',
        });
    }
});


// Check request status by task number (public)
router.get('/status/:taskNumber', async (req, res) => {
    try {
        const task = await Task.findOne({
            where: { task_number: req.params.taskNumber },
            attributes: ['task_number', 'title', 'status', 'priority', 'created_at', 'resolved_at'],
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu',
            });
        }

        res.json({ success: true, data: task });
    } catch (error) {
        console.error('Check status error:', error);
        res.status(500).json({ success: false, message: 'Lỗi kiểm tra trạng thái' });
    }
});

module.exports = router;
