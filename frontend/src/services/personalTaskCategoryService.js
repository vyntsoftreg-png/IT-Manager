import api from './api';

const BASE_URL = '/personal-task-categories';

export const personalTaskCategoryService = {
    // Get all categories
    getAll: async () => {
        const response = await api.get(BASE_URL);
        return response.data;
    },

    // Create category
    create: async (data) => {
        const response = await api.post(BASE_URL, data);
        return response.data;
    },

    // Update category
    update: async (id, data) => {
        const response = await api.put(`${BASE_URL}/${id}`, data);
        return response.data;
    },

    // Delete category
    delete: async (id) => {
        const response = await api.delete(`${BASE_URL}/${id}`);
        return response.data;
    }
};

export default personalTaskCategoryService;
