const { Op } = require('sequelize');
const { AuditLog, User } = require('../models');

// Get audit logs with filtering and pagination
const getAuditLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            action,
            entity_type,
            user_id,
            start_date,
            end_date,
            search,
        } = req.query;

        const where = {};

        if (action) {
            where.action = action;
        }

        if (entity_type) {
            where.entity_type = entity_type;
        }

        if (user_id) {
            where.user_id = user_id;
        }

        if (start_date || end_date) {
            where.created_at = {};
            if (start_date) {
                where.created_at[Op.gte] = new Date(start_date);
            }
            if (end_date) {
                where.created_at[Op.lte] = new Date(end_date);
            }
        }

        if (search) {
            where[Op.or] = [
                { entity_type: { [Op.like]: `%${search}%` } },
                { ip_address: { [Op.like]: `%${search}%` } },
            ];
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await AuditLog.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'display_name'],
                },
            ],
            order: [['created_at', 'DESC']],
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
        console.error('Get audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs',
        });
    }
};

// Get single audit log detail
const getAuditLog = async (req, res) => {
    try {
        const log = await AuditLog.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'display_name'],
                },
            ],
        });

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Audit log not found',
            });
        }

        res.json({
            success: true,
            data: log,
        });
    } catch (error) {
        console.error('Get audit log error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit log',
        });
    }
};

// Get available actions for filter dropdown
const getActions = async (req, res) => {
    const actions = [
        { value: 'create', label: 'Tạo mới', color: 'green' },
        { value: 'update', label: 'Cập nhật', color: 'blue' },
        { value: 'delete', label: 'Xóa', color: 'red' },
        { value: 'login', label: 'Đăng nhập', color: 'cyan' },
        { value: 'logout', label: 'Đăng xuất', color: 'gray' },
        { value: 'reveal_password', label: 'Xem mật khẩu', color: 'orange' },
        { value: 'import', label: 'Import', color: 'purple' },
    ];

    res.json({
        success: true,
        data: actions,
    });
};

// Get entity types for filter dropdown
const getEntityTypes = async (req, res) => {
    const entityTypes = [
        { value: 'devices', label: 'Thiết bị' },
        { value: 'ip_addresses', label: 'Địa chỉ IP' },
        { value: 'network_segments', label: 'Dải mạng' },
        { value: 'admin_accounts', label: 'Tài khoản Admin' },
        { value: 'users', label: 'Người dùng' },
    ];

    res.json({
        success: true,
        data: entityTypes,
    });
};

// Get audit statistics
const getAuditStats = async (req, res) => {
    try {
        const totalLogs = await AuditLog.count();

        const byAction = await AuditLog.findAll({
            attributes: [
                'action',
                [require('sequelize').fn('COUNT', '*'), 'count'],
            ],
            group: ['action'],
        });

        const byEntityType = await AuditLog.findAll({
            attributes: [
                'entity_type',
                [require('sequelize').fn('COUNT', '*'), 'count'],
            ],
            group: ['entity_type'],
        });

        // Recent activity (last 7 days)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const recentActivity = await AuditLog.count({
            where: {
                created_at: { [Op.gte]: oneWeekAgo },
            },
        });

        res.json({
            success: true,
            data: {
                total: totalLogs,
                recentActivity,
                byAction: byAction.map(r => ({
                    action: r.action,
                    count: parseInt(r.get('count'), 10)
                })),
                byEntityType: byEntityType.map(r => ({
                    type: r.entity_type,
                    count: parseInt(r.get('count'), 10)
                })),
            },
        });
    } catch (error) {
        console.error('Get audit stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit statistics',
        });
    }
};

// Export audit logs to CSV
const exportAuditLogs = async (req, res) => {
    try {
        const {
            action,
            entity_type,
            user_id,
            start_date,
            end_date,
            search,
        } = req.query;

        const where = {};

        if (action) where.action = action;
        if (entity_type) where.entity_type = entity_type;
        if (user_id) where.user_id = user_id;

        if (start_date || end_date) {
            where.created_at = {};
            if (start_date) where.created_at[Op.gte] = new Date(start_date);
            if (end_date) where.created_at[Op.lte] = new Date(end_date);
        }

        if (search) {
            where[Op.or] = [
                { entity_type: { [Op.like]: `%${search}%` } },
                { ip_address: { [Op.like]: `%${search}%` } },
            ];
        }

        const logs = await AuditLog.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['username', 'display_name'],
                },
            ],
            order: [['created_at', 'DESC']],
        });

        // Helper to format changes
        const formatDetails = (log) => {
            try {
                const oldObj = log.old_values ? JSON.parse(log.old_values) : {};
                const newObj = log.new_values ? JSON.parse(log.new_values) : {};

                if (log.action === 'create') {
                    const name = newObj.name || newObj.title || newObj.username || log.entity_id;
                    return `Created new item: ${name}`;
                }

                if (log.action === 'delete') {
                    const name = oldObj.name || oldObj.title || oldObj.username || log.entity_id;
                    return `Deleted item: ${name}`;
                }

                if (log.action === 'update') {
                    const changes = [];
                    Object.keys(newObj).forEach(key => {
                        if (['updated_at', 'created_at', 'password', 'encrypted_password', 'last_login'].includes(key)) return;

                        // Simple comparison
                        const oldVal = oldObj[key];
                        const newVal = newObj[key];

                        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                            changes.push(`${key}: ${oldVal} -> ${newVal}`);
                        }
                    });
                    return changes.length > 0 ? changes.join('; ') : 'Updated record';
                }

                if (['login', 'logout'].includes(log.action)) {
                    return `${log.action === 'login' ? 'Logged in' : 'Logged out'} from IP ${log.ip_address}`;
                }

                return '';
            } catch (e) {
                return 'Error parsing details';
            }
        };

        // Convert to CSV
        // Using semi-colon separator for Excel compatibility in some regions, or standard comma. 
        // Standard CSV uses comma.
        const fields = ['Time', 'User', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Description'];
        const csvRows = [fields.join(',')];

        logs.forEach(log => {
            // Fix date format manually
            let dateStr = '';
            try {
                // Check both snake_case and camelCase (Sequelize default)
                const dateVal = log.created_at || log.createdAt;
                const d = new Date(dateVal);

                if (!isNaN(d.getTime())) {
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const hh = String(d.getHours()).padStart(2, '0');
                    const min = String(d.getMinutes()).padStart(2, '0');
                    const ss = String(d.getSeconds()).padStart(2, '0');
                    dateStr = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
                } else {
                    dateStr = dateVal ? String(dateVal) : '';
                }
            } catch (e) {
                dateStr = '';
            }

            const details = formatDetails(log).replace(/"/g, '""'); // Escape quotes

            const row = [
                `"${dateStr}"`,
                `"${log.user?.display_name || log.user?.username || 'System'}"`,
                `"${log.action}"`,
                `"${log.entity_type}"`,
                `"${log.entity_id || ''}"`,
                `"${log.ip_address || ''}"`,
                `"${details}"`,
            ];
            csvRows.push(row.join(','));
        });

        // Add BOM for Excel UTF-8 compatibility
        const bom = '\uFEFF';
        res.header('Content-Type', 'text/csv; charset=utf-8');
        res.header('Content-Disposition', `attachment; filename=audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
        res.send(bom + csvRows.join('\n'));

    } catch (error) {
        console.error('Export audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export audit logs',
        });
    }
};

module.exports = {
    getAuditLogs,
    getAuditLog,
    getActions,
    getEntityTypes,
    getAuditStats,
    exportAuditLogs,
};
