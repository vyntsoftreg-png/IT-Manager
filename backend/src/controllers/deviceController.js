const { Op } = require('sequelize');
const { Device, IpAddress, AdminAccount, NetworkSegment, SystemSetting } = require('../models');
const { createAuditLog } = require('../middleware/audit');

// Get all devices with filtering and pagination
const getDevices = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            type,
            status,
            department,
            location,
            sortBy = 'created_at',
            sortOrder = 'DESC',
        } = req.query;

        const where = {};

        // Search filter
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { hostname: { [Op.like]: `%${search}%` } },
                { serial_number: { [Op.like]: `%${search}%` } },
                { assigned_user: { [Op.like]: `%${search}%` } },
                { mac_address: { [Op.like]: `%${search}%` } },
            ];
        }

        // Type filter
        if (type) {
            where.type = type;
        }

        // Status filter
        if (status) {
            where.status = status;
        }

        // Department filter
        if (department) {
            where.department = { [Op.like]: `%${department}%` };
        }

        // Location filter
        if (location) {
            where.location = { [Op.like]: `%${location}%` };
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await Device.findAndCountAll({
            where,
            include: [
                {
                    model: IpAddress,
                    as: 'ipAddresses',
                    attributes: ['id', 'ip_address', 'status', 'hostname'],
                    include: [
                        {
                            model: NetworkSegment,
                            as: 'segment',
                            attributes: ['id', 'name', 'vlan_id'],
                        },
                    ],
                },
            ],
            order: [[sortBy, sortOrder.toUpperCase()]],
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
        console.error('Get devices error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch devices',
        });
    }
};

// Get single device by ID
const getDevice = async (req, res) => {
    try {
        const device = await Device.findByPk(req.params.id, {
            include: [
                {
                    model: IpAddress,
                    as: 'ipAddresses',
                    include: [
                        {
                            model: NetworkSegment,
                            as: 'segment',
                            attributes: ['id', 'name', 'vlan_id', 'cidr'],
                        },
                    ],
                },
                {
                    model: AdminAccount,
                    as: 'adminAccounts',
                    attributes: req.user?.role === 'admin' || req.user?.role === 'it_ops'
                        ? undefined  // All fields
                        : ['id', 'name', 'system_type', 'environment'],  // Limited fields
                },
            ],
        });

        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found',
            });
        }

        res.json({
            success: true,
            data: device,
        });
    } catch (error) {
        console.error('Get device error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch device',
        });
    }
};

// Create new device
const createDevice = async (req, res) => {
    try {
        const {
            name,
            type,
            manufacturer,
            model,
            serial_number,
            specifications,
            hostname,
            mac_address,
            location,
            department,
            assigned_user,
            status,
            purchase_date,
            warranty_expiry,
            notes,
        } = req.body;

        if (!name || !type) {
            return res.status(400).json({
                success: false,
                message: 'Name and type are required',
            });
        }

        const device = await Device.create({
            name,
            type,
            manufacturer,
            model,
            serial_number,
            specifications,
            hostname,
            mac_address,
            location,
            department,
            assigned_user,
            status: status || 'active',
            purchase_date,
            warranty_expiry,
            notes,
        });

        await createAuditLog(req.user.id, 'create', 'devices', device.id, null, device.toJSON(), req);

        res.status(201).json({
            success: true,
            data: device,
            message: 'Device created successfully',
        });
    } catch (error) {
        console.error('Create device error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create device',
        });
    }
};

// Update device
const updateDevice = async (req, res) => {
    try {
        const device = await Device.findByPk(req.params.id);

        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found',
            });
        }

        const oldValues = device.toJSON();

        const allowedFields = [
            'name', 'type', 'manufacturer', 'model', 'serial_number',
            'specifications', 'hostname', 'mac_address', 'location',
            'department', 'assigned_user', 'status', 'purchase_date',
            'warranty_expiry', 'notes',
        ];

        const updates = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        await device.update(updates);

        await createAuditLog(req.user.id, 'update', 'devices', device.id, oldValues, device.toJSON(), req);

        res.json({
            success: true,
            data: device,
            message: 'Device updated successfully',
        });
    } catch (error) {
        console.error('Update device error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update device',
        });
    }
};

// Delete device
const deleteDevice = async (req, res) => {
    try {
        const device = await Device.findByPk(req.params.id, {
            include: [
                { model: IpAddress, as: 'ipAddresses' },
                { model: AdminAccount, as: 'adminAccounts' },
            ],
        });

        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found',
            });
        }

        const oldValues = device.toJSON();

        // Release all IPs assigned to this device
        await IpAddress.update(
            { device_id: null, status: 'free' },
            { where: { device_id: device.id } }
        );

        // Unlink admin accounts
        await AdminAccount.update(
            { device_id: null },
            { where: { device_id: device.id } }
        );

        await device.destroy();

        await createAuditLog(req.user.id, 'delete', 'devices', req.params.id, oldValues, null, req);

        res.json({
            success: true,
            message: 'Device deleted successfully',
        });
    } catch (error) {
        console.error('Delete device error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete device',
        });
    }
};

// Get device types for filter dropdown (from database)
const getDeviceTypes = async (req, res) => {
    try {
        // Fetch from database
        const dbTypes = await SystemSetting.findAll({
            where: { category: 'device_types' },
            order: [['sort_order', 'ASC'], ['key', 'ASC']],
        });

        if (dbTypes && dbTypes.length > 0) {
            const types = dbTypes.map(t => ({
                value: t.key,
                label: t.label || t.key,
                icon: t.icon || '📦',
                color: t.color || 'blue',
            }));
            return res.json({ success: true, data: types });
        }

        // Fallback to defaults if no data in DB
        const defaultTypes = [
            { value: 'pc', label: 'PC / Desktop', icon: '💻' },
            { value: 'laptop', label: 'Laptop', icon: '💻' },
            { value: 'server', label: 'Server', icon: '🖥️' },
            { value: 'vm', label: 'Virtual Machine', icon: '☁️' },
            { value: 'switch', label: 'Switch', icon: '🔀' },
            { value: 'router', label: 'Router', icon: '📡' },
            { value: 'firewall', label: 'Firewall', icon: '🛡️' },
            { value: 'access_point', label: 'Access Point (WiFi)', icon: '📶' },
            { value: 'printer', label: 'Printer', icon: '🖨️' },
            { value: 'camera', label: 'Camera (IP)', icon: '📹' },
            { value: 'nas', label: 'NAS Storage', icon: '💾' },
            { value: 'ups', label: 'UPS', icon: '🔋' },
            { value: 'other', label: 'Other', icon: '📦' },
        ];
        res.json({ success: true, data: defaultTypes });
    } catch (error) {
        console.error('Get device types error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch device types' });
    }
};

// Get device statuses for filter dropdown (from database)
const getDeviceStatuses = async (req, res) => {
    try {
        // Fetch from database
        const dbStatuses = await SystemSetting.findAll({
            where: { category: 'device_statuses' },
            order: [['sort_order', 'ASC'], ['key', 'ASC']],
        });

        if (dbStatuses && dbStatuses.length > 0) {
            const statuses = dbStatuses.map(s => ({
                value: s.key,
                label: s.label || s.key,
                color: s.color || 'blue',
            }));
            return res.json({ success: true, data: statuses });
        }

        // Fallback to defaults if no data in DB
        const defaultStatuses = [
            { value: 'active', label: 'Active', color: 'green' },
            { value: 'inactive', label: 'Inactive', color: 'gray' },
            { value: 'maintenance', label: 'Maintenance', color: 'orange' },
            { value: 'retired', label: 'Retired', color: 'red' },
            { value: 'spare', label: 'Spare', color: 'blue' },
        ];
        res.json({ success: true, data: defaultStatuses });
    } catch (error) {
        console.error('Get device statuses error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch device statuses' });
    }
};

// Get statistics
const getDeviceStats = async (req, res) => {
    try {
        const totalDevices = await Device.count();

        const byType = await Device.findAll({
            attributes: [
                'type',
                [require('sequelize').fn('COUNT', '*'), 'count'],
            ],
            group: ['type'],
        });

        const byStatus = await Device.findAll({
            attributes: [
                'status',
                [require('sequelize').fn('COUNT', '*'), 'count'],
            ],
            group: ['status'],
        });

        const byDepartment = await Device.findAll({
            attributes: [
                'department',
                [require('sequelize').fn('COUNT', '*'), 'count'],
            ],
            where: {
                department: { [Op.ne]: null },
            },
            group: ['department'],
            order: [[require('sequelize').fn('COUNT', '*'), 'DESC']],
            limit: 10,
        });

        res.json({
            success: true,
            data: {
                total: totalDevices,
                byType: byType.map(r => ({ type: r.type, count: r.get('count') })),
                byStatus: byStatus.map(r => ({ status: r.status, count: r.get('count') })),
                byDepartment: byDepartment.map(r => ({ department: r.department || 'Unassigned', count: r.get('count') })),
            },
        });
    } catch (error) {
        console.error('Get device stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch device statistics',
        });
    }
};

// Export devices to CSV
const exportDevicesCSV = async (req, res) => {
    try {
        const devices = await Device.findAll({
            include: [
                {
                    model: IpAddress,
                    as: 'ipAddresses',
                    attributes: ['ip_address'],
                },
            ],
            order: [['name', 'ASC']],
        });

        // CSV Header
        const headers = [
            'Name', 'Type', 'Hostname', 'MAC Address', 'IP Addresses',
            'Manufacturer', 'Model', 'Serial Number', 'Status',
            'Department', 'Location', 'Assigned User',
            'Purchase Date', 'Warranty Expiry', 'Notes'
        ];

        // CSV Rows
        const rows = devices.map(device => [
            device.name || '',
            device.type || '',
            device.hostname || '',
            device.mac_address || '',
            device.ipAddresses?.map(ip => ip.ip_address).join('; ') || '',
            device.manufacturer || '',
            device.model || '',
            device.serial_number || '',
            device.status || '',
            device.department || '',
            device.location || '',
            device.assigned_user || '',
            device.purchase_date ? new Date(device.purchase_date).toISOString().split('T')[0] : '',
            device.warranty_expiry ? new Date(device.warranty_expiry).toISOString().split('T')[0] : '',
            (device.notes || '').replace(/"/g, '""'),
        ]);

        // Build CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Add BOM for UTF-8 encoding in Excel
        const bom = '\uFEFF';

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="devices_export.csv"');
        res.send(bom + csvContent);
    } catch (error) {
        console.error('Export devices error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export devices',
        });
    }
};

// Import devices from CSV
const importDevicesCSV = async (req, res) => {
    try {
        const { devices } = req.body;

        if (!Array.isArray(devices) || devices.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No devices provided for import',
            });
        }

        // PHASE 1: Validate all rows first
        const validationErrors = [];
        const validDevices = [];

        // Fetch device types from database (includes user-added types)
        const deviceTypeSetting = await SystemSetting.findOne({ where: { category: 'device_types' } });
        let validTypes = ['pc', 'laptop', 'server', 'vm', 'switch', 'router', 'firewall', 'access_point', 'printer', 'camera', 'nas', 'ups', 'other'];

        if (deviceTypeSetting) {
            try {
                const allSettings = await SystemSetting.findAll({ where: { category: 'device_types' } });
                validTypes = allSettings.map(s => s.key);
            } catch (e) {
                console.error('Failed to fetch device types from DB:', e);
            }
        }

        for (let i = 0; i < devices.length; i++) {
            const deviceData = devices[i];
            const rowNum = i + 1;
            const rowErrors = [];

            // Check required fields
            if (!deviceData.name || !deviceData.name.trim()) {
                rowErrors.push('Thiếu tên thiết bị (name)');
            }
            if (!deviceData.type || !deviceData.type.trim()) {
                rowErrors.push('Thiếu loại thiết bị (type)');
            } else if (!validTypes.includes(deviceData.type.toLowerCase())) {
                rowErrors.push(`Loại thiết bị không hợp lệ: "${deviceData.type}". Các loại hợp lệ: ${validTypes.join(', ')}`);
            }

            // Check IP address (required)
            const ipString = deviceData.ip_addresses || deviceData.ip;
            if (!ipString || !ipString.trim()) {
                rowErrors.push('Thiếu địa chỉ IP (ip)');
            } else {
                // Validate IP format
                const ipList = ipString.split(/[;,]/).map(ip => ip.trim()).filter(ip => ip);
                const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
                for (const ip of ipList) {
                    if (!ipRegex.test(ip)) {
                        rowErrors.push(`IP address không đúng định dạng: "${ip}"`);
                    }
                }
            }

            // Validate MAC address format if provided (optional)
            if (deviceData.mac_address) {
                const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
                if (!macRegex.test(deviceData.mac_address)) {
                    rowErrors.push(`MAC address không đúng định dạng: "${deviceData.mac_address}"`);
                }
            }

            if (rowErrors.length > 0) {
                validationErrors.push({
                    row: rowNum,
                    name: deviceData.name || '(không có tên)',
                    errors: rowErrors,
                });
            } else {
                validDevices.push(deviceData);
            }
        }

        // PHASE 2: If any errors, return them without importing
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Có ${validationErrors.length} dòng lỗi. Vui lòng sửa dữ liệu và thử lại.`,
                errors: validationErrors,
                totalRows: devices.length,
                errorCount: validationErrors.length,
            });
        }

        // PHASE 3: All rows valid, proceed with import
        const results = { success: 0, failed: 0, errors: [], ipsLinked: 0 };

        for (const deviceData of validDevices) {
            try {
                // Create the device
                const device = await Device.create({
                    name: deviceData.name,
                    type: deviceData.type.toLowerCase(),
                    hostname: deviceData.hostname || null,
                    mac_address: deviceData.mac_address || null,
                    manufacturer: deviceData.manufacturer || null,
                    model: deviceData.model || null,
                    serial_number: deviceData.serial_number || null,
                    status: deviceData.status || 'active',
                    department: deviceData.department || null,
                    location: deviceData.location || null,
                    assigned_user: deviceData.assigned_user || null,
                    purchase_date: deviceData.purchase_date || null,
                    warranty_expiry: deviceData.warranty_expiry || null,
                    notes: deviceData.notes || null,
                });

                results.success++;

                // Sync IP addresses to IP Map if provided
                if (deviceData.ip_addresses || deviceData.ip) {
                    const ipString = deviceData.ip_addresses || deviceData.ip;
                    const ipList = ipString.split(/[;,]/).map(ip => ip.trim()).filter(ip => ip);

                    for (const ipAddr of ipList) {
                        try {
                            const existingIp = await IpAddress.findOne({
                                where: { ip_address: ipAddr },
                            });

                            if (existingIp) {
                                await existingIp.update({
                                    device_id: device.id,
                                    hostname: deviceData.hostname || existingIp.hostname,
                                    status: 'in_use',
                                    mac_address: deviceData.mac_address || existingIp.mac_address,
                                });
                                results.ipsLinked++;
                            } else {
                                const segments = await NetworkSegment.findAll();
                                let matchedSegment = null;

                                for (const segment of segments) {
                                    if (isIpInCidr(ipAddr, segment.cidr)) {
                                        matchedSegment = segment;
                                        break;
                                    }
                                }

                                if (matchedSegment) {
                                    await IpAddress.create({
                                        ip_address: ipAddr,
                                        segment_id: matchedSegment.id,
                                        device_id: device.id,
                                        hostname: deviceData.hostname || null,
                                        mac_address: deviceData.mac_address || null,
                                        status: 'in_use',
                                    });
                                    results.ipsLinked++;
                                }
                            }
                        } catch (ipErr) {
                            console.error(`Failed to link IP ${ipAddr}:`, ipErr.message);
                        }
                    }
                }
            } catch (err) {
                results.failed++;
                results.errors.push(`Failed to import "${deviceData.name}": ${err.message}`);
            }
        }

        await createAuditLog(req.user.id, 'import', 'devices', null, null, { imported: results.success, ipsLinked: results.ipsLinked }, req);

        res.json({
            success: true,
            data: results,
            message: `Imported ${results.success} devices, ${results.ipsLinked} IPs linked successfully!`,
        });
    } catch (error) {
        console.error('Import devices error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to import devices',
        });
    }
};

// Helper function to check if IP is in CIDR range
const isIpInCidr = (ip, cidr) => {
    try {
        const [network, prefixLength] = cidr.split('/');
        const prefix = parseInt(prefixLength);

        const ipParts = ip.split('.').map(Number);
        const networkParts = network.split('.').map(Number);

        const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
        const networkNum = (networkParts[0] << 24) + (networkParts[1] << 16) + (networkParts[2] << 8) + networkParts[3];

        const mask = ~((1 << (32 - prefix)) - 1);

        return (ipNum & mask) === (networkNum & mask);
    } catch {
        return false;
    }
};

// Bulk delete devices
const bulkDeleteDevices = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No device IDs provided',
            });
        }

        // Release all IPs assigned to these devices
        await IpAddress.update(
            { device_id: null, status: 'free' },
            { where: { device_id: ids } }
        );

        // Unlink admin accounts
        await AdminAccount.update(
            { device_id: null },
            { where: { device_id: ids } }
        );

        // Delete devices
        const deleted = await Device.destroy({
            where: { id: ids },
        });

        await createAuditLog(req.user.id, 'bulk_delete', 'devices', null, { ids }, { deleted }, req);

        res.json({
            success: true,
            deleted,
            message: `Deleted ${deleted} devices successfully`,
        });
    } catch (error) {
        console.error('Bulk delete devices error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete devices',
        });
    }
};

module.exports = {
    getDevices,
    getDevice,
    createDevice,
    updateDevice,
    deleteDevice,
    bulkDeleteDevices,
    getDeviceTypes,
    getDeviceStatuses,
    getDeviceStats,
    exportDevicesCSV,
    importDevicesCSV,
};
