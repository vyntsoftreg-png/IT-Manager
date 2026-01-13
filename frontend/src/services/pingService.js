import api from './api';

export const pingService = {
    // Ping all IPs in a segment
    pingSegment: async (segmentId) => {
        const response = await api.post(`/ping/segment/${segmentId}`);
        return response.data;
    },

    // Get latest ping status for segment
    getLatestStatus: async (segmentId) => {
        const response = await api.get(`/ping/segment/${segmentId}/latest`);
        return response.data;
    },

    // Ping single IP
    pingIp: async (ipId) => {
        const response = await api.post(`/ping/ip/${ipId}`);
        return response.data;
    },

    // Get ping history for an IP
    getHistory: async (ipId, options = {}) => {
        const params = {};
        if (options.limit) params.limit = options.limit;
        if (options.from) params.from = options.from;
        if (options.to) params.to = options.to;

        const response = await api.get(`/ping/ip/${ipId}/history`, { params });
        return response.data;
    },

    // Get all latest ping status (for devices page)
    getAllLatestStatus: async () => {
        const response = await api.get('/ping/latest');
        return response.data;
    },
};
