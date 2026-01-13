const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Device = sequelize.define('Device', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM(
            'pc', 'laptop', 'server', 'vm',
            'switch', 'router', 'firewall', 'access_point',
            'printer', 'camera', 'nas', 'ups', 'other'
        ),
        allowNull: false,
    },
    manufacturer: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    model: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    serial_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    specifications: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON string: CPU, RAM, Storage, etc.',
    },
    hostname: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    mac_address: {
        type: DataTypes.STRING(17),
        allowNull: true,
        validate: {
            is: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^$/,
        },
    },
    location: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Physical location: floor, room, rack',
    },
    department: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    assigned_user: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Name of person using this device',
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'retired', 'spare'),
        defaultValue: 'active',
    },
    purchase_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    warranty_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'devices',
    indexes: [
        { fields: ['name'] },
        { fields: ['type'] },
        { fields: ['status'] },
        { fields: ['department'] },
        { fields: ['assigned_user'] },
    ],
});

module.exports = Device;
