import api from './api';

export const searchService = {
    // Global search across all modules
    search: async (query, limit = 10) => {
        const response = await api.get('/search', { params: { q: query, limit } });
        return response.data;
    },
};
