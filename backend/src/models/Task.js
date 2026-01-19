const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Task = sequelize.define('Task', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    task_number: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true,
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    category: {
        type: DataTypes.ENUM('hardware', 'software', 'network', 'email', 'account', 'other'),
        defaultValue: 'other',
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium',
    },
    status: {
        type: DataTypes.ENUM('open', 'in_progress', 'pending', 'resolved', 'closed'),
        defaultValue: 'open',
    },
    requester_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    requester_email: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    requester_phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    requester_department: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    requester_location: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    assigned_to: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    due_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    resolved_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
}, {
    tableName: 'tasks',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = Task;
