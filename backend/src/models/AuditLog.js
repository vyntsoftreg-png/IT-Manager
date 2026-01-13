const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    action: {
        type: DataTypes.ENUM('create', 'update', 'delete', 'view', 'login', 'logout'),
        allowNull: false,
    },
    entity_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Table name: devices, ip_addresses, admin_accounts, etc.',
    },
    entity_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    old_values: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON string of old values',
    },
    new_values: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON string of new values',
    },
    ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'Client IP address',
    },
    user_agent: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
}, {
    tableName: 'audit_logs',
    indexes: [
        { fields: ['user_id'] },
        { fields: ['entity_type'] },
        { fields: ['action'] },
        { fields: ['created_at'] },
    ],
    updatedAt: false,
});

module.exports = AuditLog;
