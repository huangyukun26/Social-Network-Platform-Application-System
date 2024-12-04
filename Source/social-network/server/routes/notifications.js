const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// 获取所有通知
router.get('/', auth, async (req, res) => {
    try {
        const notifications = await Notification.find({ 
            recipient: req.userId,
            isDeleted: false 
        })
        .populate('sender', 'username avatar')
        .populate({
            path: 'post',
            populate: {
                path: 'author',
                select: 'username avatar _id'
            }
        })
        .sort({ createdAt: -1 })
        .limit(50);

        res.json(notifications);
    } catch (error) {
        console.error('获取通知失败:', error);
        res.status(500).json({ message: '获取通知失败' });
    }
});

// 标记单个通知为已读
router.put('/read/:notificationId', auth, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { 
                _id: req.params.notificationId, 
                recipient: req.userId 
            },
            { $set: { isRead: true } },
            { new: true }
        )
        .populate('sender', 'username avatar')
        .populate({
            path: 'post',
            populate: {
                path: 'author',
                select: 'username avatar _id'
            }
        });

        if (!notification) {
            return res.status(404).json({ message: '通知不存在' });
        }

        res.json(notification);
    } catch (error) {
        console.error('更新通知状态失败:', error);
        res.status(500).json({ message: '更新通知状态失败' });
    }
});

// 标记所有通知为已读
router.put('/read-all', auth, async (req, res) => {
    try {
        await Notification.updateMany(
            { 
                recipient: req.userId,
                isRead: false,
                isDeleted: false
            },
            { $set: { isRead: true } }
        );

        res.json({ message: '所有通知已标记为已读' });
    } catch (error) {
        console.error('标记所有通知已读失败:', error);
        res.status(500).json({ message: '操作失败' });
    }
});

// 获取未读通知数量
router.get('/unread-count', auth, async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            recipient: req.userId,
            isRead: false,
            isDeleted: false
        });
        res.json({ count });
    } catch (error) {
        console.error('获取未读通知数量失败:', error);
        res.status(500).json({ message: '获取未读数量失败' });
    }
});

module.exports = router; 