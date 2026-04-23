const cron = require('node-cron');
const { Task, User, SlaTarget, SystemSetting } = require('../models');
const telegramService = require('../services/telegramService');
const dayjs = require('dayjs');
const { Op } = require('sequelize');

let currentTask = null;

const checkSlaDaily = async () => {
    // Check if telegram bot is configured
    const botTokenSetting = await SystemSetting.findOne({ where: { category: 'telegram', key: 'bot_token' } });
    if (!botTokenSetting || !botTokenSetting.label) return;

    // Get report chat ID (optional now - will fallback to IT staff)
    const chatIdSetting = await SystemSetting.findOne({ where: { category: 'telegram', key: 'report_chat_id' } });

    const targets = await SlaTarget.findAll({ raw: true });
    if (!targets.length) return;

    const targetMap = targets.reduce((acc, t) => {
        acc[t.priority] = t;
        return acc;
    }, {});

    // We only care about tickets that are currently 'open' (nobody has started working on them)
    const openTickets = await Task.findAll({
        where: {
            status: 'open'
        },
        raw: true
    });

    const breachedTickets = [];
    openTickets.forEach(t => {
        const priority = t.priority || 'medium';
        const target = targetMap[priority] || targetMap['medium'];
        if (!target) return;
        const hoursElapsed = (Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
        
        if (hoursElapsed > target.resolution_time_hours) {
            breachedTickets.push(t);
        }
    });

    if (breachedTickets.length === 0) return; // No breached tickets, don't spam

    // Resolve assignees
    const breachedWithUsers = await Promise.all(breachedTickets.map(async (t) => {
        let assigneeName = 'Unassigned';
        if (t.assigned_to) {
            const user = await User.findByPk(t.assigned_to, { attributes: ['full_name'] });
            if (user) assigneeName = user.full_name;
        }
        return { ...t, assignee_name: assigneeName };
    }));

    breachedWithUsers.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // Oldest first

    const reportData = {
        breachedTicketsCount: breachedTickets.length,
        avgResolutionTime: 'N/A', // Omitted for hourly alert unless we query resolved items too
        tickets: breachedWithUsers
    };

    if (chatIdSetting && chatIdSetting.label) {
        await telegramService.sendSlaReport(chatIdSetting.label, reportData);
    } else {
        // Fallback: Notify individual admins/IT support if global chat is not set
        const staff = await User.findAll({ 
            where: { 
                role: ['admin', 'manager', 'it_support'],
                telegram_chat_id: { [Op.not]: null } 
            } 
        });

        for (const user of staff) {
            if (user.telegram_chat_id) {
                await telegramService.sendSlaReport(user.telegram_chat_id, reportData);
            }
        }
    }
};

const initSlaWorker = async () => {
    // Run at the beginning of every hour (e.g. 9:00, 10:00, 11:00)
    const schedule = '0 * * * *';

    if (currentTask) {
        currentTask.stop();
    }

    currentTask = cron.schedule(schedule, async () => {
        console.log('⏳ Running SLA Hourly Worker...');
        try {
            await checkSlaDaily(); // Re-used existing logic function but run hourly
            console.log('✅ SLA Hourly Worker finished');
        } catch (error) {
            console.error('❌ SLA Worker error:', error);
        }
    });

    console.log(`⏱️ SLA Worker scheduled (Hourly): ${schedule}`);
};

module.exports = {
    initSlaWorker,
    checkSlaDaily
};
