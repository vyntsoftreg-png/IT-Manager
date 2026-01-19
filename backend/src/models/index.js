const sequelize = require('../database/connection');
const User = require('./User');
const Device = require('./Device');
const NetworkSegment = require('./NetworkSegment');
const IpAddress = require('./IpAddress');
const AdminAccount = require('./AdminAccount');
const AuditLog = require('./AuditLog');
const SystemSetting = require('./SystemSetting');
const PingHistory = require('./PingHistory');
const Task = require('./Task');
const TaskComment = require('./TaskComment');

// Define associations

// NetworkSegment has many IpAddresses
NetworkSegment.hasMany(IpAddress, {
    foreignKey: 'segment_id',
    as: 'ipAddresses',
});
IpAddress.belongsTo(NetworkSegment, {
    foreignKey: 'segment_id',
    as: 'segment',
});

// Device has many IpAddresses
Device.hasMany(IpAddress, {
    foreignKey: 'device_id',
    as: 'ipAddresses',
});
IpAddress.belongsTo(Device, {
    foreignKey: 'device_id',
    as: 'device',
});

// Device has many AdminAccounts
Device.hasMany(AdminAccount, {
    foreignKey: 'device_id',
    as: 'adminAccounts',
});
AdminAccount.belongsTo(Device, {
    foreignKey: 'device_id',
    as: 'device',
});

// AdminAccount belongs to User (owner)
User.hasMany(AdminAccount, {
    foreignKey: 'owner_id',
    as: 'ownedAccounts',
});
AdminAccount.belongsTo(User, {
    foreignKey: 'owner_id',
    as: 'owner',
});

// User reserved IpAddresses
User.hasMany(IpAddress, {
    foreignKey: 'reserved_by',
    as: 'reservedIps',
});
IpAddress.belongsTo(User, {
    foreignKey: 'reserved_by',
    as: 'reservedByUser',
});

// AuditLog belongs to User
User.hasMany(AuditLog, {
    foreignKey: 'user_id',
    as: 'auditLogs',
});
AuditLog.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
});

// Task associations
User.hasMany(Task, {
    foreignKey: 'assigned_to',
    as: 'assignedTasks',
});
Task.belongsTo(User, {
    foreignKey: 'assigned_to',
    as: 'assignee',
});

User.hasMany(Task, {
    foreignKey: 'created_by',
    as: 'createdTasks',
});
Task.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator',
});

// TaskComment associations
Task.hasMany(TaskComment, {
    foreignKey: 'task_id',
    as: 'comments',
});
TaskComment.belongsTo(Task, {
    foreignKey: 'task_id',
    as: 'task',
});

User.hasMany(TaskComment, {
    foreignKey: 'user_id',
    as: 'taskComments',
});
TaskComment.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
});

module.exports = {
    sequelize,
    User,
    Device,
    NetworkSegment,
    IpAddress,
    AdminAccount,
    AuditLog,
    SystemSetting,
    PingHistory,
    Task,
    TaskComment,
};
