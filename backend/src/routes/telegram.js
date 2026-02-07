const express = require('express');
const router = express.Router();
const { SystemSetting, User } = require('../models');
const telegramService = require('../services/telegramService');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// GET /api/telegram/bot-token - Get bot token (admin only)
router.get('/bot-token', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const setting = await SystemSetting.findOne({
            where: { category: 'telegram', key: 'bot_token' }
        });

        res.json({
            success: true,
            data: {
                bot_token: setting?.label || '',
                is_configured: !!setting?.label
            }
        });
    } catch (error) {
        console.error('Get bot token error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy Bot Token' });
    }
});

// PUT /api/telegram/bot-token - Update bot token (admin only)
router.put('/bot-token', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { bot_token } = req.body;

        if (!bot_token) {
            return res.status(400).json({ success: false, message: 'Bot Token là bắt buộc' });
        }

        // Test the bot token first
        const testResult = await telegramService.testBotConnection(bot_token);
        if (!testResult.success) {
            return res.status(400).json({
                success: false,
                message: `Bot Token không hợp lệ: ${testResult.error}`
            });
        }

        // Save/update bot token
        const [setting, created] = await SystemSetting.findOrCreate({
            where: { category: 'telegram', key: 'bot_token' },
            defaults: {
                category: 'telegram',
                key: 'bot_token',
                label: bot_token,
                icon: '🤖'
            }
        });

        if (!created) {
            await setting.update({ label: bot_token });
        }

        res.json({
            success: true,
            message: 'Đã lưu Bot Token thành công',
            data: { botInfo: testResult.botInfo }
        });
    } catch (error) {
        console.error('Update bot token error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lưu Bot Token' });
    }
});

// POST /api/telegram/test-bot - Test bot connection (admin only)
router.post('/test-bot', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { bot_token } = req.body;
        const tokenToTest = bot_token || (await telegramService.getBotToken());

        if (!tokenToTest) {
            return res.status(400).json({ success: false, message: 'Bot Token chưa được cấu hình' });
        }

        const result = await telegramService.testBotConnection(tokenToTest);
        res.json(result);
    } catch (error) {
        console.error('Test bot error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi test Bot' });
    }
});

// GET /api/telegram/my-chat-id - Get current user's chat ID
router.get('/my-chat-id', async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        res.json({
            success: true,
            data: {
                telegram_chat_id: user?.telegram_chat_id || '',
                is_configured: !!user?.telegram_chat_id
            }
        });
    } catch (error) {
        console.error('Get chat ID error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy Chat ID' });
    }
});

// PUT /api/telegram/my-chat-id - Update current user's chat ID
router.put('/my-chat-id', async (req, res) => {
    try {
        const { chat_id } = req.body;
        console.log('[Telegram] PUT /my-chat-id - User:', req.user?.id, 'Chat ID:', chat_id);

        if (!chat_id) {
            return res.status(400).json({ success: false, message: 'Chat ID là bắt buộc' });
        }

        const user = await User.findByPk(req.user.id);
        console.log('[Telegram] Found user:', user?.id, 'Current chat_id:', user?.telegram_chat_id);

        await user.update({ telegram_chat_id: chat_id });
        console.log('[Telegram] Updated user chat_id to:', chat_id);

        res.json({
            success: true,
            message: 'Đã lưu Chat ID thành công'
        });
    } catch (error) {
        console.error('Update chat ID error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lưu Chat ID' });
    }
});

// POST /api/telegram/test-message - Send test message to current user
router.post('/test-message', async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);

        if (!user?.telegram_chat_id) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập Chat ID trước khi test'
            });
        }

        const result = await telegramService.sendTestMessage(user.telegram_chat_id);

        if (result.success) {
            res.json({ success: true, message: 'Đã gửi tin nhắn test!' });
        } else {
            res.status(400).json({
                success: false,
                message: `Lỗi: ${result.error}`
            });
        }
    } catch (error) {
        console.error('Send test message error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi gửi tin nhắn test' });
    }
});

module.exports = router;
