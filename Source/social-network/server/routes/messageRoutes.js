const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/auth');
const KafkaService = require('../services/kafkaService');

router.use(authMiddleware);

// 基础消息路由
router.post('/send', messageController.sendMessage);
router.get('/history/:userId', messageController.getChatHistory);
router.put('/read/:senderId', messageController.markAsRead);
router.get('/unread', messageController.getUnreadCount);
router.get('/recent', messageController.getRecentChats);
router.get('/search', messageController.searchMessages);
router.delete('/:messageId', messageController.deleteMessage);

// 群聊相关路由
router.post('/group', messageController.createGroupChat);
router.get('/group/:groupId', messageController.getGroupMessages);
router.post('/group/:groupId/members', messageController.addGroupMembers);
router.delete('/group/:groupId/members/:memberId', messageController.removeGroupMember);

// 消息操作路由
router.post('/forward', messageController.forwardMessage);
router.post('/:messageId/recall', messageController.recallMessage);
router.post('/:messageId/read', messageController.markMessageRead);
router.get('/typing/:userId', messageController.sendTypingStatus);

// Kafka 测试路由
router.post('/test-kafka', async (req, res) => {
    try {
        await KafkaService.sendMessage({
            messageId: 'test-' + Date.now(),
            sender: 'test-sender',
            receiver: 'test-receiver',
            content: 'Test message from API',
            type: 'text',
            timestamp: new Date()
        });

        await KafkaService.sendNotification({
            userId: 'test-user',
            type: 'test',
            data: {
                message: 'Test notification',
                timestamp: new Date()
            }
        });

        res.json({ 
            success: true,
            message: 'Kafka test messages sent successfully',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Kafka test failed:', error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Kafka 状态检查路由
router.get('/kafka-status', async (req, res) => {
    try {
        const status = {
            producer: KafkaService.producer?.isConnected() || false,
            consumers: {},
            topics: {}
        };

        for (const [topic, consumer] of KafkaService.consumers.entries()) {
            status.consumers[topic] = consumer?.isRunning() || false;
        }

        res.json({
            success: true,
            status,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Kafka status check failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;