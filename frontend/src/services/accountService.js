import api from './api';

export const accountService = {
    // Get all accounts with filtering
    getAccounts: async (params = {}) => {
        const response = await api.get('/accounts', { params });
        return response.data;
    },

    // Get single account
    getAccount: async (id) => {
        const response = await api.get(`/accounts/${id}`);
        return response.data;
    },

    // Create new account
    createAccount: async (data) => {
        const response = await api.post('/accounts', data);
        return response.data;
    },

    // Update account
    updateAccount: async (id, data) => {
        const response = await api.put(`/accounts/${id}`, data);
        return response.data;
    },

    // Delete account
    deleteAccount: async (id) => {
        const response = await api.delete(`/accounts/${id}`);
        return response.data;
    },

    // Get system types dropdown
    getSystemTypes: async () => {
        const response = await api.get('/accounts/system-types');
        return response.data;
    },

    // Get environments dropdown
    getEnvironments: async () => {
        const response = await api.get('/accounts/environments');
        return response.data;
    },

    // Get statistics
    getAccountStats: async () => {
        const response = await api.get('/accounts/stats');
        return response.data;
    },

    // Reveal password with admin verification
    revealPassword: async (id, adminPassword) => {
        const response = await api.post(`/accounts/${id}/reveal-password`, {
            admin_password: adminPassword,
        });
        return response.data;
    },

    // Export accounts to CSV (requires admin password)
    exportAccounts: async (adminPassword) => {
        const response = await api.post('/accounts/export', {
            admin_password: adminPassword,
        }, {
            responseType: 'blob',
        });
        return response.data;
    },

    // Import accounts from CSV data
    importAccounts: async (accounts) => {
        const response = await api.post('/accounts/import', { accounts });
        return response.data;
    },

    // Download import template
    getImportTemplate: async () => {
        const response = await api.get('/accounts/template', {
            responseType: 'blob',
        });
        return response.data;
    },

    // Bulk delete accounts
    bulkDelete: async (ids) => {
        const response = await api.post('/accounts/bulk-delete', { ids });
        return response.data;
    },
};
