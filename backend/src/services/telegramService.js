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
    const daysText = reminderType === '3d' ? '3 ngày' : '1 ngày';
    const urgencyEmoji = reminderType === '1d' ? '🔴' : '🟡';

    const message = `
${urgencyEmoji} <b>[MY TASK] Nhắc nhở Task cá nhân</b>

📋 <b>${task.title}</b>
📅 Deadline: <b>${task.due_date}</b>
⏰ Còn <b>${daysText}</b> nữa là đến hạn!

${task.description ? `📝 ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}` : ''}

Hãy hoàn thành task đúng hạn nhé! 💪
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
✅ <b>Test thành công!</b>

Bạn đã kết nối Telegram với IT Manager.
Từ giờ bạn sẽ nhận được nhắc nhở task qua Telegram.
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
        high: '🔴 Cao',
        medium: '🟡 Trung bình',
        low: '🟢 Thấp'
    };

    const message = `
📝 <b>[MY TASK] Task cá nhân mới!</b>

📌 <b>${task.title}</b>
${task.due_date ? `📅 Deadline: <b>${task.due_date}</b>` : '📅 Không có deadline'}
🎯 Ưu tiên: ${priorityEmoji[task.priority] || '🟡 Trung bình'}
${task.description ? `\n📋 ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}` : ''}

Chúc bạn hoàn thành tốt! 💪
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
✅ <b>[MY TASK] Task cá nhân hoàn thành!</b>

📌 <b>${task.title}</b>
${task.due_date ? `📅 Deadline: ${task.due_date}` : ''}
🎉 Chúc mừng bạn đã hoàn thành task!

Tiếp tục phát huy nhé! 💪
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
        urgent: '🔴 Khẩn cấp',
        high: '🟠 Cao',
        medium: '🟡 Trung bình',
        low: '🟢 Thấp'
    };

    const categoryMap = {
        hardware: '💻 Phần cứng',
        software: '📀 Phần mềm',
        network: '🌐 Mạng',
        email: '📧 Email',
        account: '👤 Tài khoản',
        other: '📋 Khác'
    };

    const message = `
🎫 <b>[SUPPORT] Yêu cầu hỗ trợ mới!</b>

📝 <b>#${ticket.task_number || 'N/A'}</b>: ${ticket.title}
${categoryMap[ticket.category] || '📋 Khác'} | ${priorityEmoji[ticket.priority] || '🟡 Trung bình'}

👤 Người yêu cầu: <b>${ticket.requester_name}</b>
🏢 Phòng ban: ${ticket.requester_department || 'N/A'}
📍 Vị trí: ${ticket.requester_location || 'N/A'}

${ticket.description ? `📋 Mô tả: ${ticket.description.substring(0, 150)}${ticket.description.length > 150 ? '...' : ''}` : ''}

⏰ Vui lòng xử lý sớm!
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
        open: '🔵 Mở',
        in_progress: '🟡 Đang xử lý',
        pending: '🟠 Chờ xử lý',
        resolved: '✅ Đã giải quyết',
        closed: '⚫ Đã đóng'
    };

    let updateText = '';
    switch (updateType) {
        case 'status':
            updateText = `📊 Trạng thái: ${statusMap[changes.oldStatus] || changes.oldStatus} → <b>${statusMap[changes.newStatus] || changes.newStatus}</b>`;
            break;
        case 'assigned':
            updateText = `👷 Được giao cho: <b>${changes.assignedTo}</b>`;
            break;
        case 'resolved':
            updateText = `✅ Ticket đã được giải quyết!`;
            break;
        default:
            updateText = `📝 Ticket đã được cập nhật`;
    }

    const message = `
🎫 <b>[SUPPORT] Cập nhật ticket</b>

📝 <b>#${ticket.task_number || 'N/A'}</b>: ${ticket.title}
👤 Người yêu cầu: ${ticket.requester_name}

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

module.exports = {
    getBotToken,
    sendMessage,
    sendTaskReminder,
    testBotConnection,
    sendTestMessage,
    sendTaskCreatedNotification,
    sendTaskCompletedNotification,
    // Support Ticket notifications
    sendSupportTicketCreatedNotification,
    sendSupportTicketUpdateNotification,
    notifyITStaff
};
