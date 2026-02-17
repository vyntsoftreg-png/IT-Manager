const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Document = sequelize.define('Document', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    file_data: {
        type: DataTypes.BLOB('long'),
        allowNull: false,
    },
    file_size: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    file_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    file_extension: {
        type: DataTypes.STRING(10),
        allowNull: false,
    },
    allow_download: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    download_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    view_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    tableName: 'documents',
});

Document.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.file_data;
    return values;
};

module.exports = Document;
