import api from './api';

export const segmentService = {
    // Get all segments with stats
    getSegments: async (params = {}) => {
        const response = await api.get('/segments', { params });
        return response.data;
    },

    // Get single segment
    getSegment: async (id) => {
        const response = await api.get(`/segments/${id}`);
        return response.data;
    },

    // Create new segment (generates IPs automatically)
    createSegment: async (data) => {
        const response = await api.post('/segments', data);
        return response.data;
    },

    // Update segment
    updateSegment: async (id, data) => {
        const response = await api.put(`/segments/${id}`, data);
        return response.data;
    },

    // Delete segment
    deleteSegment: async (id) => {
        const response = await api.delete(`/segments/${id}`);
        return response.data;
    },

    // Get segment statistics
    getSegmentStats: async () => {
        const response = await api.get('/segments/stats');
        return response.data;
    },
};
