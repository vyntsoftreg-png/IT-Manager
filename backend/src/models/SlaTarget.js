const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const SlaTarget = sequelize.define('SlaTarget', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        unique: true,
    },
    response_time_hours: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 24.0,
        comment: 'Target response time in hours',
    },
    resolution_time_hours: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 48.0,
        comment: 'Target resolution time in hours',
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    tableName: 'sla_targets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = SlaTarget;
