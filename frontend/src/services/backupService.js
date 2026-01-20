import api from './api';

const backupService = {
    // Get database info/stats
    getInfo: async () => {
        const response = await api.get('/backup/info');
        return response.data;
    },

    // Export database - returns JSON data
    exportDatabase: async () => {
        const response = await api.get('/backup/export');
        return response.data;
    },

    // Import database from JSON
    importDatabase: async (data) => {
        const response = await api.post('/backup/import', data);
        return response.data;
    },
};

export default backupService;
