import api from './api';

const taskService = {
    // Get all tasks with filters
    getTasks: async (params = {}) => {
        const response = await api.get('/tasks', { params });
        return response.data;
    },

    // Get single task
    getTask: async (id) => {
        const response = await api.get(`/tasks/${id}`);
        return response.data;
    },

    // Create task
    createTask: async (data) => {
        const response = await api.post('/tasks', data);
        return response.data;
    },

    // Update task
    updateTask: async (id, data) => {
        const response = await api.put(`/tasks/${id}`, data);
        return response.data;
    },

    // Delete task
    deleteTask: async (id) => {
        const response = await api.delete(`/tasks/${id}`);
        return response.data;
    },

    // Assign task
    assignTask: async (id, assignedTo) => {
        const response = await api.put(`/tasks/${id}/assign`, { assigned_to: assignedTo });
        return response.data;
    },

    // Update status
    updateStatus: async (id, status) => {
        const response = await api.put(`/tasks/${id}/status`, { status });
        return response.data;
    },

    // Get comments
    getComments: async (taskId) => {
        const response = await api.get(`/tasks/${taskId}/comments`);
        return response.data;
    },

    // Add comment
    addComment: async (taskId, content, isInternal = false) => {
        const response = await api.post(`/tasks/${taskId}/comments`, { content, is_internal: isInternal });
        return response.data;
    },

    // Delete comment
    deleteComment: async (taskId, commentId) => {
        const response = await api.delete(`/tasks/${taskId}/comments/${commentId}`);
        return response.data;
    },

    // Get statistics
    getStats: async () => {
        const response = await api.get('/tasks/stats');
        return response.data;
    },

    // Get my tasks
    getMyTasks: async () => {
        const response = await api.get('/tasks/my-tasks');
        return response.data;
    },

    // Export tasks
    exportTasks: async (params = {}) => {
        const response = await api.get('/tasks/export', { params });
        return response.data;
    },

    // Submit support request (public - no auth)
    submitSupportRequest: async (data) => {
        const response = await api.post('/support/request', data);
        return response.data;
    },

    // Check request status (public)
    checkStatus: async (taskNumber) => {
        const response = await api.get(`/support/status/${taskNumber}`);
        return response.data;
    },
};

export default taskService;
