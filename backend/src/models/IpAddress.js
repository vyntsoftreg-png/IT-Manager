const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const IpAddress = sequelize.define('IpAddress', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    segment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'network_segments',
            key: 'id',
        },
    },
    ip_address: {
        type: DataTypes.STRING(15),
        allowNull: false,
        unique: true,
    },
    status: {
        type: DataTypes.ENUM('free', 'reserved', 'in_use', 'blocked', 'gateway'),
        defaultValue: 'free',
    },
    hostname: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    mac_address: {
        type: DataTypes.STRING(17),
        allowNull: true,
    },
    device_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'devices',
            key: 'id',
        },
    },
    reserved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    reserved_until: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'ip_addresses',
    indexes: [
        { fields: ['ip_address'], unique: true },
        { fields: ['segment_id'] },
        { fields: ['status'] },
        { fields: ['device_id'] },
    ],
});

module.exports = IpAddress;
