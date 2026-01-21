// Backup controller - v1.0
const {
    User,
    Device,
    NetworkSegment,
    IpAddress,
    AdminAccount,
    SystemSetting,
    Task,
    TaskComment,
    AuditLog,
    PingHistory,
    sequelize,
} = require('../models');

// Export database to JSON
const exportDatabase = async (req, res) => {
    try {
        // Fetch all data from each table
        const [
            users,
            devices,
            networkSegments,
            ipAddresses,
            adminAccounts,
            systemSettings,
            tasks,
            taskComments,
        ] = await Promise.all([
            User.findAll({ raw: true }),
            Device.findAll({ raw: true }),
            NetworkSegment.findAll({ raw: true }),
            IpAddress.findAll({ raw: true }),
            AdminAccount.findAll({ raw: true }), // Passwords are already encrypted
            SystemSetting.findAll({ raw: true }),
            Task.findAll({ raw: true }),
            TaskComment.findAll({ raw: true }),
        ]);

        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            tables: {
                users,
                devices,
                networkSegments,
                ipAddresses,
                adminAccounts,
                systemSettings,
                tasks,
                taskComments,
            },
            metadata: {
                totalRecords: users.length + devices.length + networkSegments.length +
                    ipAddresses.length + adminAccounts.length + systemSettings.length +
                    tasks.length + taskComments.length,
                appVersion: '1.0.0',
            },
        };

        // Set headers for file download
        const filename = `it-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        res.json(exportData);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export database', message: error.message });
    }
};

// Import database from JSON
const importDatabase = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const importData = req.body;

        // Validate import data structure
        if (!importData.version || !importData.tables) {
            throw new Error('Invalid backup file format');
        }

        const { tables } = importData;

        // Disable foreign key checks temporarily (MySQL/MariaDB)
        const dialect = sequelize.getDialect();
        if (dialect === 'mysql' || dialect === 'mariadb') {
            await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
        }

        // Clear existing data - use truncate where possible for speed
        // Order matters for foreign key relationships
        // First delete tables that have FKs to other tables
        await AuditLog.destroy({ where: {}, transaction, force: true });
        await PingHistory.destroy({ where: {}, transaction, force: true });
        await TaskComment.destroy({ where: {}, transaction, force: true });
        await Task.destroy({ where: {}, transaction, force: true });
        await AdminAccount.destroy({ where: {}, transaction, force: true });
        await IpAddress.destroy({ where: {}, transaction, force: true });
        await NetworkSegment.destroy({ where: {}, transaction, force: true });
        await Device.destroy({ where: {}, transaction, force: true });
        await SystemSetting.destroy({ where: {}, transaction, force: true });
        // Note: Not deleting users to preserve current login

        // Import data in order of dependencies
        if (tables.users?.length) {
            for (const user of tables.users) {
                // Remove password_hash from import to not overwrite existing passwords
                const { password_hash, ...userData } = user;
                await User.upsert(userData, {
                    transaction,
                    conflictFields: ['id']
                });
            }
        }

        if (tables.systemSettings?.length) {
            for (const setting of tables.systemSettings) {
                await SystemSetting.upsert(setting, { transaction });
            }
        }

        if (tables.devices?.length) {
            await Device.bulkCreate(tables.devices, {
                transaction,
                ignoreDuplicates: true
            });
        }

        if (tables.networkSegments?.length) {
            await NetworkSegment.bulkCreate(tables.networkSegments, {
                transaction,
                ignoreDuplicates: true
            });
        }

        if (tables.ipAddresses?.length) {
            await IpAddress.bulkCreate(tables.ipAddresses, {
                transaction,
                ignoreDuplicates: true
            });
        }

        if (tables.adminAccounts?.length) {
            await AdminAccount.bulkCreate(tables.adminAccounts, {
                transaction,
                ignoreDuplicates: true
            });
        }

        if (tables.tasks?.length) {
            await Task.bulkCreate(tables.tasks, {
                transaction,
                ignoreDuplicates: true
            });
        }

        if (tables.taskComments?.length) {
            await TaskComment.bulkCreate(tables.taskComments, {
                transaction,
                ignoreDuplicates: true
            });
        }

        // Re-enable foreign key checks
        if (dialect === 'mysql' || dialect === 'mariadb') {
            await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
        }

        await transaction.commit();

        res.json({
            success: true,
            message: 'Database imported successfully',
            imported: {
                users: tables.users?.length || 0,
                devices: tables.devices?.length || 0,
                networkSegments: tables.networkSegments?.length || 0,
                ipAddresses: tables.ipAddresses?.length || 0,
                adminAccounts: tables.adminAccounts?.length || 0,
                systemSettings: tables.systemSettings?.length || 0,
                tasks: tables.tasks?.length || 0,
                taskComments: tables.taskComments?.length || 0,
            },
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Import error:', error);
        res.status(500).json({ error: 'Failed to import database', message: error.message });
    }
};


// Get database info
const getBackupInfo = async (req, res) => {
    try {
        const [
            usersCount,
            devicesCount,
            networkSegmentsCount,
            ipAddressesCount,
            adminAccountsCount,
            systemSettingsCount,
            tasksCount,
            taskCommentsCount,
        ] = await Promise.all([
            User.count(),
            Device.count(),
            NetworkSegment.count(),
            IpAddress.count(),
            AdminAccount.count(),
            SystemSetting.count(),
            Task.count(),
            TaskComment.count(),
        ]);

        res.json({
            tables: {
                users: usersCount,
                devices: devicesCount,
                networkSegments: networkSegmentsCount,
                ipAddresses: ipAddressesCount,
                adminAccounts: adminAccountsCount,
                systemSettings: systemSettingsCount,
                tasks: tasksCount,
                taskComments: taskCommentsCount,
            },
            totalRecords: usersCount + devicesCount + networkSegmentsCount +
                ipAddressesCount + adminAccountsCount + systemSettingsCount +
                tasksCount + taskCommentsCount,
        });
    } catch (error) {
        console.error('Backup info error:', error);
        res.status(500).json({ error: 'Failed to get backup info', message: error.message });
    }
};

module.exports = {
    exportDatabase,
    importDatabase,
    getBackupInfo,
};
