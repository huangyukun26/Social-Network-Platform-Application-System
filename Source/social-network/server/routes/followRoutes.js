const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// 关注用户
router.post('/follow/:userId', auth, async (req, res) => {
    try {
        const userToFollow = await User.findById(req.params.userId);
        const currentUser = await User.findById(req.userId);

        if (!userToFollow || !currentUser) {
            return res.status(404).json({ message: '用户不存在' });
        }

        if (userToFollow._id.toString() === currentUser._id.toString()) {
            return res.status(400).json({ message: '不能关注自己' });
        }

        const isFollowing = currentUser.following.includes(userToFollow._id);

        if (isFollowing) {
            // 取消关注
            currentUser.following = currentUser.following.filter(
                id => id.toString() !== userToFollow._id.toString()
            );
            userToFollow.followers = userToFollow.followers.filter(
                id => id.toString() !== currentUser._id.toString()
            );
        } else {
            // 添加关注
            currentUser.following.push(userToFollow._id);
            userToFollow.followers.push(currentUser._id);
        }

        await Promise.all([currentUser.save(), userToFollow.save()]);

        res.json({
            isFollowing: !isFollowing,
            followersCount: userToFollow.followers.length,
            followingCount: currentUser.following.length
        });
    } catch (error) {
        console.error('关注操作失败:', error);
        res.status(500).json({ message: '操作失败' });
    }
});

// 获取关注列表
router.get('/:userId/following', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .populate('following', 'username avatar bio');
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        // 检查隐私设置
        if (user.privacy.profileVisibility === 'private' && 
            user._id.toString() !== req.userId) {
            return res.status(403).json({ message: '无权访问' });
        }

        res.json(user.following);
    } catch (error) {
        res.status(500).json({ message: '获取关注列表失败' });
    }
});

// 获取粉丝列表
router.get('/:userId/followers', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .populate('followers', 'username avatar bio');
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        // 检查隐私设置
        if (user.privacy.profileVisibility === 'private' && 
            user._id.toString() !== req.userId) {
            return res.status(403).json({ message: '无权访问' });
        }

        res.json(user.followers);
    } catch (error) {
        res.status(500).json({ message: '获取粉丝列表失败' });
    }
});

// 添加获取关注状态的路由
router.get('/status/:userId', auth, async (req, res) => {
    try {
        const currentUser = await User.findById(req.userId);
        const targetUserId = req.params.userId;

        if (!currentUser) {
            return res.status(404).json({ message: '用户不存在' });
        }

        const isFollowing = currentUser.following.includes(targetUserId);
        
        res.json({ isFollowing });
    } catch (error) {
        console.error('获取关注状态失败:', error);
        res.status(500).json({ message: '获取关注状态失败' });
    }
});

module.exports = router; 