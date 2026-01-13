const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { AdminAccount, Device, User } = require('../models');
const { createAuditLog } = require('../middleware/audit');

// Simple encryption for passwords (using AES-256-CBC)
const ENCRYPTION_KEY_RAW = process.env.ENCRYPTION_KEY || 'itmanager-secret-key-32-chars!!';
// Ensure exactly 32 bytes for AES-256
const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_RAW.padEnd(32, '0').slice(0, 32), 'utf8');
const IV_LENGTH = 16;

const encryptPassword = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decryptPassword = (text) => {
    if (!text) return null;
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
};

// System types for admin accounts
const SYSTEM_TYPES = [
    { value: 'o365', label: 'Microsoft 365', icon: 'windows' },
    { value: 'azure_ad', label: 'Azure AD', icon: 'cloud' },
    { value: 'vmware', label: 'VMware ESXi/vCenter', icon: 'cloud-server' },
    { value: 'firewall', label: 'Firewall (Palo Alto, Fortinet...)', icon: 'safety' },
    { value: 'switch', label: 'Network Switch', icon: 'apartment' },
    { value: 'router', label: 'Router', icon: 'global' },
    { value: 'wifi_controller', label: 'WiFi Controller', icon: 'wifi' },
    { value: 'nas', label: 'NAS/Storage', icon: 'database' },
    { value: 'server_os', label: 'Server OS (Windows/Linux)', icon: 'desktop' },
    { value: 'database', label: 'Database (SQL, MySQL...)', icon: 'table' },
    { value: 'backup', label: 'Backup System', icon: 'save' },
    { value: 'antivirus', label: 'Antivirus/EDR', icon: 'bug' },
    { value: 'monitoring', label: 'Monitoring (Zabbix, PRTG...)', icon: 'line-chart' },
    { value: 'domain', label: 'Domain Registrar', icon: 'global' },
    { value: 'hosting', label: 'Web Hosting/cPanel', icon: 'cloud' },
    { value: 'vpn', label: 'VPN', icon: 'lock' },
    { value: 'other', label: 'Other', icon: 'ellipsis' },
];

const ENVIRONMENTS = [
    { value: 'production', label: 'Production', color: 'red' },
    { value: 'staging', label: 'Staging', color: 'orange' },
    { value: 'development', label: 'Development', color: 'blue' },
    { value: 'testing', label: 'Testing', color: 'purple' },
];

// Get all admin accounts with filtering
const getAccounts = async (req, res) => {
    try {
        const {
            search,
            system_type,
            environment,
            page = 1,
            limit = 20,
            sortBy = 'created_at',
            sortOrder = 'DESC',
        } = req.query;

        const where = {};

        if (search) {
            where[Op.or] = [
                { system_name: { [Op.like]: `%${search}%` } },
                { username: { [Op.like]: `%${search}%` } },
                { admin_url: { [Op.like]: `%${search}%` } },
                { notes: { [Op.like]: `%${search}%` } },
            ];
        }

        if (system_type) {
            where.system_type = system_type;
        }

        if (environment) {
            where.environment = environment;
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await AdminAccount.findAndCountAll({
            where,
            include: [
                {
                    model: Device,
                    as: 'device',
                    attributes: ['id', 'name', 'type', 'hostname'],
                },
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'username', 'display_name'],
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
        console.error('Get accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch admin accounts',
        });
    }
};

// Get single account
const getAccount = async (req, res) => {
    try {
        const account = await AdminAccount.findByPk(req.params.id, {
            include: [
                {
                    model: Device,
                    as: 'device',
                },
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'username', 'display_name'],
                },
            ],
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Admin account not found',
            });
        }

        res.json({
            success: true,
            data: account,
        });
    } catch (error) {
        console.error('Get account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch admin account',
        });
    }
};

// Create admin account
const createAccount = async (req, res) => {
    try {
        const {
            system_name,
            system_type,
            username,
            admin_url,
            environment,
            device_id,
            notes,
        } = req.body;

        if (!system_name || !system_type || !username) {
            return res.status(400).json({
                success: false,
                message: 'System name, type, and username are required',
            });
        }

        // Verify device exists if provided
        if (device_id) {
            const device = await Device.findByPk(device_id);
            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: 'Device not found',
                });
            }
        }

        const account = await AdminAccount.create({
            system_name,
            system_type,
            username,
            encrypted_password: req.body.password ? encryptPassword(req.body.password) : null,
            admin_url,
            environment: environment || 'production',
            device_id: device_id || null,
            owner_id: req.user.id,
            notes,
        });

        await createAuditLog(req.user.id, 'create', 'admin_accounts', account.id, null, account.toJSON(), req);

        // Fetch with relations
        const createdAccount = await AdminAccount.findByPk(account.id, {
            include: [
                { model: Device, as: 'device' },
                { model: User, as: 'owner', attributes: ['id', 'username', 'display_name'] },
            ],
        });

        res.status(201).json({
            success: true,
            data: createdAccount,
            message: 'Admin account created successfully',
        });
    } catch (error) {
        console.error('Create account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create admin account',
        });
    }
};

// Update admin account
const updateAccount = async (req, res) => {
    try {
        const account = await AdminAccount.findByPk(req.params.id);

        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Admin account not found',
            });
        }

        const oldValues = account.toJSON();

        const allowedFields = ['system_name', 'system_type', 'username', 'admin_url', 'environment', 'device_id', 'notes'];
        const updates = {};

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        // Handle password update separately
        if (req.body.password !== undefined) {
            updates.encrypted_password = req.body.password ? encryptPassword(req.body.password) : null;
        }

        await account.update(updates);

        await createAuditLog(req.user.id, 'update', 'admin_accounts', account.id, oldValues, account.toJSON(), req);

        // Fetch with relations
        const updatedAccount = await AdminAccount.findByPk(account.id, {
            include: [
                { model: Device, as: 'device' },
                { model: User, as: 'owner', attributes: ['id', 'username', 'display_name'] },
            ],
        });

        res.json({
            success: true,
            data: updatedAccount,
            message: 'Admin account updated successfully',
        });
    } catch (error) {
        console.error('Update account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update admin account',
        });
    }
};

// Delete admin account
const deleteAccount = async (req, res) => {
    try {
        const account = await AdminAccount.findByPk(req.params.id);

        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Admin account not found',
            });
        }

        const oldValues = account.toJSON();

        await account.destroy();

        await createAuditLog(req.user.id, 'delete', 'admin_accounts', req.params.id, oldValues, null, req);

        res.json({
            success: true,
            message: 'Admin account deleted successfully',
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete admin account',
        });
    }
};

// Get system types dropdown
const getSystemTypes = async (req, res) => {
    res.json({
        success: true,
        data: SYSTEM_TYPES,
    });
};

// Get environments dropdown
const getEnvironments = async (req, res) => {
    res.json({
        success: true,
        data: ENVIRONMENTS,
    });
};

// Get account statistics
const getAccountStats = async (req, res) => {
    try {
        const totalAccounts = await AdminAccount.count();

        const bySystemType = await AdminAccount.findAll({
            attributes: [
                'system_type',
                [require('sequelize').fn('COUNT', '*'), 'count'],
            ],
            group: ['system_type'],
        });

        const byEnvironment = await AdminAccount.findAll({
            attributes: [
                'environment',
                [require('sequelize').fn('COUNT', '*'), 'count'],
            ],
            group: ['environment'],
        });

        res.json({
            success: true,
            data: {
                total: totalAccounts,
                bySystemType: bySystemType.map(item => ({
                    type: item.system_type,
                    label: SYSTEM_TYPES.find(t => t.value === item.system_type)?.label || item.system_type,
                    count: parseInt(item.get('count'), 10),
                })),
                byEnvironment: byEnvironment.map(item => ({
                    environment: item.environment,
                    label: ENVIRONMENTS.find(e => e.value === item.environment)?.label || item.environment,
                    count: parseInt(item.get('count'), 10),
                })),
            },
        });
    } catch (error) {
        console.error('Get account stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch account statistics',
        });
    }
};

// Reveal password with admin verification
const revealPassword = async (req, res) => {
    try {
        const { admin_password } = req.body;

        if (!admin_password) {
            return res.status(400).json({
                success: false,
                message: 'Admin password is required',
            });
        }

        // Verify admin password
        const currentUser = await User.findByPk(req.user.id);
        if (!currentUser) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
            });
        }

        const isPasswordValid = await bcrypt.compare(admin_password, currentUser.password_hash);
        if (!isPasswordValid) {
            await createAuditLog(req.user.id, 'failed_reveal_password', 'admin_accounts', req.params.id, null, null, req);
            return res.status(401).json({
                success: false,
                message: 'Mật khẩu không chính xác',
            });
        }

        // Get the account and decrypt password
        const account = await AdminAccount.findByPk(req.params.id);

        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Admin account not found',
            });
        }

        if (!account.encrypted_password) {
            return res.status(404).json({
                success: false,
                message: 'Tài khoản này không có mật khẩu được lưu',
            });
        }

        const decryptedPassword = decryptPassword(account.encrypted_password);

        // Log the reveal action
        await createAuditLog(req.user.id, 'reveal_password', 'admin_accounts', account.id, null, { revealed: true }, req);

        res.json({
            success: true,
            data: {
                password: decryptedPassword,
            },
        });
    } catch (error) {
        console.error('Reveal password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reveal password',
        });
    }
};

// Export accounts to CSV (with password - requires admin verification)
const exportAccounts = async (req, res) => {
    try {
        const { admin_password } = req.body;

        if (!admin_password) {
            return res.status(400).json({
                success: false,
                message: 'Admin password is required to export accounts with passwords',
            });
        }

        // Verify admin password
        const currentUser = await User.findByPk(req.user.id);
        if (!currentUser) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
            });
        }

        const isPasswordValid = await bcrypt.compare(admin_password, currentUser.password_hash);
        if (!isPasswordValid) {
            await createAuditLog(req.user.id, 'failed_export_accounts', 'admin_accounts', null, null, null, req);
            return res.status(401).json({
                success: false,
                message: 'Mật khẩu không chính xác',
            });
        }

        // Fetch all accounts
        const accounts = await AdminAccount.findAll({
            include: [
                { model: Device, as: 'device', attributes: ['id', 'name'] },
            ],
            order: [['system_type', 'ASC'], ['system_name', 'ASC']],
        });

        // Build CSV content
        const headers = ['system_name', 'system_type', 'username', 'password', 'environment', 'admin_url', 'device_name', 'notes'];
        const csvRows = [headers.join(',')];

        for (const account of accounts) {
            const password = account.encrypted_password ? decryptPassword(account.encrypted_password) : '';
            const row = [
                `"${(account.system_name || '').replace(/"/g, '""')}"`,
                account.system_type || '',
                `"${(account.username || '').replace(/"/g, '""')}"`,
                `"${(password || '').replace(/"/g, '""')}"`,
                account.environment || '',
                `"${(account.admin_url || '').replace(/"/g, '""')}"`,
                `"${(account.device?.name || '').replace(/"/g, '""')}"`,
                `"${(account.notes || '').replace(/"/g, '""')}"`,
            ];
            csvRows.push(row.join(','));
        }

        // Log the export action
        await createAuditLog(req.user.id, 'export_accounts', 'admin_accounts', null, null, { count: accounts.length }, req);

        // Send CSV response
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=admin_accounts_export.csv');
        res.send('\uFEFF' + csvRows.join('\n')); // BOM for Excel UTF-8 compatibility
    } catch (error) {
        console.error('Export accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export accounts',
        });
    }
};

// Import accounts from CSV
const importAccounts = async (req, res) => {
    try {
        const { accounts } = req.body;

        if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No accounts data provided',
            });
        }

        // Get all devices for matching
        const devices = await Device.findAll({ attributes: ['id', 'name'] });
        const deviceMap = {};
        devices.forEach(d => {
            deviceMap[d.name.toLowerCase()] = d.id;
        });

        // PHASE 1: Validate all rows first
        const validationErrors = [];
        const validAccounts = [];
        const validTypes = SYSTEM_TYPES.map(t => t.value);
        const validEnvs = ENVIRONMENTS.map(e => e.value);

        for (let i = 0; i < accounts.length; i++) {
            const row = accounts[i];
            const rowNum = i + 1;
            const rowErrors = [];

            // Check required fields
            if (!row.system_name || !row.system_name.trim()) {
                rowErrors.push('Thiếu tên hệ thống (system_name)');
            }
            if (!row.system_type || !row.system_type.trim()) {
                rowErrors.push('Thiếu loại hệ thống (system_type)');
            } else if (!validTypes.includes(row.system_type)) {
                rowErrors.push(`Loại hệ thống không hợp lệ: "${row.system_type}". Các loại hợp lệ: ${validTypes.join(', ')}`);
            }
            if (!row.username || !row.username.trim()) {
                rowErrors.push('Thiếu tên đăng nhập (username)');
            }

            // Validate environment if provided
            if (row.environment && !validEnvs.includes(row.environment)) {
                rowErrors.push(`Môi trường không hợp lệ: "${row.environment}". Các giá trị hợp lệ: ${validEnvs.join(', ')}`);
            }

            // Validate URL format if provided
            if (row.admin_url && row.admin_url.trim()) {
                try {
                    new URL(row.admin_url);
                } catch {
                    rowErrors.push(`URL không hợp lệ: "${row.admin_url}"`);
                }
            }

            if (rowErrors.length > 0) {
                validationErrors.push({
                    row: rowNum,
                    name: row.system_name || '(không có tên)',
                    errors: rowErrors,
                });
            } else {
                validAccounts.push({ ...row, device_id: row.device_name ? deviceMap[row.device_name.toLowerCase()] || null : null });
            }
        }

        // PHASE 2: If any errors, return them without importing
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Có ${validationErrors.length} dòng lỗi. Vui lòng sửa dữ liệu và thử lại.`,
                errors: validationErrors,
                totalRows: accounts.length,
                errorCount: validationErrors.length,
            });
        }

        // PHASE 3: All rows valid, proceed with import
        const results = {
            created: 0,
            updated: 0,
            errors: [],
        };

        for (const row of validAccounts) {
            try {
                // Check if account exists (match by system_name + system_type + username)
                const existingAccount = await AdminAccount.findOne({
                    where: {
                        system_name: row.system_name,
                        system_type: row.system_type,
                        username: row.username,
                    },
                });

                const accountData = {
                    system_name: row.system_name,
                    system_type: row.system_type,
                    username: row.username,
                    encrypted_password: row.password ? encryptPassword(row.password) : null,
                    environment: row.environment || 'production',
                    admin_url: row.admin_url || null,
                    device_id: row.device_id,
                    notes: row.notes || null,
                };

                if (existingAccount) {
                    // Update existing
                    const oldValues = existingAccount.toJSON();
                    await existingAccount.update(accountData);
                    await createAuditLog(req.user.id, 'update', 'admin_accounts', existingAccount.id, oldValues, existingAccount.toJSON(), req);
                    results.updated++;
                } else {
                    // Create new
                    accountData.owner_id = req.user.id;
                    const newAccount = await AdminAccount.create(accountData);
                    await createAuditLog(req.user.id, 'create', 'admin_accounts', newAccount.id, null, newAccount.toJSON(), req);
                    results.created++;
                }
            } catch (rowError) {
                results.errors.push(rowError.message);
            }
        }

        // Log the import action
        await createAuditLog(req.user.id, 'import_accounts', 'admin_accounts', null, null, results, req);

        res.json({
            success: true,
            message: `Import thành công: ${results.created} tạo mới, ${results.updated} cập nhật!`,
            data: results,
        });
    } catch (error) {
        console.error('Import accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to import accounts',
        });
    }
};

// Get CSV template for import
const getImportTemplate = async (req, res) => {
    const headers = ['system_name', 'system_type', 'username', 'password', 'environment', 'admin_url', 'device_name', 'notes'];
    const exampleRow = ['Example Account', 'firewall', 'admin', 'mypassword123', 'production', 'https://192.168.1.1', 'Firewall-01', 'Notes here'];

    const csv = [
        headers.join(','),
        exampleRow.map(v => `"${v}"`).join(','),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=admin_accounts_template.csv');
    res.send('\uFEFF' + csv);
};

// Bulk delete accounts
const bulkDeleteAccounts = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No account IDs provided',
            });
        }

        // Delete accounts
        const deleted = await AdminAccount.destroy({
            where: { id: ids },
        });

        await createAuditLog(req.user.id, 'bulk_delete', 'admin_accounts', null, { ids }, { deleted }, req);

        res.json({
            success: true,
            deleted,
            message: `Deleted ${deleted} accounts successfully`,
        });
    } catch (error) {
        console.error('Bulk delete accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete accounts',
        });
    }
};

module.exports = {
    getAccounts,
    getAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    bulkDeleteAccounts,
    getSystemTypes,
    getEnvironments,
    getAccountStats,
    revealPassword,
    exportAccounts,
    importAccounts,
    getImportTemplate,
};
