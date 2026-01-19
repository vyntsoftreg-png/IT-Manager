const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const TaskComment = sequelize.define('TaskComment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    task_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'tasks',
            key: 'id',
        },
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    is_internal: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'If true, only IT staff can see this comment',
    },
}, {
    tableName: 'task_comments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = TaskComment;
