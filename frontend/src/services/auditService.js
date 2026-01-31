import api from './api';

export const auditService = {
    // Get audit logs with filters
    getLogs: async (params = {}) => {
        const response = await api.get('/audit', { params });
        return response.data;
    },

    // Export audit logs
    exportLogs: async (params = {}) => {
        const response = await api.get('/audit/export', {
            params,
            responseType: 'blob', // Important for file download
        });
        return response.data;
    },

    // Get single log detail
    getLog: async (id) => {
        const response = await api.get(`/audit/${id}`);
        return response.data;
    },

    // Get available actions
    getActions: async () => {
        const response = await api.get('/audit/actions');
        return response.data;
    },

    // Get entity types
    getEntityTypes: async () => {
        const response = await api.get('/audit/entity-types');
        return response.data;
    },

    // Get audit statistics
    getStats: async () => {
        const response = await api.get('/audit/stats');
        return response.data;
    },
};
