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

        // Clear existing data in reverse order of dependencies
        await TaskComment.destroy({ where: {}, transaction });
        await Task.destroy({ where: {}, transaction });
        await AdminAccount.destroy({ where: {}, transaction });
        await IpAddress.destroy({ where: {}, transaction });
        await NetworkSegment.destroy({ where: {}, transaction });
        await Device.destroy({ where: {}, transaction });
        await SystemSetting.destroy({ where: {}, transaction });
        // Keep users or handle separately based on requirements
        // For now, we'll update existing users and create new ones

        // Import data in order of dependencies
        if (tables.users?.length) {
            for (const user of tables.users) {
                await User.upsert(user, { transaction });
            }
        }

        if (tables.systemSettings?.length) {
            await SystemSetting.bulkCreate(tables.systemSettings, {
                transaction,
                ignoreDuplicates: true
            });
        }

        if (tables.devices?.length) {
            await Device.bulkCreate(tables.devices, { transaction });
        }

        if (tables.networkSegments?.length) {
            await NetworkSegment.bulkCreate(tables.networkSegments, { transaction });
        }

        if (tables.ipAddresses?.length) {
            await IpAddress.bulkCreate(tables.ipAddresses, { transaction });
        }

        if (tables.adminAccounts?.length) {
            await AdminAccount.bulkCreate(tables.adminAccounts, { transaction });
        }

        if (tables.tasks?.length) {
            await Task.bulkCreate(tables.tasks, { transaction });
        }

        if (tables.taskComments?.length) {
            await TaskComment.bulkCreate(tables.taskComments, { transaction });
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
