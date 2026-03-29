import api from './api';

const portalService = {
    // Submit a support request (public)
    submitRequest: async (data) => {
        const response = await api.post('/support/request', data);
        return response.data;
    },

    // Search tickets by number or email (public)
    searchTickets: async (query) => {
        const response = await api.get('/support/search', { params: { q: query } });
        return response.data;
    },

    // Get single ticket detail with timeline (public)
    getTicketDetail: async (taskNumber) => {
        const response = await api.get(`/support/status/${taskNumber}`);
        return response.data;
    },

    // Submit rating (public)
    submitRating: async (taskNumber, rating, comment, email) => {
        const response = await api.post(`/support/rating/${taskNumber}`, {
            rating,
            comment,
            email,
        });
        return response.data;
    },

    // Get KB article tree (public)
    getKbTree: async () => {
        const response = await api.get('/support/kb/tree');
        return response.data;
    },

    // Get KB article content (public)
    getKbPage: async (path) => {
        const response = await api.get('/support/kb/page', { params: { path } });
        return response.data;
    },
};

export default portalService;
