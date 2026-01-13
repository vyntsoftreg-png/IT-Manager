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

module.exports = {
    getAuditLogs,
    getAuditLog,
    getActions,
    getEntityTypes,
    getAuditStats,
};
