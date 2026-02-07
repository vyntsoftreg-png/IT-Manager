const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const PersonalTask = sequelize.define('PersonalTask', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    category_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'personal_task_categories',
            key: 'id',
        },
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        defaultValue: 'medium',
    },
    status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
        defaultValue: 'pending',
    },
    due_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    recurring_type: {
        type: DataTypes.ENUM('none', 'daily', 'weekly', 'monthly'),
        defaultValue: 'none',
    },
    recurring_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    parent_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'personal_tasks',
            key: 'id',
        },
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    reminder_sent_3d: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    reminder_sent_1d: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'personal_tasks',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = PersonalTask;
