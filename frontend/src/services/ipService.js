import api from './api';

export const ipService = {
    // Get IPs with filtering
    getIpAddresses: async (params = {}) => {
        const response = await api.get('/ips', { params });
        return response.data;
    },

    // Get single IP
    getIpAddress: async (id) => {
        const response = await api.get(`/ips/${id}`);
        return response.data;
    },

    // Update IP
    updateIpAddress: async (id, data) => {
        const response = await api.put(`/ips/${id}`, data);
        return response.data;
    },

    // Find free IPs
    findFreeIps: async (segmentId, count = 10) => {
        const response = await api.get('/ips/find-free', {
            params: { segment_id: segmentId, count },
        });
        return response.data;
    },

    // Assign IP to device
    assignIpToDevice: async (ipId, data) => {
        const response = await api.post(`/ips/${ipId}/assign`, data);
        return response.data;
    },

    // Release IP
    releaseIp: async (ipId) => {
        const response = await api.post(`/ips/${ipId}/release`);
        return response.data;
    },

    // Get IP statuses
    getIpStatuses: async () => {
        const response = await api.get('/ips/statuses');
        return response.data;
    },
};
