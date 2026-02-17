import api from './api';

const documentService = {
    getDocuments: async (params = {}) => {
        const response = await api.get('/documents', { params });
        return response.data;
    },

    getDocumentById: async (id) => {
        const response = await api.get(`/documents/${id}`);
        return response.data;
    },

    uploadDocument: async (formData) => {
        const response = await api.post('/documents', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    updateDocument: async (id, data) => {
        const response = await api.put(`/documents/${id}`, data);
        return response.data;
    },

    deleteDocument: async (id) => {
        const response = await api.delete(`/documents/${id}`);
        return response.data;
    },

    downloadDocument: async (id, fileName) => {
        const response = await api.get(`/documents/${id}/download`, {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    getPreviewBlob: async (id, mimeType) => {
        const response = await api.get(`/documents/${id}/preview`, {
            responseType: 'blob',
        });
        const blob = new Blob([response.data], { type: mimeType || 'application/octet-stream' });
        return URL.createObjectURL(blob);
    },

    getStats: async () => {
        const response = await api.get('/documents/stats');
        return response.data;
    },

    getUploaders: async () => {
        const response = await api.get('/documents/uploaders');
        return response.data;
    },
};

export default documentService;
