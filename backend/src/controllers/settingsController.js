const { Op } = require('sequelize');
const { SystemSetting } = require('../models');
const { createAuditLog } = require('../middleware/audit');

// Default settings to seed
const DEFAULT_SETTINGS = {
    device_types: [
        { key: 'pc', label: 'PC / Desktop', icon: '💻', color: 'blue' },
        { key: 'laptop', label: 'Laptop', icon: '💻', color: 'cyan' },
        { key: 'server', label: 'Server', icon: '🖥️', color: 'purple' },
        { key: 'vm', label: 'Virtual Machine', icon: '☁️', color: 'geekblue' },
        { key: 'switch', label: 'Switch', icon: '🔀', color: 'green' },
        { key: 'router', label: 'Router', icon: '🌐', color: 'orange' },
        { key: 'firewall', label: 'Firewall', icon: '🛡️', color: 'red' },
        { key: 'ap', label: 'Access Point (WiFi)', icon: '📶', color: 'lime' },
        { key: 'printer', label: 'Máy in', icon: '🖨️', color: 'gray' },
        { key: 'camera', label: 'Camera', icon: '📷', color: 'volcano' },
        { key: 'ups', label: 'UPS', icon: '🔋', color: 'gold' },
        { key: 'other', label: 'Khác', icon: '📦', color: 'default' },
    ],
    device_statuses: [
        { key: 'active', label: 'Đang hoạt động', icon: '🟢', color: 'success' },
        { key: 'inactive', label: 'Không hoạt động', icon: '🔴', color: 'error' },
        { key: 'maintenance', label: 'Bảo trì', icon: '🟡', color: 'warning' },
        { key: 'retired', label: 'Đã loại bỏ', icon: '⚫', color: 'default' },
    ],
    system_types: [
        { key: 'o365', label: 'Microsoft 365', icon: '🔷', color: 'blue' },
        { key: 'azure', label: 'Azure', icon: '☁️', color: 'blue' },
        { key: 'google', label: 'Google Workspace', icon: '🔴', color: 'red' },
        { key: 'vmware', label: 'VMware vCenter', icon: '🖥️', color: 'green' },
        { key: 'esxi', label: 'VMware ESXi', icon: '🖥️', color: 'green' },
        { key: 'firewall', label: 'Firewall', icon: '🛡️', color: 'orange' },
        { key: 'switch', label: 'Switch/Router', icon: '🔀', color: 'cyan' },
        { key: 'wifi', label: 'WiFi Controller', icon: '📶', color: 'purple' },
        { key: 'antivirus', label: 'Antivirus/EDR', icon: '🛡️', color: 'red' },
        { key: 'backup', label: 'Backup System', icon: '💾', color: 'volcano' },
        { key: 'nas', label: 'NAS/Storage', icon: '💿', color: 'gold' },
        { key: 'database', label: 'Database', icon: '🗄️', color: 'geekblue' },
        { key: 'linux', label: 'Linux Server', icon: '🐧', color: 'magenta' },
        { key: 'windows', label: 'Windows Server', icon: '🪟', color: 'blue' },
        { key: 'other', label: 'Khác', icon: '📦', color: 'default' },
    ],
    environments: [
        { key: 'production', label: 'Production', icon: '🟢', color: 'success' },
        { key: 'staging', label: 'Staging', icon: '🟡', color: 'warning' },
        { key: 'development', label: 'Development', icon: '🔵', color: 'processing' },
        { key: 'testing', label: 'Testing', icon: '🟣', color: 'purple' },
    ],
    departments: [
        { key: 'it', label: 'IT', icon: '💻', color: 'blue' },
        { key: 'accounting', label: 'Kế toán', icon: '📊', color: 'green' },
        { key: 'hr', label: 'Nhân sự', icon: '👥', color: 'purple' },
        { key: 'sales', label: 'Kinh doanh', icon: '💼', color: 'orange' },
        { key: 'marketing', label: 'Marketing', icon: '📢', color: 'cyan' },
        { key: 'management', label: 'Ban lãnh đạo', icon: '👔', color: 'gold' },
        { key: 'warehouse', label: 'Kho', icon: '📦', color: 'volcano' },
        { key: 'production', label: 'Sản xuất', icon: '🏭', color: 'lime' },
    ],
};

// Get all settings by category
const getSettings = async (req, res) => {
    try {
        const { category } = req.query;

        const where = { is_active: true };
        if (category) {
            where.category = category;
        }

        const settings = await SystemSetting.findAll({
            where,
            order: [['category', 'ASC'], ['sort_order', 'ASC'], ['label', 'ASC']],
        });

        // Group by category
        const grouped = settings.reduce((acc, setting) => {
            if (!acc[setting.category]) {
                acc[setting.category] = [];
            }
            acc[setting.category].push(setting);
            return acc;
        }, {});

        res.json({
            success: true,
            data: category ? settings : grouped,
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings',
        });
    }
};

// Get settings by category (public - for dropdown options)
const getSettingsByCategory = async (req, res) => {
    try {
        const { category } = req.params;

        const settings = await SystemSetting.findAll({
            where: { category, is_active: true },
            order: [['sort_order', 'ASC'], ['label', 'ASC']],
            attributes: ['key', 'label', 'icon', 'color'],
        });

        res.json({
            success: true,
            data: settings.map(s => ({
                value: s.key,
                label: s.label,
                icon: s.icon,
                color: s.color,
            })),
        });
    } catch (error) {
        console.error('Get settings by category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings',
        });
    }
};

// Create setting
const createSetting = async (req, res) => {
    try {
        const { category, key, label, icon, color, sort_order, metadata } = req.body;

        if (!category || !key || !label) {
            return res.status(400).json({
                success: false,
                message: 'Category, key, and label are required',
            });
        }

        // Check duplicate
        const existing = await SystemSetting.findOne({
            where: { category, key },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Setting with this key already exists in this category',
            });
        }

        const setting = await SystemSetting.create({
            category,
            key,
            label,
            icon,
            color,
            sort_order: sort_order || 0,
            metadata,
        });

        await createAuditLog(req.user.id, 'create', 'system_settings', setting.id, null, setting.toJSON(), req);

        res.status(201).json({
            success: true,
            data: setting,
        });
    } catch (error) {
        console.error('Create setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create setting',
        });
    }
};

// Update setting
const updateSetting = async (req, res) => {
    try {
        const setting = await SystemSetting.findByPk(req.params.id);

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found',
            });
        }

        const oldValues = setting.toJSON();
        const { label, icon, color, sort_order, is_active, metadata } = req.body;

        if (label !== undefined) setting.label = label;
        if (icon !== undefined) setting.icon = icon;
        if (color !== undefined) setting.color = color;
        if (sort_order !== undefined) setting.sort_order = sort_order;
        if (is_active !== undefined) setting.is_active = is_active;
        if (metadata !== undefined) setting.metadata = metadata;

        await setting.save();

        await createAuditLog(req.user.id, 'update', 'system_settings', setting.id, oldValues, setting.toJSON(), req);

        res.json({
            success: true,
            data: setting,
        });
    } catch (error) {
        console.error('Update setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update setting',
        });
    }
};

// Delete setting
const deleteSetting = async (req, res) => {
    try {
        const setting = await SystemSetting.findByPk(req.params.id);

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found',
            });
        }

        const oldValues = setting.toJSON();
        await setting.destroy();

        await createAuditLog(req.user.id, 'delete', 'system_settings', req.params.id, oldValues, null, req);

        res.json({
            success: true,
            message: 'Setting deleted successfully',
        });
    } catch (error) {
        console.error('Delete setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete setting',
        });
    }
};

// Seed default settings
const seedDefaults = async (req, res) => {
    try {
        let created = 0;
        let skipped = 0;

        for (const [category, items] of Object.entries(DEFAULT_SETTINGS)) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const [setting, wasCreated] = await SystemSetting.findOrCreate({
                    where: { category, key: item.key },
                    defaults: {
                        label: item.label,
                        icon: item.icon,
                        color: item.color,
                        sort_order: i,
                    },
                });

                if (wasCreated) {
                    created++;
                } else {
                    skipped++;
                }
            }
        }

        res.json({
            success: true,
            message: `Seeded ${created} settings, skipped ${skipped} existing`,
            data: { created, skipped },
        });
    } catch (error) {
        console.error('Seed defaults error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to seed defaults',
        });
    }
};

// Get available categories
const getCategories = async (req, res) => {
    const categories = [
        { key: 'device_types', label: 'Loại thiết bị', description: 'PC, Laptop, Server, Switch, etc.' },
        { key: 'device_statuses', label: 'Trạng thái thiết bị', description: 'Hoạt động, Bảo trì, Loại bỏ' },
        { key: 'system_types', label: 'Loại hệ thống', description: 'O365, VMware, Firewall, etc.' },
        { key: 'environments', label: 'Môi trường', description: 'Production, Staging, Development' },
        { key: 'departments', label: 'Phòng ban', description: 'IT, Kế toán, Nhân sự, etc.' },
    ];

    res.json({
        success: true,
        data: categories,
    });
};

module.exports = {
    getSettings,
    getSettingsByCategory,
    createSetting,
    updateSetting,
    deleteSetting,
    seedDefaults,
    getCategories,
};
