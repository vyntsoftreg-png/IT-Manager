import api from './api';

const BASE_URL = '/telegram';

export const telegramService = {
    // Get bot token (admin only)
    getBotToken: async () => {
        const response = await api.get(`${BASE_URL}/bot-token`);
        return response.data;
    },

    // Update bot token (admin only)
    updateBotToken: async (botToken) => {
        const response = await api.put(`${BASE_URL}/bot-token`, { bot_token: botToken });
        return response.data;
    },

    // Test bot connection (admin only)
    testBot: async (botToken) => {
        const response = await api.post(`${BASE_URL}/test-bot`, { bot_token: botToken });
        return response.data;
    },

    // Get current user's chat ID
    getMyChatId: async () => {
        const response = await api.get(`${BASE_URL}/my-chat-id`);
        return response.data;
    },

    // Update current user's chat ID
    updateMyChatId: async (chatId) => {
        const response = await api.put(`${BASE_URL}/my-chat-id`, { chat_id: chatId });
        return response.data;
    },

    // Send test message to current user
    sendTestMessage: async () => {
        const response = await api.post(`${BASE_URL}/test-message`);
        return response.data;
    }
};

export default telegramService;
