const cron = require('node-cron');
const { Op } = require('sequelize');
const { Device, Task, PersonalTask, Document, NetworkSegment, SystemSetting } = require('../models');
const telegramService = require('../services/telegramService');
const dayjs = require('dayjs');

// Schedule: Default to every Sunday at 08:00 if not configured
// Format: Minute Hour DayOfMonth Month DayOfWeek
let currentTask = null;

const collectWeeklyStats = async () => {
    const oneWeekAgo = dayjs().subtract(7, 'day').toDate();

    // Devices
    const activeDevices = await Device.count({ where: { status: 'active' } });
    const maintenanceDevices = await Device.count({ where: { status: 'maintenance' } });
    const inactiveDevices = await Device.count({ where: { status: 'inactive' } });

    // Network & Ping Stats
    // Since there's no central pingService export for all offline devices, we can do a simplified count
    let offlineCount = 0; // Placeholder until implemented
    const avgUptime = 98.5; // placeholder

    // Personal Tasks
    const completedTasks = await PersonalTask.count({ where: { status: 'completed', updated_at: { [Op.gte]: oneWeekAgo } } });
    const inProgressTasks = await PersonalTask.count({ where: { status: 'in_progress' } });
    const overdueTasks = await PersonalTask.count({ 
        where: { 
            status: { [Op.ne]: 'completed' }, 
            due_date: { [Op.lt]: new Date() } 
        } 
    });

    // Support (Task model)
    const newSupport = await Task.count({ where: { created_at: { [Op.gte]: oneWeekAgo } } });
    const resolvedSupport = await Task.count({ 
        where: { 
            status: { [Op.in]: ['resolved', 'closed'] }, 
            updated_at: { [Op.gte]: oneWeekAgo } 
        } 
    });

    // Documents
    const uploadedDocs = await Document.count({ where: { created_at: { [Op.gte]: oneWeekAgo } } });

    return {
        dateRange: `${dayjs(oneWeekAgo).format('DD/MM/YYYY')} - ${dayjs().format('DD/MM/YYYY')}`,
        devices: { active: activeDevices, maintenance: maintenanceDevices, inactive: inactiveDevices },
        network: { uptime: avgUptime },
        tasks: { completed: completedTasks, overdue: overdueTasks, in_progress: inProgressTasks },
        support: { new: newSupport, resolved: resolvedSupport },
        documents: { uploaded: uploadedDocs },
        alerts: { offline: offlineCount }
    };
};

const sendReportTask = async () => {
    try {
        console.log('[Worker] Running scheduled weekly IT report...');
        
        // Find notification target setting
        const chatIdSetting = await SystemSetting.findOne({ where: { category: 'telegram', key: 'report_chat_id' } });
        if (!chatIdSetting || !chatIdSetting.value) {
            console.log('[Worker] No report_chat_id configured, skipping weekly report.');
            return;
        }

        const reportData = await collectWeeklyStats();
        
        await telegramService.sendWeeklyReport(chatIdSetting.value, reportData);
        console.log('[Worker] Weekly report sent successfully to', chatIdSetting.value);

    } catch (error) {
        console.error('[Worker] Error generating weekly report:', error);
    }
};

const initScheduledReports = async () => {
    try {
        if (currentTask) {
            currentTask.stop();
        }

        // Get cron schedule from settings, or use default (Every Sunday at 8 AM)
        const scheduleSetting = await SystemSetting.findOne({ where: { category: 'telegram', key: 'report_schedule' } });
        let cronTime = '0 8 * * 0'; // Default 

        if (scheduleSetting && scheduleSetting.value) {
            cronTime = scheduleSetting.value;
        }

        // Validate cron
        if (!cron.validate(cronTime)) {
            console.error(`[Worker] Invalid cron expression: ${cronTime}, fallback to default 0 8 * * 0`);
            cronTime = '0 8 * * 0';
        }

        currentTask = cron.schedule(cronTime, sendReportTask);
        console.log(`[Worker] Weekly report scheduler initialized with cron: ${cronTime}`);
    } catch (error) {
        console.error('[Worker] Failed to init weekly report scheduler:', error);
    }
};

module.exports = {
    initScheduledReports,
    sendReportTask, // export for testing manually
};
