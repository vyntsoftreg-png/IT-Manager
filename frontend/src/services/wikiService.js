import api from './api';

const wikiService = {
    // Get file tree
    getTree: async () => {
        const response = await api.get('/wiki/tree');
        return response.data;
    },

    // Get page content
    getPage: async (path) => {
        const response = await api.get('/wiki/page', { params: { path } });
        return response.data;
    },

    // Save page
    savePage: async (path, content) => {
        const response = await api.post('/wiki/page', { path, content });
        return response.data;
    },

    // Delete page
    deletePage: async (path) => {
        const response = await api.delete('/wiki/page', { params: { path } });
        return response.data;
    },

    // Search
    search: async (query) => {
        const response = await api.get('/wiki/search', { params: { query } });
        return response.data;
    }
};

export default wikiService;
