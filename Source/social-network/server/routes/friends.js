const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const friendController = require('../controllers/friendController');

// 获取好友请求列表
router.get('/requests', auth, friendController.getFriendRequests);

// 获取好友列表
router.get('/', auth, friendController.getFriends);

// 获取好友推荐
router.get('/suggestions', auth, friendController.getFriendSuggestions);

// 发送好友请求
router.post('/request/:userId', auth, friendController.sendFriendRequest);

// 处理好友请求
router.post('/requests/:requestId/:action', auth, friendController.handleFriendRequest);

// 删除好友
router.delete('/:friendId', auth, friendController.removeFriend);

// 添加获取好友状态的路由
router.get('/status/:userId', auth, friendController.getFriendshipStatus);

module.exports = router; 