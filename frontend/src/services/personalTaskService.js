import api from './api';

const BASE_URL = '/personal-tasks';

export const personalTaskService = {
    // Get all tasks with optional filters
    getAll: async (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.category_id) params.append('category_id', filters.category_id);
        if (filters.priority) params.append('priority', filters.priority);
        if (filters.from_date) params.append('from_date', filters.from_date);
        if (filters.to_date) params.append('to_date', filters.to_date);
        if (filters.include_subtasks) params.append('include_subtasks', 'true');

        const queryString = params.toString();
        const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;
        const response = await api.get(url);
        return response.data;
    },

    // Get task by ID
    getById: async (id) => {
        const response = await api.get(`${BASE_URL}/${id}`);
        return response.data;
    },

    // Create new task
    create: async (data) => {
        const response = await api.post(BASE_URL, data);
        return response.data;
    },

    // Update task
    update: async (id, data) => {
        const response = await api.put(`${BASE_URL}/${id}`, data);
        return response.data;
    },

    // Update status only
    updateStatus: async (id, status) => {
        const response = await api.patch(`${BASE_URL}/${id}/status`, { status });
        return response.data;
    },

    // Delete task
    delete: async (id) => {
        const response = await api.delete(`${BASE_URL}/${id}`);
        return response.data;
    },

    // Get statistics
    getStats: async () => {
        const response = await api.get(`${BASE_URL}/stats`);
        return response.data;
    }
};

export default personalTaskService;
