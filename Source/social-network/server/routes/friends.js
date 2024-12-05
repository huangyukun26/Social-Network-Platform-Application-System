const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const friendController = require('../controllers/friendController');
const User = require('../models/User');
const RedisClient = require('../utils/RedisClient');
const Neo4jService = require('../services/neo4jService');
const DataSyncService = require('../services/DataSyncService');
const FriendRequest = require('../models/FriendRequest');

// 修改好友隐私检查中间件
const checkFriendPrivacy = async (req, res, next) => {
    try {
        const targetUser = await User.findById(req.params.userId);
        const requestingUser = await User.findById(req.userId);

        if (!targetUser || !requestingUser) {
            return res.status(404).json({ message: '用户不存在' });
        }

        // 如果是查看自己的信息，直接通过
        if (targetUser._id.toString() === requestingUser._id.toString()) {
            return next();
        }

        // 检查是否是好友关系
        const areFriends = requestingUser.friends?.includes(targetUser._id);

        // 如果是好友，允许访问
        if (areFriends) {
            req.isFriend = true;
            return next();
        }

        // 如果是私密账户，返回基本状态而不是403错误
        if (targetUser.privacy?.profileVisibility === 'private') {
            return res.json({ 
                status: 'none',
                isPrivate: true,
                message: '该用户是私密账户'
            });
        }

        next();
    } catch (error) {
        console.error('检查好友隐私设置失败:', error);
        // 返回基本状态而不是500错误
        res.json({ 
            status: 'none',
            error: true,
            message: '获取状态失败'
        });
    }
};

// 获取好友请求列表
router.get('/requests', auth, friendController.getFriendRequests);

// 获取好友列表
router.get('/', auth, friendController.getFriends);

// 获好友推荐
router.get('/suggestions', auth, friendController.getFriendSuggestions);

// 发送好友请求
router.post('/request/:userId', auth, friendController.sendFriendRequest);

// 处理好友请求
router.post('/requests/:requestId/:action', auth, friendController.handleFriendRequest);

// 删除好友
router.delete('/:friendId', auth, friendController.removeFriend);

// 添加获取好友状态的路由
router.get('/status/:userId', auth, checkFriendPrivacy, friendController.getFriendshipStatus);

// Neo4j 相关路由
router.get('/recommendations/graph', auth, friendController.getFriendRecommendationsWithGraph);
router.get('/analytics/social-circle', auth, friendController.getSocialCircleAnalytics);

// 添加新的社交分析路由
router.get('/analysis/common/:targetUserId', auth, friendController.getCommonFriendsAnalysis);
router.get('/analysis/circles', auth, friendController.getSocialCirclesAnalysis);
router.get('/analysis/influence', auth, friendController.getSocialInfluenceAnalysis);


// 智能好友推荐
router.get('/smart-recommendations', auth, friendController.getSmartRecommendations);

// 社���路径分析
router.get('/connection-path/:targetUserId', auth, friendController.getConnectionPath);

// 兴趣群组发现
router.get('/social-groups', auth, friendController.getSocialGroups);

// 用户活跃度分析
router.get('/activity', auth, friendController.getUserActivity);

// 关系强度分析
router.get('/relationship-strength/:targetUserId', auth, friendController.getRelationshipStrength);

// 添加数据同步路由
router.post('/sync', auth, friendController.syncFriendsData);
router.post('/sync/all', auth, friendController.syncAllData);

// 添加新的路由
router.get('/friends-of-friends', auth, friendController.getFriendsOfFriends);
router.get('/connection-path/:targetUserId', auth, friendController.getConnectionPath);
router.get('/influence-analysis', auth, friendController.getSocialInfluenceAnalysis);

// 好友分组管理路由
router.post('/groups', auth, friendController.createFriendGroup);
router.get('/groups', auth, friendController.getFriendGroups);
router.post('/groups/:groupId/members', auth, friendController.addFriendToGroup);
router.delete('/groups/:groupId/members/:friendId', auth, friendController.removeFriendFromGroup);
router.put('/groups/:groupId', auth, friendController.updateFriendGroup);
router.delete('/groups/:groupId', auth, friendController.deleteFriendGroup);

// 好友在线状���相关路由
router.get('/status/online', auth, async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId)
            .populate('friends', '_id username lastActive')
            .lean();

        if (!user || !user.friends) {
            return res.json([]);
        }

        const currentTime = new Date();
        const onlineStatus = user.friends.map(friend => ({
            userId: friend._id.toString(),
            isOnline: friend.lastActive && 
                (currentTime - new Date(friend.lastActive)) < 5 * 60 * 1000
        }));

        res.json(onlineStatus);
    } catch (error) {
        console.error('获取在线状态失败:', error);
        res.json([]); // 返回空数组而不是500错误
    }
});

// 好友互动相关路由
router.post('/interaction/:friendId', auth, friendController.recordInteraction);
router.get('/interaction/:friendId/history', auth, friendController.getInteractionHistory);
router.get('/interaction/recent', auth, friendController.getRecentlyInteractedFriends);

// 添加新的路由处理函数

// 标记单个好友请求为已读
router.put('/requests/:requestId/read', auth, async (req, res) => {
    try {
        const request = await FriendRequest.findOneAndUpdate(
            {
                _id: req.params.requestId,
                receiver: req.userId
            },
            { $set: { isRead: true } },
            { new: true }
        );

        if (!request) {
            return res.status(404).json({ message: '请求不存在' });
        }

        // 清理相关缓存
        try {
            await RedisClient.clearFriendRequests(req.userId);
        } catch (error) {
            console.error('清理缓存失败:', error);
        }

        res.json(request);
    } catch (error) {
        console.error('标记好友请求已读失败:', error);
        res.status(500).json({ message: '操作失败' });
    }
});

// 标记所有好友请求为已读
router.put('/requests/read-all', auth, async (req, res) => {
    try {
        await FriendRequest.updateMany(
            {
                receiver: req.userId,
                isRead: false
            },
            { $set: { isRead: true } }
        );

        // 清理相关缓存
        try {
            await RedisClient.clearFriendRequests(req.userId);
        } catch (error) {
            console.error('清理缓存失败:', error);
        }

        res.json({ message: '所有请求已标记为已读' });
    } catch (error) {
        console.error('标记所有好友请求已读失败:', error);
        res.status(500).json({ message: '操��失败' });
    }
});

module.exports = router; 