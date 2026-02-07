const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const PersonalTaskCategory = sequelize.define('PersonalTaskCategory', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    color: {
        type: DataTypes.STRING(7),
        defaultValue: '#1677ff',
    },
    icon: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
}, {
    tableName: 'personal_task_categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = PersonalTaskCategory;
