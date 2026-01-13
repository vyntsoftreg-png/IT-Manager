const { AuditLog } = require('../models');

const createAuditLog = async (userId, action, entityType, entityId, oldValues, newValues, req) => {
    try {
        await AuditLog.create({
            user_id: userId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            old_values: oldValues ? JSON.stringify(oldValues) : null,
            new_values: newValues ? JSON.stringify(newValues) : null,
            ip_address: req?.ip || req?.connection?.remoteAddress,
            user_agent: req?.headers?.['user-agent'],
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
    }
};

module.exports = { createAuditLog };
