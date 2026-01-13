import api from './api';

export const settingsService = {
    // Get all settings (admin only)
    getSettings: async (category) => {
        const params = category ? { category } : {};
        const response = await api.get('/settings', { params });
        return response.data;
    },

    // Get settings by category (for dropdowns)
    getByCategory: async (category) => {
        const response = await api.get(`/settings/category/${category}`);
        return response.data;
    },

    // Get all categories
    getCategories: async () => {
        const response = await api.get('/settings/categories');
        return response.data;
    },

    // Create setting
    create: async (data) => {
        const response = await api.post('/settings', data);
        return response.data;
    },

    // Update setting
    update: async (id, data) => {
        const response = await api.put(`/settings/${id}`, data);
        return response.data;
    },

    // Delete setting
    delete: async (id) => {
        const response = await api.delete(`/settings/${id}`);
        return response.data;
    },

    // Seed default settings
    seedDefaults: async () => {
        const response = await api.post('/settings/seed');
        return response.data;
    },
};
