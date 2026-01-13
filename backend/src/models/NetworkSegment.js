const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const NetworkSegment = sequelize.define('NetworkSegment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    vlan_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    cidr: {
        type: DataTypes.STRING(18),
        allowNull: false,
        comment: 'CIDR notation: e.g., 192.168.1.0/24',
    },
    gateway: {
        type: DataTypes.STRING(15),
        allowNull: true,
    },
    dns_primary: {
        type: DataTypes.STRING(15),
        allowNull: true,
    },
    dns_secondary: {
        type: DataTypes.STRING(15),
        allowNull: true,
    },
    tags: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Comma-separated tags: office, server, wifi, dmz',
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'network_segments',
    indexes: [
        { fields: ['name'] },
        { fields: ['vlan_id'] },
    ],
});

module.exports = NetworkSegment;
