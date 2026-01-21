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
    let transaction;

    try {
        const importData = req.body;

        // Validate import data structure
        if (!importData.version || !importData.tables) {
            return res.status(400).json({
                success: false,
                error: 'Invalid backup file format',
                message: 'Backup file must contain version and tables properties'
            });
        }

        const { tables } = importData;
        const dialect = sequelize.getDialect();

        // Disable foreign key checks based on dialect
        if (dialect === 'mysql' || dialect === 'mariadb') {
            await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        } else if (dialect === 'sqlite') {
            await sequelize.query('PRAGMA foreign_keys = OFF');
        }

        // Start transaction after disabling FK checks
        transaction = await sequelize.transaction();

        // Clear existing data - order matters for foreign key relationships
        // Delete child tables first
        console.log('Clearing existing data...');

        try {
            await AuditLog.destroy({ where: {}, transaction, truncate: dialect !== 'sqlite' });
        } catch (e) { console.log('AuditLog clear:', e.message); }

        try {
            await PingHistory.destroy({ where: {}, transaction, truncate: dialect !== 'sqlite' });
        } catch (e) { console.log('PingHistory clear:', e.message); }

        await TaskComment.destroy({ where: {}, transaction });
        await Task.destroy({ where: {}, transaction });
        await AdminAccount.destroy({ where: {}, transaction });
        await IpAddress.destroy({ where: {}, transaction });
        await NetworkSegment.destroy({ where: {}, transaction });
        await Device.destroy({ where: {}, transaction });

        try {
            await SystemSetting.destroy({ where: {}, transaction });
        } catch (e) { console.log('SystemSetting clear:', e.message); }

        console.log('Importing data...');

        // Import users first (they are referenced by other tables)
        if (tables.users?.length) {
            console.log(`Importing ${tables.users.length} users...`);
            for (const user of tables.users) {
                try {
                    // Skip password to not overwrite existing user passwords
                    const existingUser = await User.findByPk(user.id, { transaction });
                    if (existingUser) {
                        // Update existing user but preserve password
                        const { password_hash, ...updateData } = user;
                        await existingUser.update(updateData, { transaction });
                    } else {
                        // Create new user with password
                        await User.create(user, { transaction });
                    }
                } catch (e) {
                    console.log(`User ${user.id} import error:`, e.message);
                }
            }
        }

        // Import system settings
        if (tables.systemSettings?.length) {
            console.log(`Importing ${tables.systemSettings.length} settings...`);
            for (const setting of tables.systemSettings) {
                try {
                    await SystemSetting.upsert(setting, { transaction });
                } catch (e) {
                    console.log(`Setting import error:`, e.message);
                }
            }
        }

        // Import devices
        if (tables.devices?.length) {
            console.log(`Importing ${tables.devices.length} devices...`);
            for (const device of tables.devices) {
                try {
                    await Device.create(device, { transaction });
                } catch (e) {
                    console.log(`Device ${device.id} import error:`, e.message);
                }
            }
        }

        // Import network segments
        if (tables.networkSegments?.length) {
            console.log(`Importing ${tables.networkSegments.length} segments...`);
            for (const segment of tables.networkSegments) {
                try {
                    await NetworkSegment.create(segment, { transaction });
                } catch (e) {
                    console.log(`Segment ${segment.id} import error:`, e.message);
                }
            }
        }

        // Import IP addresses
        if (tables.ipAddresses?.length) {
            console.log(`Importing ${tables.ipAddresses.length} IPs...`);
            for (const ip of tables.ipAddresses) {
                try {
                    await IpAddress.create(ip, { transaction });
                } catch (e) {
                    console.log(`IP ${ip.id} import error:`, e.message);
                }
            }
        }

        // Import admin accounts
        if (tables.adminAccounts?.length) {
            console.log(`Importing ${tables.adminAccounts.length} accounts...`);
            for (const account of tables.adminAccounts) {
                try {
                    await AdminAccount.create(account, { transaction });
                } catch (e) {
                    console.log(`Account ${account.id} import error:`, e.message);
                }
            }
        }

        // Import tasks
        if (tables.tasks?.length) {
            console.log(`Importing ${tables.tasks.length} tasks...`);
            for (const task of tables.tasks) {
                try {
                    await Task.create(task, { transaction });
                } catch (e) {
                    console.log(`Task ${task.id} import error:`, e.message);
                }
            }
        }

        // Import task comments
        if (tables.taskComments?.length) {
            console.log(`Importing ${tables.taskComments.length} comments...`);
            for (const comment of tables.taskComments) {
                try {
                    await TaskComment.create(comment, { transaction });
                } catch (e) {
                    console.log(`Comment ${comment.id} import error:`, e.message);
                }
            }
        }

        await transaction.commit();
        console.log('Import completed successfully');

        // Re-enable foreign key checks
        if (dialect === 'mysql' || dialect === 'mariadb') {
            await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        } else if (dialect === 'sqlite') {
            await sequelize.query('PRAGMA foreign_keys = ON');
        }

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
        console.error('Import error:', error);

        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error('Rollback error:', rollbackError);
            }
        }

        // Re-enable foreign key checks even on error
        const dialect = sequelize.getDialect();
        try {
            if (dialect === 'mysql' || dialect === 'mariadb') {
                await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
            } else if (dialect === 'sqlite') {
                await sequelize.query('PRAGMA foreign_keys = ON');
            }
        } catch (e) { /* ignore */ }

        res.status(500).json({
            success: false,
            error: 'Failed to import database',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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
