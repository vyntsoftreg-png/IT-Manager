const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const AdminAccount = sequelize.define('AdminAccount', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    system_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Display name: e.g., "O365 Global Admin", "Firewall Main"',
    },
    system_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'other',
    },
    username: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    admin_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Admin portal URL',
    },
    environment: {
        type: DataTypes.STRING(20),
        defaultValue: 'production',
    },
    owner_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
        comment: 'User who created/owns this account',
    },
    device_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'devices',
            key: 'id',
        },
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Login instructions, OTP info, etc.',
    },
    encrypted_password: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Encrypted password for the admin account',
    },
}, {
    tableName: 'admin_accounts',
    underscored: true,
    indexes: [
        { fields: ['system_type'] },
        { fields: ['environment'] },
        { fields: ['device_id'] },
        { fields: ['owner_id'] },
    ],
});

module.exports = AdminAccount;
