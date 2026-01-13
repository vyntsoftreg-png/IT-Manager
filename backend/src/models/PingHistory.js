const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const PingHistory = sequelize.define('PingHistory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    ip_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'ip_addresses',
            key: 'id',
        },
    },
    ip_address: {
        type: DataTypes.STRING(15),
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('online', 'offline', 'timeout', 'error'),
        allowNull: false,
    },
    response_time: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Response time in milliseconds',
    },
    mac_address: {
        type: DataTypes.STRING(17),
        allowNull: true,
        comment: 'MAC address detected from ARP cache (format: XX:XX:XX:XX:XX:XX)',
    },
    previous_mac: {
        type: DataTypes.STRING(17),
        allowNull: true,
        comment: 'Previous MAC address if changed (for conflict detection)',
    },
    has_conflict: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'True if MAC address conflict detected',
    },
    checked_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'ping_history',
    timestamps: false,
    indexes: [
        { fields: ['ip_id'] },
        { fields: ['ip_address'] },
        { fields: ['checked_at'] },
        { fields: ['mac_address'] },
        { fields: ['has_conflict'] },
    ],
});

module.exports = PingHistory;
