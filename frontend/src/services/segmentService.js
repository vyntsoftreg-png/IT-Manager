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

    // Export segment IPs to Excel
    exportSegment: async (id) => {
        const response = await api.get(`/segments/${id}/export`, {
            responseType: 'blob',
        });
        // Extract filename from Content-Disposition header
        const disposition = response.headers['content-disposition'];
        let fileName = `segment_${id}.xlsx`;
        if (disposition) {
            const match = disposition.match(/filename="?([^";\n]+)"?/);
            if (match) fileName = match[1];
        }
        // Trigger browser download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    // Import IPs from Excel file
    importSegment: async (id, file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(`/segments/${id}/import`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
};

