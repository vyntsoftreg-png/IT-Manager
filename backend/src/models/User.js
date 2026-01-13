const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    display_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    role: {
        type: DataTypes.ENUM('admin', 'it_ops', 'viewer'),
        defaultValue: 'viewer',
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    tableName: 'users',
    hooks: {
        beforeCreate: async (user) => {
            if (user.password_hash) {
                user.password_hash = await bcrypt.hash(user.password_hash, 12);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password_hash')) {
                user.password_hash = await bcrypt.hash(user.password_hash, 12);
            }
        },
    },
});

User.prototype.validatePassword = async function (password) {
    return bcrypt.compare(password, this.password_hash);
};

User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password_hash;
    return values;
};

module.exports = User;
