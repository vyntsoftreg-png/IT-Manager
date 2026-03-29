const { SystemSetting } = require('../models');

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

/**
 * Get Bot Token from SystemSetting
 */
const getBotToken = async () => {
    const setting = await SystemSetting.findOne({
        where: { category: 'telegram', key: 'bot_token' }
    });
    return setting?.label || null;
};

/**
 * Send message via Telegram Bot API
 * @param {string} chatId - Telegram chat ID
 * @param {string} message - Message to send
 * @param {object} options - Additional options (parse_mode, etc)
 */
const sendMessage = async (chatId, message, options = {}) => {
    try {
        const botToken = await getBotToken();

        if (!botToken) {
            console.warn('Telegram Bot Token not configured');
            return { success: false, error: 'Bot Token not configured' };
        }

        if (!chatId) {
            return { success: false, error: 'Chat ID not provided' };
        }

        const url = `${TELEGRAM_API_BASE}${botToken}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: options.parse_mode || 'HTML',
                ...options
            })
        });

        const data = await response.json();

        if (data.ok) {
            return { success: true, data };
        } else {
            console.error('Telegram API error:', data);
            return { success: false, error: data.description };
        }
    } catch (error) {
        console.error('Send Telegram message error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send task reminder (Personal Task)
 * @param {string} chatId - User's Telegram chat ID
 * @param {object} task - Task object
 * @param {string} reminderType - '3d' or '1d'
 */
const sendTaskReminder = async (chatId, task, reminderType) => {
    const daysText = reminderType === '3d' ? '3 days' : '1 day';
    const urgencyEmoji = reminderType === '1d' ? '🔴' : '🟡';

    const message = `
${urgencyEmoji} <b>[MY TASK] Personal Task Reminder</b>

📝 <b>${task.task_number || `#${task.id}`}</b>
📋 <b>${task.title}</b>
📅 Deadline: <b>${task.due_date}</b>
⏰ <b>${daysText}</b> remaining!

${task.description ? `📝 ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}` : ''}

Please complete your task on time! 💪
    `.trim();

    return await sendMessage(chatId, message);
};

/**
 * Test bot connection
 * @param {string} botToken - Bot token to test
 */
const testBotConnection = async (botToken) => {
    try {
        const url = `${TELEGRAM_API_BASE}${botToken}/getMe`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.ok) {
            return { success: true, botInfo: data.result };
        } else {
            return { success: false, error: data.description };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Send test message to verify chat ID
 * @param {string} chatId - Chat ID to test
 */
const sendTestMessage = async (chatId) => {
    const message = `
✅ <b>Connection successful!</b>

Your Telegram is now linked to IT Manager.
You will receive task reminders via Telegram.
    `.trim();

    return await sendMessage(chatId, message);
};

/**
 * Send notification when new personal task is created
 * @param {string} chatId - User's Telegram chat ID
 * @param {object} task - Task object
 */
const sendTaskCreatedNotification = async (chatId, task) => {
    const priorityEmoji = {
        high: '🔴 High',
        medium: '🟡 Medium',
        low: '🟢 Low'
    };

    const message = `
📝 <b>[MY TASK] New personal task!</b>

📝 <b>${task.task_number || `#${task.id}`}</b>
📌 <b>${task.title}</b>
${task.due_date ? `📅 Deadline: <b>${task.due_date}</b>` : '📅 No deadline'}
🎯 Priority: ${priorityEmoji[task.priority] || '🟡 Medium'}
${task.description ? `\n📋 ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}` : ''}

Good luck! 💪
    `.trim();

    return await sendMessage(chatId, message);
};

/**
 * Send notification when personal task is completed
 * @param {string} chatId - User's Telegram chat ID
 * @param {object} task - Task object
 */
const sendTaskCompletedNotification = async (chatId, task) => {
    const message = `
✅ <b>[MY TASK] Task completed!</b>

📝 <b>${task.task_number || `#${task.id}`}</b>
📌 <b>${task.title}</b>
${task.due_date ? `📅 Deadline: ${task.due_date}` : ''}
🕐 Completed at: <b>${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</b>

🎉 Congratulations on completing your task!
Keep up the great work! 💪
    `.trim();

    return await sendMessage(chatId, message);
};

// ==================== SUPPORT TICKET NOTIFICATIONS ====================

/**
 * Send notification when new support ticket is created
 * @param {string} chatId - IT Staff's Telegram chat ID
 * @param {object} ticket - Support ticket object
 */
const sendSupportTicketCreatedNotification = async (chatId, ticket) => {
    const priorityEmoji = {
        urgent: '🔴 Urgent',
        high: '🟠 High',
        medium: '🟡 Medium',
        low: '🟢 Low'
    };

    const categoryMap = {
        hardware: '💻 Hardware',
        software: '📀 Software',
        network: '🌐 Network',
        email: '📧 Email',
        account: '👤 Account',
        other: '📋 Other'
    };

    const message = `
🎫 <b>[SUPPORT] New support request!</b>

📝 <b>#${ticket.task_number || 'N/A'}</b>: ${ticket.title}
${categoryMap[ticket.category] || '📋 Other'} | ${priorityEmoji[ticket.priority] || '🟡 Medium'}

👤 Requester: <b>${ticket.requester_name}</b>
🏢 Department: ${ticket.requester_department || 'N/A'}
📍 Location: ${ticket.requester_location || 'N/A'}

${ticket.description ? `📋 Description: ${ticket.description.substring(0, 150)}${ticket.description.length > 150 ? '...' : ''}` : ''}

⏰ Please handle this promptly!
    `.trim();

    return await sendMessage(chatId, message);
};

/**
 * Send notification when support ticket is updated
 * @param {string} chatId - IT Staff's Telegram chat ID
 * @param {object} ticket - Support ticket object
 * @param {string} updateType - Type of update (status, assigned, etc)
 * @param {object} changes - What changed
 */
const sendSupportTicketUpdateNotification = async (chatId, ticket, updateType, changes = {}) => {
    const statusMap = {
        open: '🔵 Open',
        in_progress: '🟡 In Progress',
        pending: '🟠 Pending',
        resolved: '✅ Resolved',
        closed: '⚫ Closed'
    };

    let updateText = '';
    switch (updateType) {
        case 'status':
            updateText = `📊 Status: ${statusMap[changes.oldStatus] || changes.oldStatus} → <b>${statusMap[changes.newStatus] || changes.newStatus}</b>`;
            break;
        case 'assigned':
            updateText = `👷 Assigned to: <b>${changes.assignedTo}</b>`;
            break;
        case 'resolved':
            updateText = `✅ Ticket has been resolved!\n🕐 Resolved at: <b>${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</b>`;
            break;
        default:
            updateText = `📝 Ticket has been updated`;
    }

    let assigneeName = 'Chưa phân công';
    if (ticket.assigned_to) {
        try {
            const { User } = require('../models');
            const user = await User.findByPk(ticket.assigned_to);
            if (user) assigneeName = user.display_name || user.username;
        } catch (e) {
            console.error('Error fetching assignee for Telegram:', e);
        }
    } else if (updateType === 'assigned' && changes.assignedTo) {
        assigneeName = changes.assignedTo;
    }

    const message = `
🎫 <b>[SUPPORT] Ticket update</b>

📝 <b>#${ticket.task_number || 'N/A'}</b>: ${ticket.title}
👤 Requester: <b>${ticket.requester_name || 'N/A'}</b>
${ticket.requester_department ? `🏢 Department: ${ticket.requester_department}\n` : ''}👷 Assignee: <b>${assigneeName}</b>

${updateText}
    `.trim();

    return await sendMessage(chatId, message);
};

/**
 * Send notification to all IT staff with telegram_chat_id configured
 * @param {Array} users - List of users to notify
 * @param {object} ticket - Support ticket object
 * @param {string} notificationType - 'created' or 'updated'
 * @param {object} changes - What changed (for updates)
 */
const notifyITStaff = async (users, ticket, notificationType = 'created', changes = {}) => {
    const results = [];

    for (const user of users) {
        if (user.telegram_chat_id) {
            let result;
            if (notificationType === 'created') {
                result = await sendSupportTicketCreatedNotification(user.telegram_chat_id, ticket);
            } else {
                result = await sendSupportTicketUpdateNotification(user.telegram_chat_id, ticket, changes.type, changes);
            }
            results.push({ userId: user.id, success: result.success });
        }
    }

    return results;
};

// ==================== WEEKLY REPORT ====================

/**
 * Send weekly IT report
 * @param {string} chatId - Target Telegram chat ID (group or user)
 * @param {object} reportData - Aggregated stats
 */
const sendWeeklyReport = async (chatId, reportData) => {
    const { dateRange, devices, network, tasks, support, alerts, documents } = reportData;
    
    const message = `
📊 <b>WEEKLY IT REPORT</b> (${dateRange})

🖥️ Devices: ${devices.active} active / ${devices.maintenance} maintenance / ${devices.inactive} inactive
🌐 Network: ${network.uptime}% avg uptime
📋 Tasks: ${tasks.completed} completed / ${tasks.overdue} overdue / ${tasks.in_progress} in progress
🎫 Support: ${support.new} new tickets / ${support.resolved} resolved
📄 Documents: ${documents.uploaded} uploaded
⚠️ Alerts: ${alerts.offline} devices offline > 24h
    `.trim();

    return await sendMessage(chatId, message);
};

// ==================== RATING NOTIFICATION ====================

/**
 * Send notification when a ticket receives a user rating
 * @param {string} chatId - IT Staff's Telegram chat ID
 * @param {object} ticket - Ticket object with rating info
 */
const sendRatingNotification = async (chatId, ticket) => {
    const stars = '⭐'.repeat(ticket.rating) + '☆'.repeat(5 - ticket.rating);
    const sentiment = ticket.rating >= 4 ? '😊' : ticket.rating >= 3 ? '😐' : '😟';

    let assigneeName = 'N/A';
    if (ticket.assigned_to) {
        try {
            const { User } = require('../models');
            const user = await User.findByPk(ticket.assigned_to);
            if (user) assigneeName = user.display_name || user.username;
        } catch (e) {
            console.error('Error fetching assignee for Telegram rating notification:', e);
        }
    }

    const message = `
${sentiment} <b>[SUPPORT] New Service Rating!</b>

📝 <b>#${ticket.task_number || 'N/A'}</b>: ${ticket.title}
👷 Assignee: <b>${assigneeName}</b>
👤 From: <b>${ticket.requester_name || 'User'}</b>

${stars} <b>${ticket.rating}/5</b>
${ticket.rating_comment ? `\n💬 <b>User Comment:</b>\n"<i>${ticket.rating_comment}</i>"` : ''}

🕐 Rated at: ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
    `.trim();

    return await sendMessage(chatId, message);
};

module.exports = {
    getBotToken,
    sendMessage,
    sendTaskReminder,
    testBotConnection,
    sendTestMessage,
    sendTaskCreatedNotification,
    sendTaskCompletedNotification,
    // Support Ticket notifications
    // SLA Daily Report
    sendSlaReport: async (chatId, reportData) => {
        if (!chatId) return { success: false, error: 'No chat ID provided' };

        const { breachedTicketsCount, avgResolutionTime, tickets } = reportData;
        
        let message = `
📊 <b>[SLA REPORT] Daily Update</b>

❌ <b>${breachedTicketsCount}</b> tickets currently breaching SLA!
⏱️ Avg Resolution Time: ${avgResolutionTime} hours.

<b>Top Breached Tickets:</b>
`;
        tickets.slice(0, 5).forEach(t => {
            message += `\n🔴 #${t.task_number || 'N/A'}: ${t.title} [${t.priority?.toUpperCase()}] - Assignee: ${t.assignee_name || 'Unassigned'}`;
        });

        return await sendMessage(chatId, message.trim());
    },

    sendSupportTicketCreatedNotification,
    sendSupportTicketUpdateNotification,
    notifyITStaff,
    sendRatingNotification,
    sendWeeklyReport,
};
