import api from './api';

const BASE_URL = '/sla';

const slaService = {
    // Get all SLA targets
    getTargets: async () => {
        const response = await api.get(`${BASE_URL}/targets`);
        return response.data;
    },

    // Update SLA target (Admin only)
    updateTarget: async (id, data) => {
        const response = await api.put(`${BASE_URL}/targets/${id}`, data);
        return response.data;
    },

    // Get Dashboard Metrics
    getDashboardMetrics: async (params) => {
        const response = await api.get(`${BASE_URL}/dashboard`, { params });
        return response.data;
    }
};

export default slaService;
