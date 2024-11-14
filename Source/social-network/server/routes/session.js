const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const RedisClient = require('../utils/RedisClient');

// 获取当前用户的所有会话
router.get('/sessions', auth, async (req, res) => {
    try {
        const sessions = await RedisClient.getUserSessions(req.userId);
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: '获取会话信息失败' });
    }
});

// 删除指定会话（登出其他设备）
router.delete('/sessions/:sessionId', auth, async (req, res) => {
    try {
        await RedisClient.removeSession(req.userId, req.params.sessionId);
        res.json({ message: '会话已删除' });
    } catch (error) {
        res.status(500).json({ message: '删除会话失败' });
    }
});

module.exports = router; 