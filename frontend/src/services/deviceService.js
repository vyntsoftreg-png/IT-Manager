import api from './api';

export const deviceService = {
    // Get all devices with filters
    getDevices: async (params = {}) => {
        const response = await api.get('/devices', { params });
        return response.data;
    },

    // Get single device by ID
    getDevice: async (id) => {
        const response = await api.get(`/devices/${id}`);
        return response.data;
    },

    // Create new device
    createDevice: async (data) => {
        const response = await api.post('/devices', data);
        return response.data;
    },

    // Update device
    updateDevice: async (id, data) => {
        const response = await api.put(`/devices/${id}`, data);
        return response.data;
    },

    // Delete device
    deleteDevice: async (id) => {
        const response = await api.delete(`/devices/${id}`);
        return response.data;
    },

    // Get device types
    getDeviceTypes: async () => {
        const response = await api.get('/devices/types');
        return response.data;
    },

    // Get device statuses
    getDeviceStatuses: async () => {
        const response = await api.get('/devices/statuses');
        return response.data;
    },

    // Get device statistics
    getDeviceStats: async () => {
        const response = await api.get('/devices/stats');
        return response.data;
    },

    // Export devices to CSV
    exportCSV: async () => {
        const response = await api.get('/devices/export/csv', {
            responseType: 'blob',
        });
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'devices_export.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    // Import devices from CSV data
    importCSV: async (devices) => {
        const response = await api.post('/devices/import/csv', { devices });
        return response.data;
    },

    // Bulk delete devices
    bulkDelete: async (ids) => {
        const response = await api.post('/devices/bulk-delete', { ids });
        return response.data;
    },
};
