const cron = require('node-cron');
const { Task, User, SlaTarget, SystemSetting } = require('../models');
const telegramService = require('../services/telegramService');
const dayjs = require('dayjs');
const { Op } = require('sequelize');

let currentTask = null;

const checkSlaDaily = async () => {
    // Check if telegram bot is configured
    const botTokenSetting = await SystemSetting.findOne({ where: { category: 'telegram', key: 'bot_token' } });
    if (!botTokenSetting || !botTokenSetting.value) return;

    // Get report chat ID
    const chatIdSetting = await SystemSetting.findOne({ where: { category: 'telegram', key: 'report_chat_id' } });
    if (!chatIdSetting || !chatIdSetting.value) return;

    const targets = await SlaTarget.findAll({ raw: true });
    if (!targets.length) return;

    const targetMap = targets.reduce((acc, t) => {
        acc[t.priority] = t;
        return acc;
    }, {});

    // We only care about open tickets for this alert, and maybe 30 day history for avg
    const openTickets = await Task.findAll({
        where: {
            status: { [Op.notIn]: ['resolved', 'closed'] }
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

    await telegramService.sendSlaReport(chatIdSetting.value, {
        breachedTicketsCount: breachedTickets.length,
        avgResolutionTime: 'N/A', // Omitted for daily alert unless we query resolved items too
        tickets: breachedWithUsers
    });
};

const initSlaWorker = async () => {
    // Run at 9:00 AM every day
    const schedule = '0 9 * * *';

    if (currentTask) {
        currentTask.stop();
    }

    currentTask = cron.schedule(schedule, async () => {
        console.log('⏳ Running SLA Daily Worker...');
        try {
            await checkSlaDaily();
            console.log('✅ SLA Daily Worker finished');
        } catch (error) {
            console.error('❌ SLA Worker error:', error);
        }
    });

    console.log(`⏱️ SLA Worker scheduled: ${schedule}`);
};

module.exports = {
    initSlaWorker,
    checkSlaDaily
};
