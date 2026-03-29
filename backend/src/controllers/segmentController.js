const { Op } = require('sequelize');
const { NetworkSegment, IpAddress, Device, User } = require('../models');
const { createAuditLog } = require('../middleware/audit');

// Helper function to parse CIDR and generate IP list
const parseCIDR = (cidr) => {
    const [ip, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength, 10);

    const ipParts = ip.split('.').map(Number);
    const ipLong = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];

    const mask = ~((1 << (32 - prefix)) - 1);
    const networkAddress = ipLong & mask;
    const broadcastAddress = networkAddress | ~mask;

    const totalHosts = broadcastAddress - networkAddress + 1;
    const usableHosts = totalHosts - 2; // Exclude network and broadcast

    return {
        networkAddress,
        broadcastAddress,
        firstUsable: networkAddress + 1,
        lastUsable: broadcastAddress - 1,
        totalHosts,
        usableHosts,
        prefix,
    };
};

const longToIP = (long) => {
    return [
        (long >>> 24) & 255,
        (long >>> 16) & 255,
        (long >>> 8) & 255,
        long & 255,
    ].join('.');
};

const ipToLong = (ip) => {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
};

// Get all network segments
const getSegments = async (req, res) => {
    try {
        const { search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

        const where = {};
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { cidr: { [Op.like]: `%${search}%` } },
                { tags: { [Op.like]: `%${search}%` } },
            ];
        }

        const segments = await NetworkSegment.findAll({
            where,
            order: [[sortBy, sortOrder.toUpperCase()]],
        });

        // Get IP statistics for each segment
        const segmentsWithStats = await Promise.all(
            segments.map(async (segment) => {
                const totalIps = await IpAddress.count({ where: { segment_id: segment.id } });
                const usedIps = await IpAddress.count({
                    where: {
                        segment_id: segment.id,
                        status: 'in_use',
                    }
                });
                const freeIps = await IpAddress.count({
                    where: {
                        segment_id: segment.id,
                        status: 'free',
                    }
                });
                const reservedIps = await IpAddress.count({
                    where: {
                        segment_id: segment.id,
                        status: 'reserved',
                    }
                });

                return {
                    ...segment.toJSON(),
                    stats: {
                        total: totalIps,
                        used: usedIps,
                        free: freeIps,
                        reserved: reservedIps,
                        usagePercent: totalIps > 0 ? Math.round((usedIps / totalIps) * 100) : 0,
                    },
                };
            })
        );

        res.json({
            success: true,
            data: segmentsWithStats,
        });
    } catch (error) {
        console.error('Get segments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch network segments',
        });
    }
};

// Get single segment with its IPs
const getSegment = async (req, res) => {
    try {
        const segment = await NetworkSegment.findByPk(req.params.id);

        if (!segment) {
            return res.status(404).json({
                success: false,
                message: 'Network segment not found',
            });
        }

        res.json({
            success: true,
            data: segment,
        });
    } catch (error) {
        console.error('Get segment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch network segment',
        });
    }
};

// Create new network segment and generate IPs
const createSegment = async (req, res) => {
    try {
        const {
            name,
            vlan_id,
            cidr,
            gateway,
            dns_primary,
            dns_secondary,
            tags,
            description,
        } = req.body;

        if (!name || !cidr) {
            return res.status(400).json({
                success: false,
                message: 'Name and CIDR are required',
            });
        }

        // Validate CIDR format
        const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
        if (!cidrRegex.test(cidr)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid CIDR format. Example: 192.168.1.0/24',
            });
        }

        // Check for duplicate CIDR
        const existingSegment = await NetworkSegment.findOne({ where: { cidr } });
        if (existingSegment) {
            return res.status(400).json({
                success: false,
                message: 'A segment with this CIDR already exists',
            });
        }

        // Parse CIDR to get IP range
        const cidrInfo = parseCIDR(cidr);

        // Limit to reasonable size (max /20 = 4094 IPs)
        if (cidrInfo.usableHosts > 4094) {
            return res.status(400).json({
                success: false,
                message: 'Segment too large. Maximum allowed is /20 (4094 usable IPs)',
            });
        }

        // Create segment
        const segment = await NetworkSegment.create({
            name,
            vlan_id,
            cidr,
            gateway,
            dns_primary,
            dns_secondary,
            tags,
            description,
        });

        // Generate IP addresses
        const ipsToCreate = [];

        for (let i = cidrInfo.firstUsable; i <= cidrInfo.lastUsable; i++) {
            const ipAddress = longToIP(i);
            let status = 'free';

            // Mark gateway IP
            if (gateway && ipAddress === gateway) {
                status = 'gateway';
            }

            ipsToCreate.push({
                segment_id: segment.id,
                ip_address: ipAddress,
                status,
            });
        }

        // Bulk create IPs
        await IpAddress.bulkCreate(ipsToCreate);

        await createAuditLog(req.user.id, 'create', 'network_segments', segment.id, null, {
            ...segment.toJSON(),
            ips_generated: ipsToCreate.length,
        }, req);

        res.status(201).json({
            success: true,
            data: {
                ...segment.toJSON(),
                ips_generated: ipsToCreate.length,
            },
            message: `Segment created with ${ipsToCreate.length} IP addresses`,
        });
    } catch (error) {
        console.error('Create segment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create network segment',
        });
    }
};

// Update segment
const updateSegment = async (req, res) => {
    try {
        const segment = await NetworkSegment.findByPk(req.params.id);

        if (!segment) {
            return res.status(404).json({
                success: false,
                message: 'Network segment not found',
            });
        }

        const oldValues = segment.toJSON();

        // Only allow updating non-CIDR fields (changing CIDR would require regenerating IPs)
        const allowedFields = ['name', 'vlan_id', 'gateway', 'dns_primary', 'dns_secondary', 'tags', 'description'];
        const updates = {};

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        await segment.update(updates);

        // If gateway changed, update IP status
        if (req.body.gateway && req.body.gateway !== oldValues.gateway) {
            // Reset old gateway
            if (oldValues.gateway) {
                await IpAddress.update(
                    { status: 'free' },
                    { where: { segment_id: segment.id, ip_address: oldValues.gateway, status: 'gateway' } }
                );
            }
            // Set new gateway
            await IpAddress.update(
                { status: 'gateway' },
                { where: { segment_id: segment.id, ip_address: req.body.gateway } }
            );
        }

        await createAuditLog(req.user.id, 'update', 'network_segments', segment.id, oldValues, segment.toJSON(), req);

        res.json({
            success: true,
            data: segment,
            message: 'Segment updated successfully',
        });
    } catch (error) {
        console.error('Update segment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update network segment',
        });
    }
};

// Delete segment
const deleteSegment = async (req, res) => {
    try {
        const segment = await NetworkSegment.findByPk(req.params.id);

        if (!segment) {
            return res.status(404).json({
                success: false,
                message: 'Network segment not found',
            });
        }

        // Check if any IPs are in use
        const usedIps = await IpAddress.count({
            where: {
                segment_id: segment.id,
                status: 'in_use',
            },
        });

        if (usedIps > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete segment. ${usedIps} IP(s) are still in use.`,
            });
        }

        const oldValues = segment.toJSON();

        // Delete all IPs in this segment
        await IpAddress.destroy({ where: { segment_id: segment.id } });

        // Delete segment
        await segment.destroy();

        await createAuditLog(req.user.id, 'delete', 'network_segments', req.params.id, oldValues, null, req);

        res.json({
            success: true,
            message: 'Segment and all its IPs deleted successfully',
        });
    } catch (error) {
        console.error('Delete segment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete network segment',
        });
    }
};

// Get segment statistics
const getSegmentStats = async (req, res) => {
    try {
        const segments = await NetworkSegment.findAll();

        const stats = await Promise.all(
            segments.map(async (segment) => {
                const total = await IpAddress.count({ where: { segment_id: segment.id } });
                const byStatus = await IpAddress.findAll({
                    attributes: [
                        'status',
                        [require('sequelize').fn('COUNT', '*'), 'count'],
                    ],
                    where: { segment_id: segment.id },
                    group: ['status'],
                });

                return {
                    id: segment.id,
                    name: segment.name,
                    vlan_id: segment.vlan_id,
                    cidr: segment.cidr,
                    total,
                    byStatus: byStatus.reduce((acc, item) => {
                        acc[item.status] = parseInt(item.get('count'), 10);
                        return acc;
                    }, {}),
                };
            })
        );

        const totalIps = stats.reduce((sum, s) => sum + s.total, 0);
        const totalUsed = stats.reduce((sum, s) => sum + (s.byStatus.in_use || 0), 0);
        const totalFree = stats.reduce((sum, s) => sum + (s.byStatus.free || 0), 0);

        res.json({
            success: true,
            data: {
                summary: {
                    totalSegments: segments.length,
                    totalIps,
                    totalUsed,
                    totalFree,
                    overallUsagePercent: totalIps > 0 ? Math.round((totalUsed / totalIps) * 100) : 0,
                },
                segments: stats,
            },
        });
    } catch (error) {
        console.error('Get segment stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch segment statistics',
        });
    }
};

// Export segment IPs to Excel
const exportSegment = async (req, res) => {
    try {
        const segment = await NetworkSegment.findByPk(req.params.id);
        if (!segment) {
            return res.status(404).json({ success: false, message: 'Network segment not found' });
        }

        const ips = await IpAddress.findAll({
            where: { segment_id: segment.id },
            include: [
                { model: Device, as: 'device', attributes: ['id', 'name', 'type', 'hostname'] },
            ],
            order: [['ip_address', 'ASC']],
        });

        // Sort IPs numerically
        ips.sort((a, b) => {
            const aParts = a.ip_address.split('.').map(Number);
            const bParts = b.ip_address.split('.').map(Number);
            for (let i = 0; i < 4; i++) {
                if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i];
            }
            return 0;
        });

        const statusLabels = {
            free: 'Free',
            in_use: 'In Use',
            reserved: 'Reserved',
            blocked: 'Blocked',
            gateway: 'Gateway',
        };

        const rows = ips.map(ip => ({
            'IP Address': ip.ip_address,
            'Status': statusLabels[ip.status] || ip.status,
            'Hostname': ip.hostname || '',
            'MAC Address': ip.mac_address || '',
            'Device': ip.device ? `${ip.device.name} (${ip.device.type || ''})` : '',
            'Notes': ip.notes || '',
        }));

        const XLSX = require('xlsx');
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);

        // Set column widths
        ws['!cols'] = [
            { wch: 18 }, // IP Address
            { wch: 12 }, // Status
            { wch: 25 }, // Hostname
            { wch: 20 }, // MAC Address
            { wch: 25 }, // Device
            { wch: 35 }, // Notes
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'IP Addresses');

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const safeName = segment.name.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_');
        const safeCidr = segment.cidr.replace(/\//g, '-');
        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `${safeName}_${safeCidr}_${dateStr}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buf);
    } catch (error) {
        console.error('Export segment error:', error);
        res.status(500).json({ success: false, message: 'Failed to export segment' });
    }
};

// Import IPs from Excel file
const importSegment = async (req, res) => {
    try {
        const segment = await NetworkSegment.findByPk(req.params.id);
        if (!segment) {
            return res.status(404).json({ success: false, message: 'Network segment not found' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const XLSX = require('xlsx');
        const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);

        if (!rows.length) {
            return res.status(400).json({ success: false, message: 'Excel file is empty' });
        }

        // Build lookup of existing IPs in segment
        const existingIps = await IpAddress.findAll({ where: { segment_id: segment.id } });
        const ipMap = {};
        existingIps.forEach(ip => { ipMap[ip.ip_address] = ip; });

        const statusMap = {
            'free': 'free',
            'in use': 'in_use',
            'in_use': 'in_use',
            'reserved': 'reserved',
            'blocked': 'blocked',
            'gateway': 'gateway',
        };

        const results = { updated: 0, skipped: 0, errors: [] };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const ipAddress = (row['IP Address'] || '').toString().trim();

            if (!ipAddress) {
                results.skipped++;
                continue;
            }

            const existingIp = ipMap[ipAddress];
            if (!existingIp) {
                results.errors.push(`Row ${i + 2}: IP ${ipAddress} not found in this segment`);
                continue;
            }

            const updates = {};
            let hasChanges = false;

            // Status
            if (row['Status'] !== undefined && row['Status'] !== null) {
                const rawStatus = row['Status'].toString().trim().toLowerCase();
                const mappedStatus = statusMap[rawStatus];
                if (mappedStatus && mappedStatus !== existingIp.status) {
                    updates.status = mappedStatus;
                    hasChanges = true;
                }
            }

            // Hostname
            if (row['Hostname'] !== undefined) {
                const val = row['Hostname'].toString().trim();
                if (val !== (existingIp.hostname || '')) {
                    updates.hostname = val || null;
                    hasChanges = true;
                }
            }

            // MAC Address
            if (row['MAC Address'] !== undefined) {
                const val = row['MAC Address'].toString().trim();
                if (val !== (existingIp.mac_address || '')) {
                    updates.mac_address = val || null;
                    hasChanges = true;
                }
            }

            // Notes
            if (row['Notes'] !== undefined) {
                const val = row['Notes'].toString().trim();
                if (val !== (existingIp.notes || '')) {
                    updates.notes = val || null;
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                await existingIp.update(updates);
                results.updated++;
            } else {
                results.skipped++;
            }
        }

        await createAuditLog(req.user.id, 'import', 'network_segments', segment.id, null, {
            segment_name: segment.name,
            total_rows: rows.length,
            ...results,
        }, req);

        res.json({
            success: true,
            data: results,
            message: `Import completed: ${results.updated} updated, ${results.skipped} skipped, ${results.errors.length} errors`,
        });
    } catch (error) {
        console.error('Import segment error:', error);
        res.status(500).json({ success: false, message: 'Failed to import segment data' });
    }
};

module.exports = {
    getSegments,
    getSegment,
    createSegment,
    updateSegment,
    deleteSegment,
    getSegmentStats,
    exportSegment,
    importSegment,
};
