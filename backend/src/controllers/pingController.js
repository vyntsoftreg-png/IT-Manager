const { Op } = require('sequelize');
const { IpAddress, PingHistory, NetworkSegment, Device } = require('../models');
const pingService = require('../utils/pingService');

// Ping all IPs in a segment
const pingSegment = async (req, res) => {
    try {
        const { segmentId } = req.params;

        // Get segment
        const segment = await NetworkSegment.findByPk(segmentId);
        if (!segment) {
            return res.status(404).json({
                success: false,
                message: 'Segment not found',
            });
        }

        // Get all IPs in segment with device relation
        const ips = await IpAddress.findAll({
            where: { segment_id: segmentId },
            attributes: ['id', 'ip_address', 'status', 'hostname', 'device_id', 'mac_address'],
            include: [{
                model: Device,
                as: 'device',
                attributes: ['id', 'mac_address'],
            }],
        });

        if (ips.length === 0) {
            return res.json({
                success: true,
                data: { results: {}, summary: { total: 0, online: 0, offline: 0 } },
            });
        }

        // Ping all IPs using smart ping (ICMP + TCP probe fallback)
        const ipAddresses = ips.map(ip => ip.ip_address);
        const pingResults = await pingService.smartPingBatch(ipAddresses, 20);

        // Save to history with conflict detection
        const historyRecords = [];
        const now = new Date();
        const conflictTimeWindow = 10 * 60 * 1000; // 10 minutes

        for (const ip of ips) {
            const result = pingResults[ip.ip_address];
            if (result) {
                let hasConflict = false;
                let previousMac = null;

                // Check for MAC conflict if we have a MAC address
                if (result.mac) {
                    // Find recent ping with different MAC for same IP
                    const recentPing = await PingHistory.findOne({
                        where: {
                            ip_address: ip.ip_address,
                            mac_address: { [Op.ne]: result.mac },
                            mac_address: { [Op.ne]: null },
                            checked_at: { [Op.gte]: new Date(now - conflictTimeWindow) },
                        },
                        order: [['checked_at', 'DESC']],
                    });

                    if (recentPing && recentPing.mac_address !== result.mac) {
                        hasConflict = true;
                        previousMac = recentPing.mac_address;
                        console.warn(`IP CONFLICT detected: ${ip.ip_address} - Current MAC: ${result.mac}, Previous MAC: ${recentPing.mac_address}`);
                    }

                    // Update MAC in IpAddress table if changed
                    if (ip.mac_address !== result.mac) {
                        await IpAddress.update(
                            { mac_address: result.mac },
                            { where: { id: ip.id } }
                        );
                    }

                    // Update Device MAC if IP is assigned to a device and device has no MAC or different MAC
                    if (ip.device_id && ip.device) {
                        if (!ip.device.mac_address || ip.device.mac_address !== result.mac) {
                            await Device.update(
                                { mac_address: result.mac },
                                { where: { id: ip.device_id } }
                            );
                            console.log(`Updated device ${ip.device_id} MAC to ${result.mac}`);
                        }
                    }
                }

                historyRecords.push({
                    ip_id: ip.id,
                    ip_address: ip.ip_address,
                    status: result.status,
                    response_time: result.responseTime,
                    mac_address: result.mac || null,
                    previous_mac: previousMac,
                    has_conflict: hasConflict,
                    checked_at: now,
                });

                // Add conflict info to result for frontend
                result.hasConflict = hasConflict;
                result.previousMac = previousMac;
            }
        }

        // Bulk insert history
        if (historyRecords.length > 0) {
            await PingHistory.bulkCreate(historyRecords);
        }

        // Map results with IP info
        const enrichedResults = {};
        for (const ip of ips) {
            const result = pingResults[ip.ip_address];
            enrichedResults[ip.ip_address] = {
                ...result,
                ipId: ip.id,
                hostname: ip.hostname,
                ipStatus: ip.status,
            };
        }

        res.json({
            success: true,
            data: {
                segmentId,
                segmentName: segment.name,
                results: enrichedResults,
                summary: pingService.getSummary(pingResults),
                checkedAt: now,
            },
        });
    } catch (error) {
        console.error('Ping segment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to ping segment',
            error: error.message,
        });
    }
};

// Ping a single IP
const pingSingleIp = async (req, res) => {
    try {
        const { id } = req.params;

        const ip = await IpAddress.findByPk(id);
        if (!ip) {
            return res.status(404).json({
                success: false,
                message: 'IP not found',
            });
        }

        const result = await pingService.smartPing(ip.ip_address);

        // Save to history
        await PingHistory.create({
            ip_id: ip.id,
            ip_address: ip.ip_address,
            status: result.status,
            response_time: result.responseTime,
            checked_at: new Date(),
        });

        res.json({
            success: true,
            data: {
                ...result,
                ipId: ip.id,
                hostname: ip.hostname,
            },
        });
    } catch (error) {
        console.error('Ping single IP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to ping IP',
        });
    }
};

// Get ping history for an IP
const getIpHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 100, from, to } = req.query;

        const where = { ip_id: id };

        if (from || to) {
            where.checked_at = {};
            if (from) where.checked_at[Op.gte] = new Date(from);
            if (to) where.checked_at[Op.lte] = new Date(to);
        }

        const history = await PingHistory.findAll({
            where,
            order: [['checked_at', 'DESC']],
            limit: parseInt(limit, 10),
        });

        // Calculate uptime stats
        const totalChecks = history.length;
        const onlineChecks = history.filter(h => h.status === 'online').length;
        const uptimePercent = totalChecks > 0 ? (onlineChecks / totalChecks * 100).toFixed(2) : null;

        // Average response time
        const responseTimes = history.filter(h => h.response_time !== null).map(h => h.response_time);
        const avgResponseTime = responseTimes.length > 0
            ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2)
            : null;

        res.json({
            success: true,
            data: {
                history,
                stats: {
                    totalChecks,
                    onlineChecks,
                    offlineChecks: totalChecks - onlineChecks,
                    uptimePercent: parseFloat(uptimePercent),
                    avgResponseTime: avgResponseTime ? parseFloat(avgResponseTime) : null,
                },
            },
        });
    } catch (error) {
        console.error('Get IP history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get ping history',
        });
    }
};

// Get latest ping status for segment (without new ping) - OPTIMIZED
const getLatestStatus = async (req, res) => {
    try {
        const { segmentId } = req.params;

        const ips = await IpAddress.findAll({
            where: { segment_id: segmentId },
            attributes: ['id', 'ip_address'],
        });

        if (ips.length === 0) {
            return res.json({ success: true, data: {} });
        }

        // Use efficient single query to get latest ping for all IPs
        const sequelize = require('../database/connection');
        const ipList = ips.map(ip => `'${ip.ip_address}'`).join(',');

        const latestPings = await sequelize.query(`
            SELECT ph.ip_address, ph.status, ph.response_time, ph.checked_at
            FROM ping_history ph
            INNER JOIN (
                SELECT ip_address, MAX(checked_at) as max_checked_at
                FROM ping_history
                WHERE ip_address IN (${ipList})
                GROUP BY ip_address
            ) latest ON ph.ip_address = latest.ip_address AND ph.checked_at = latest.max_checked_at
        `, { type: sequelize.QueryTypes.SELECT });

        const result = {};
        for (const ping of latestPings) {
            result[ping.ip_address] = {
                status: ping.status,
                responseTime: ping.response_time,
                checkedAt: ping.checked_at,
            };
        }

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Get latest status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get latest status',
        });
    }
};

// Clear old ping history (keep last 30 days)
const cleanupHistory = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const deleted = await PingHistory.destroy({
            where: {
                checked_at: { [Op.lt]: thirtyDaysAgo },
            },
        });

        res.json({
            success: true,
            message: `Deleted ${deleted} old ping records`,
        });
    } catch (error) {
        console.error('Cleanup history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup history',
        });
    }
};

// Get all latest ping status (for devices page)
const getAllLatestStatus = async (req, res) => {
    try {
        // Get all IPs that have been pinged at least once
        const allIps = await IpAddress.findAll({
            attributes: ['id', 'ip_address'],
        });

        if (allIps.length === 0) {
            return res.json({ success: true, data: {} });
        }

        // Get latest ping for each IP using a more efficient query
        const sequelize = require('../database/connection');
        const latestPings = await sequelize.query(`
            SELECT ph.ip_address, ph.status, ph.response_time, ph.checked_at, ph.mac_address, ph.has_conflict, ph.previous_mac
            FROM ping_history ph
            INNER JOIN (
                SELECT ip_address, MAX(checked_at) as max_checked_at
                FROM ping_history
                GROUP BY ip_address
            ) latest ON ph.ip_address = latest.ip_address AND ph.checked_at = latest.max_checked_at
        `, { type: sequelize.QueryTypes.SELECT });

        const result = {};
        for (const ping of latestPings) {
            result[ping.ip_address] = {
                status: ping.status,
                responseTime: ping.response_time,
                checkedAt: ping.checked_at,
                mac: ping.mac_address,
                hasConflict: ping.has_conflict === 1,
                previousMac: ping.previous_mac,
            };
        }

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Get all latest status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get latest status',
        });
    }
};

// Get all detected IP conflicts
const getConflicts = async (req, res) => {
    try {
        const { hours = 24 } = req.query;
        const timeWindow = new Date(Date.now() - hours * 60 * 60 * 1000);

        // Find all conflicts in the time window
        const conflicts = await PingHistory.findAll({
            where: {
                has_conflict: true,
                checked_at: { [Op.gte]: timeWindow },
            },
            order: [['checked_at', 'DESC']],
            limit: 100,
        });

        // Group by IP address to get unique conflicts
        const conflictsByIp = {};
        for (const record of conflicts) {
            if (!conflictsByIp[record.ip_address]) {
                conflictsByIp[record.ip_address] = {
                    ip_address: record.ip_address,
                    current_mac: record.mac_address,
                    previous_mac: record.previous_mac,
                    first_detected: record.checked_at,
                    last_detected: record.checked_at,
                    occurrences: 1,
                };
            } else {
                conflictsByIp[record.ip_address].occurrences++;
                if (record.checked_at < conflictsByIp[record.ip_address].first_detected) {
                    conflictsByIp[record.ip_address].first_detected = record.checked_at;
                }
            }
        }

        res.json({
            success: true,
            data: Object.values(conflictsByIp),
            total: Object.keys(conflictsByIp).length,
        });
    } catch (error) {
        console.error('Get conflicts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get IP conflicts',
        });
    }
};

module.exports = {
    pingSegment,
    pingSingleIp,
    getIpHistory,
    getLatestStatus,
    getAllLatestStatus,
    cleanupHistory,
    getConflicts,
};
