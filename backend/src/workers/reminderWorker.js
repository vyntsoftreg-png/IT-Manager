const cron = require('node-cron');
const { Op } = require('sequelize');
const { PersonalTask, User } = require('../models');
const telegramService = require('../services/telegramService');

/**
 * Check for upcoming deadlines and send reminders
 */
const checkAndSendReminders = async () => {
    try {
        const today = new Date();

        // Calculate dates for 3 days and 1 day from now
        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        const threeDaysDate = threeDaysFromNow.toISOString().split('T')[0];

        const oneDayFromNow = new Date(today);
        oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
        const oneDayDate = oneDayFromNow.toISOString().split('T')[0];

        // Find tasks due in 3 days that haven't been reminded
        const tasks3d = await PersonalTask.findAll({
            where: {
                due_date: threeDaysDate,
                status: { [Op.ne]: 'completed' },
                reminder_sent_3d: false,
                parent_id: null // Only main tasks, not subtasks
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'telegram_chat_id', 'display_name']
            }]
        });

        // Find tasks due in 1 day that haven't been reminded
        const tasks1d = await PersonalTask.findAll({
            where: {
                due_date: oneDayDate,
                status: { [Op.ne]: 'completed' },
                reminder_sent_1d: false,
                parent_id: null
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'telegram_chat_id', 'display_name']
            }]
        });

        console.log(`[ReminderWorker] Found ${tasks3d.length} tasks due in 3 days, ${tasks1d.length} tasks due in 1 day`);

        // Send 3-day reminders
        for (const task of tasks3d) {
            if (task.user?.telegram_chat_id) {
                const result = await telegramService.sendTaskReminder(
                    task.user.telegram_chat_id,
                    task,
                    '3d'
                );

                if (result.success) {
                    await task.update({ reminder_sent_3d: true });
                    console.log(`[ReminderWorker] Sent 3d reminder for task: ${task.title}`);
                } else {
                    console.error(`[ReminderWorker] Failed to send 3d reminder for task ${task.id}:`, result.error);
                }
            }
        }

        // Send 1-day reminders
        for (const task of tasks1d) {
            if (task.user?.telegram_chat_id) {
                const result = await telegramService.sendTaskReminder(
                    task.user.telegram_chat_id,
                    task,
                    '1d'
                );

                if (result.success) {
                    await task.update({ reminder_sent_1d: true });
                    console.log(`[ReminderWorker] Sent 1d reminder for task: ${task.title}`);
                } else {
                    console.error(`[ReminderWorker] Failed to send 1d reminder for task ${task.id}:`, result.error);
                }
            }
        }

    } catch (error) {
        console.error('[ReminderWorker] Error checking reminders:', error);
    }
};

/**
 * Start the reminder worker cron job
 * Runs every hour at minute 0
 */
const startReminderWorker = () => {
    // Run every hour at minute 0
    cron.schedule('0 * * * *', async () => {
        console.log('[ReminderWorker] Running hourly reminder check...');
        await checkAndSendReminders();
    });

    console.log('[ReminderWorker] Started - will check for reminders every hour');

    // Also run immediately on startup (after a short delay)
    setTimeout(() => {
        console.log('[ReminderWorker] Running initial check...');
        checkAndSendReminders();
    }, 5000);
};

module.exports = {
    startReminderWorker,
    checkAndSendReminders
};
