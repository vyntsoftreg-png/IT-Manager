const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const SystemSetting = sequelize.define('SystemSetting', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    category: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Category: device_types, system_types, device_statuses, environments, departments, locations',
    },
    key: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Unique key within category',
    },
    label: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Display label',
    },
    icon: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Icon name or emoji',
    },
    color: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Color for tags/badges',
    },
    sort_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Order for display',
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    metadata: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Additional JSON data',
        get() {
            const value = this.getDataValue('metadata');
            return value ? JSON.parse(value) : null;
        },
        set(value) {
            this.setDataValue('metadata', value ? JSON.stringify(value) : null);
        },
    },
}, {
    tableName: 'system_settings',
    indexes: [
        { fields: ['category'] },
        { fields: ['category', 'key'], unique: true },
    ],
});

module.exports = SystemSetting;
