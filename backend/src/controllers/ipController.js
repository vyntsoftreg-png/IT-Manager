const { Op } = require('sequelize');
const { IpAddress, NetworkSegment, Device, User } = require('../models');
const { createAuditLog } = require('../middleware/audit');

// Get IPs for a segment with filtering
const getIpAddresses = async (req, res) => {
    try {
        const {
            segment_id,
            status,
            search,
            page = 1,
            limit = 50,
            sortBy = 'ip_address',
            sortOrder = 'ASC',
        } = req.query;

        const where = {};

        if (segment_id) {
            where.segment_id = segment_id;
        }

        if (status) {
            where.status = status;
        }

        if (search) {
            where[Op.or] = [
                { ip_address: { [Op.like]: `%${search}%` } },
                { hostname: { [Op.like]: `%${search}%` } },
                { mac_address: { [Op.like]: `%${search}%` } },
                { notes: { [Op.like]: `%${search}%` } },
            ];
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Custom sorting for IP address (numeric sort)
        const sortDirection = sortOrder.toUpperCase();

        // For IP address sorting, we need special handling
        // SQLite cannot sort IPs numerically, so we fetch all and sort in JS
        if (sortBy === 'ip_address') {
            // Fetch ALL records for this segment (no pagination yet)
            const allRows = await IpAddress.findAll({
                where,
                include: [
                    {
                        model: NetworkSegment,
                        as: 'segment',
                        attributes: ['id', 'name', 'vlan_id', 'cidr'],
                    },
                    {
                        model: Device,
                        as: 'device',
                        attributes: ['id', 'name', 'type', 'hostname'],
                    },
                    {
                        model: User,
                        as: 'reservedByUser',
                        attributes: ['id', 'username', 'display_name'],
                    },
                ],
            });

            // Sort numerically by IP
            const sortedRows = [...allRows].sort((a, b) => {
                const aParts = a.ip_address.split('.').map(Number);
                const bParts = b.ip_address.split('.').map(Number);
                for (let i = 0; i < 4; i++) {
                    if (aParts[i] !== bParts[i]) {
                        return sortDirection === 'DESC'
                            ? bParts[i] - aParts[i]
                            : aParts[i] - bParts[i];
                    }
                }
                return 0;
            });

            // Apply pagination manually
            const paginatedRows = sortedRows.slice(offset, offset + parseInt(limit));

            return res.json({
                success: true,
                data: paginatedRows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: allRows.length,
                    totalPages: Math.ceil(allRows.length / parseInt(limit)),
                },
            });
        }

        // Normal sorting for other columns
        const order = [[sortBy, sortDirection]];

        const { count, rows } = await IpAddress.findAndCountAll({
            where,
            include: [
                {
                    model: NetworkSegment,
                    as: 'segment',
                    attributes: ['id', 'name', 'vlan_id', 'cidr'],
                },
                {
                    model: Device,
                    as: 'device',
                    attributes: ['id', 'name', 'type', 'hostname'],
                },
                {
                    model: User,
                    as: 'reservedByUser',
                    attributes: ['id', 'username', 'display_name'],
                },
            ],
            order,
            limit: parseInt(limit),
            offset,
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Get IP addresses error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch IP addresses',
        });
    }
};

// Get single IP
const getIpAddress = async (req, res) => {
    try {
        const ip = await IpAddress.findByPk(req.params.id, {
            include: [
                {
                    model: NetworkSegment,
                    as: 'segment',
                },
                {
                    model: Device,
                    as: 'device',
                },
                {
                    model: User,
                    as: 'reservedByUser',
                    attributes: ['id', 'username', 'display_name'],
                },
            ],
        });

        if (!ip) {
            return res.status(404).json({
                success: false,
                message: 'IP address not found',
            });
        }

        res.json({
            success: true,
            data: ip,
        });
    } catch (error) {
        console.error('Get IP address error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch IP address',
        });
    }
};

// Update IP address
const updateIpAddress = async (req, res) => {
    try {
        const ip = await IpAddress.findByPk(req.params.id);

        if (!ip) {
            return res.status(404).json({
                success: false,
                message: 'IP address not found',
            });
        }

        const oldValues = ip.toJSON();

        const allowedFields = ['status', 'hostname', 'mac_address', 'notes', 'reserved_until'];
        const updates = {};

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        // If reserving, set reserved_by
        if (updates.status === 'reserved') {
            updates.reserved_by = req.user.id;
        } else if (updates.status === 'free') {
            updates.reserved_by = null;
            updates.reserved_until = null;
            updates.device_id = null;
        }

        await ip.update(updates);

        await createAuditLog(req.user.id, 'update', 'ip_addresses', ip.id, oldValues, ip.toJSON(), req);

        res.json({
            success: true,
            data: ip,
            message: 'IP address updated successfully',
        });
    } catch (error) {
        console.error('Update IP address error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update IP address',
        });
    }
};

// Find free IPs in a segment
const findFreeIps = async (req, res) => {
    try {
        const { segment_id, count = 10 } = req.query;

        if (!segment_id) {
            return res.status(400).json({
                success: false,
                message: 'segment_id is required',
            });
        }

        const freeIps = await IpAddress.findAll({
            where: {
                segment_id,
                status: 'free',
            },
            order: [['ip_address', 'ASC']],
            limit: parseInt(count),
            include: [
                {
                    model: NetworkSegment,
                    as: 'segment',
                    attributes: ['id', 'name', 'vlan_id', 'cidr'],
                },
            ],
        });

        res.json({
            success: true,
            data: freeIps,
            count: freeIps.length,
        });
    } catch (error) {
        console.error('Find free IPs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to find free IPs',
        });
    }
};

// Assign IP to device
const assignIpToDevice = async (req, res) => {
    try {
        const { device_id, hostname, mac_address, notes } = req.body;
        const ip = await IpAddress.findByPk(req.params.id);

        if (!ip) {
            return res.status(404).json({
                success: false,
                message: 'IP address not found',
            });
        }

        if (ip.status === 'in_use') {
            return res.status(400).json({
                success: false,
                message: 'IP is already in use',
            });
        }

        if (ip.status === 'gateway' || ip.status === 'blocked') {
            return res.status(400).json({
                success: false,
                message: `Cannot assign IP with status: ${ip.status}`,
            });
        }

        // Verify device exists
        if (device_id) {
            const device = await Device.findByPk(device_id);
            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: 'Device not found',
                });
            }
        }

        const oldValues = ip.toJSON();

        await ip.update({
            device_id: device_id || null,
            status: 'in_use',
            hostname: hostname || ip.hostname,
            mac_address: mac_address || ip.mac_address,
            notes: notes || ip.notes,
            reserved_by: null,
            reserved_until: null,
        });

        // Fetch updated IP with relations
        const updatedIp = await IpAddress.findByPk(ip.id, {
            include: [
                { model: NetworkSegment, as: 'segment' },
                { model: Device, as: 'device' },
            ],
        });

        await createAuditLog(req.user.id, 'update', 'ip_addresses', ip.id, oldValues, updatedIp.toJSON(), req);

        res.json({
            success: true,
            data: updatedIp,
            message: 'IP assigned successfully',
        });
    } catch (error) {
        console.error('Assign IP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign IP',
        });
    }
};

// Release IP from device
const releaseIp = async (req, res) => {
    try {
        const ip = await IpAddress.findByPk(req.params.id);

        if (!ip) {
            return res.status(404).json({
                success: false,
                message: 'IP address not found',
            });
        }

        if (ip.status !== 'in_use' && ip.status !== 'reserved') {
            return res.status(400).json({
                success: false,
                message: 'IP is not currently assigned or reserved',
            });
        }

        const oldValues = ip.toJSON();

        await ip.update({
            device_id: null,
            status: 'free',
            hostname: null,
            mac_address: null,
            notes: null,
            reserved_by: null,
            reserved_until: null,
        });

        await createAuditLog(req.user.id, 'update', 'ip_addresses', ip.id, oldValues, ip.toJSON(), req);

        res.json({
            success: true,
            data: ip,
            message: 'IP released successfully',
        });
    } catch (error) {
        console.error('Release IP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to release IP',
        });
    }
};

// Get IP statuses for dropdown
const getIpStatuses = async (req, res) => {
    const statuses = [
        { value: 'free', label: 'Free', color: 'green' },
        { value: 'in_use', label: 'In Use', color: 'blue' },
        { value: 'reserved', label: 'Reserved', color: 'orange' },
        { value: 'blocked', label: 'Blocked', color: 'red' },
        { value: 'gateway', label: 'Gateway', color: 'purple' },
    ];

    res.json({
        success: true,
        data: statuses,
    });
};

module.exports = {
    getIpAddresses,
    getIpAddress,
    updateIpAddress,
    findFreeIps,
    assignIpToDevice,
    releaseIp,
    getIpStatuses,
};
