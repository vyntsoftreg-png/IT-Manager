const { SlaTarget, Task, User } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../database/connection');
const dayjs = require('dayjs');

// Helper to seed defaults if SlaTarget table is empty
const ensureDefaults = async () => {
    const count = await SlaTarget.count();
    if (count === 0) {
        await SlaTarget.bulkCreate([
            { priority: 'urgent', response_time_hours: 1, resolution_time_hours: 4 },
            { priority: 'high', response_time_hours: 4, resolution_time_hours: 8 },
            { priority: 'medium', response_time_hours: 8, resolution_time_hours: 24 },
            { priority: 'low', response_time_hours: 24, resolution_time_hours: 72 },
        ]);
    }
};

const slaController = {
    // Get all SLA targets
    getTargets: async (req, res) => {
        try {
            await ensureDefaults();
            const targets = await SlaTarget.findAll({ order: [['resolution_time_hours', 'ASC']] });
            res.json({ success: true, data: targets });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error loading SLA targets' });
        }
    },

    // Update SLA target
    updateTarget: async (req, res) => {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            const { id } = req.params;
            const { response_time_hours, resolution_time_hours, is_active } = req.body;

            const target = await SlaTarget.findByPk(id);
            if (!target) {
                return res.status(404).json({ success: false, message: 'SLA target not found' });
            }

            await target.update({
                response_time_hours: response_time_hours !== undefined ? response_time_hours : target.response_time_hours,
                resolution_time_hours: resolution_time_hours !== undefined ? resolution_time_hours : target.resolution_time_hours,
                is_active: is_active !== undefined ? is_active : target.is_active,
            });

            res.json({ success: true, message: 'SLA target updated successfully', data: target });
        } catch (error) {
            console.error('Update SLA target error:', error);
            res.status(500).json({ success: false, message: 'Error updating SLA target' });
        }
    },

    // Get SLA dashboard metrics
    getDashboardMetrics: async (req, res) => {
        try {
            await ensureDefaults();
            
            // Get date range from query params, default to last 30 days
            const startDate = req.query.startDate 
                ? dayjs(req.query.startDate).startOf('day').toDate() 
                : dayjs().subtract(30, 'day').startOf('day').toDate();
            const endDate = req.query.endDate 
                ? dayjs(req.query.endDate).endOf('day').toDate() 
                : dayjs().endOf('day').toDate();

            const targets = await SlaTarget.findAll({ raw: true });
            const targetMap = targets.reduce((acc, t) => {
                acc[t.priority] = t;
                return acc;
            }, {});

            // Fetch all tasks (tickets) in the period
            const tickets = await Task.findAll({
                where: {
                    created_at: { [Op.between]: [startDate, endDate] }
                },
                raw: true,
            });

            const metrics = {
                totalTickets: tickets.length,
                resolvedTickets: 0,
                openTickets: 0,
                metSla: 0,
                breachedSla: 0,
                avgResolutionTimeHours: 0,
                byPriority: {
                    urgent: { total: 0, met: 0, breached: 0, open: 0 },
                    high: { total: 0, met: 0, breached: 0, open: 0 },
                    medium: { total: 0, met: 0, breached: 0, open: 0 },
                    low: { total: 0, met: 0, breached: 0, open: 0 },
                },
            };

            let totalResolutionHours = 0;
            let resolvedCountWithTime = 0;

            for (const ticket of tickets) {
                const priority = ticket.priority || 'medium';
                const target = targetMap[priority] || targetMap['medium'];
                
                // Track by priority
                if (!metrics.byPriority[priority]) {
                    metrics.byPriority[priority] = { total: 0, met: 0, breached: 0, open: 0 };
                }
                metrics.byPriority[priority].total++;

                const createdAtMs = new Date(ticket.created_at).getTime();

                if (['resolved', 'closed'].includes(ticket.status) && ticket.resolved_at) {
                    metrics.resolvedTickets++;
                    const resolvedAtMs = new Date(ticket.resolved_at).getTime();
                    const hoursTaken = (resolvedAtMs - createdAtMs) / (1000 * 60 * 60);

                    totalResolutionHours += hoursTaken;
                    resolvedCountWithTime++;

                    if (hoursTaken <= target.resolution_time_hours) {
                        metrics.metSla++;
                        metrics.byPriority[priority].met++;
                    } else {
                        metrics.breachedSla++;
                        metrics.byPriority[priority].breached++;
                    }
                } else {
                    metrics.openTickets++;
                    metrics.byPriority[priority].open++;

                    // Check if already breached while open
                    const currentHoursElapsed = (Date.now() - createdAtMs) / (1000 * 60 * 60);
                    if (currentHoursElapsed > target.resolution_time_hours) {
                        metrics.breachedSla++;
                        metrics.byPriority[priority].breached++;
                    } else {
                        // Assuming met if not breached yet (or we can just ignore, but standard SLA shows 'Active/Met')
                        metrics.metSla++; 
                        metrics.byPriority[priority].met++;
                    }
                }
            }

            if (resolvedCountWithTime > 0) {
                metrics.avgResolutionTimeHours = parseFloat((totalResolutionHours / resolvedCountWithTime).toFixed(2));
            }

            // Also get breached ticket list for immediate attention
            const breachedTickets = tickets.filter(t => {
                const priority = t.priority || 'medium';
                const target = targetMap[priority] || targetMap['medium'];
                const createdAtMs = new Date(t.created_at).getTime();
                
                if (['resolved', 'closed'].includes(t.status) && t.resolved_at) {
                    return ((new Date(t.resolved_at).getTime() - createdAtMs) / (1000 * 60 * 60)) > target.resolution_time_hours;
                } else {
                    return ((Date.now() - createdAtMs) / (1000 * 60 * 60)) > target.resolution_time_hours;
                }
            });

            // Resolve assignees for breached tickets
            const breachedWithUsers = await Promise.all(breachedTickets.map(async (t) => {
                let assigneeName = 'Unassigned';
                if (t.assigned_to) {
                    const user = await User.findByPk(t.assigned_to, { attributes: ['full_name'] });
                    if (user) assigneeName = user.full_name;
                }
                return { ...t, assignee_name: assigneeName };
            }));

            res.json({
                success: true,
                data: {
                    metrics,
                    breachedTickets: breachedWithUsers.slice(0, 10), // Top 10 for dashboard
                    period: {
                        startDate,
                        endDate
                    }
                }
            });

        } catch (error) {
            console.error('Get dashboard metrics error:', error);
            res.status(500).json({ success: false, message: 'Error loading SLA dashboard data' });
        }
    },

    // Manual trigger for SLA hourly worker
    triggerWorker: async (req, res) => {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
            
            const { checkSlaDaily } = require('../workers/slaWorker');
            await checkSlaDaily();
            
            res.json({ success: true, message: 'SLA check triggered successfully' });
        } catch (error) {
            console.error('Trigger SLA worker error:', error);
            res.status(500).json({ success: false, message: 'Error triggering SLA worker' });
        }
    }
};

module.exports = slaController;
