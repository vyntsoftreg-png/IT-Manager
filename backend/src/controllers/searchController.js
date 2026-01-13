const { Op } = require('sequelize');
const { Device, IpAddress, NetworkSegment, AdminAccount } = require('../models');

// Global search across all modules
const globalSearch = async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;

        if (!q || q.length < 2) {
            return res.json({
                success: true,
                data: {
                    devices: [],
                    ips: [],
                    segments: [],
                    accounts: [],
                },
            });
        }

        const searchTerm = `%${q}%`;

        // Search devices
        const devices = await Device.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.like]: searchTerm } },
                    { hostname: { [Op.like]: searchTerm } },
                    { serial_number: { [Op.like]: searchTerm } },
                    { assigned_user: { [Op.like]: searchTerm } },
                    { mac_address: { [Op.like]: searchTerm } },
                ],
            },
            attributes: ['id', 'name', 'type', 'hostname', 'status'],
            limit: parseInt(limit),
        });

        // Search IP addresses
        const ips = await IpAddress.findAll({
            where: {
                [Op.or]: [
                    { ip_address: { [Op.like]: searchTerm } },
                    { hostname: { [Op.like]: searchTerm } },
                    { mac_address: { [Op.like]: searchTerm } },
                ],
            },
            attributes: ['id', 'ip_address', 'hostname', 'status', 'segment_id'],
            include: [
                {
                    model: NetworkSegment,
                    as: 'segment',
                    attributes: ['name'],
                },
            ],
            limit: parseInt(limit),
        });

        // Search network segments
        const segments = await NetworkSegment.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.like]: searchTerm } },
                    { cidr: { [Op.like]: searchTerm } },
                    { description: { [Op.like]: searchTerm } },
                ],
            },
            attributes: ['id', 'name', 'cidr', 'vlan_id'],
            limit: parseInt(limit),
        });

        // Search admin accounts
        const accounts = await AdminAccount.findAll({
            where: {
                [Op.or]: [
                    { system_name: { [Op.like]: searchTerm } },
                    { username: { [Op.like]: searchTerm } },
                    { admin_url: { [Op.like]: searchTerm } },
                ],
            },
            attributes: ['id', 'system_name', 'system_type', 'username', 'environment'],
            limit: parseInt(limit),
        });

        res.json({
            success: true,
            data: {
                devices: devices.map(d => ({
                    id: d.id,
                    name: d.name,
                    type: 'device',
                    subType: d.type,
                    description: d.hostname || d.status,
                })),
                ips: ips.map(ip => ({
                    id: ip.id,
                    name: ip.ip_address,
                    type: 'ip',
                    subType: ip.status,
                    description: ip.segment?.name || ip.hostname,
                })),
                segments: segments.map(s => ({
                    id: s.id,
                    name: s.name,
                    type: 'segment',
                    subType: s.cidr,
                    description: s.vlan_id ? `VLAN ${s.vlan_id}` : '',
                })),
                accounts: accounts.map(a => ({
                    id: a.id,
                    name: a.system_name,
                    type: 'account',
                    subType: a.system_type,
                    description: a.username,
                })),
            },
            query: q,
        });
    } catch (error) {
        console.error('Global search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed',
        });
    }
};

module.exports = {
    globalSearch,
};
