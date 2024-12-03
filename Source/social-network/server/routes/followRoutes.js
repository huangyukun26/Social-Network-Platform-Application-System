const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Notification = require('../models/Notification');
const redisClient = require('../utils/RedisClient');

// 关注/取消关注用户
router.post('/:userId', auth, async (req, res) => {
    try {
        const currentUser = await User.findById(req.userId);
        const userToFollow = await User.findById(req.params.userId);

        if (!userToFollow) {
            return res.status(404).json({ message: '用户不存在' });
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
            
            // 创建通知
            await new Notification({
                type: 'follow',
                sender: currentUser._id,
                recipient: userToFollow._id,
                content: '关注了你'
            }).save();
        }

        await Promise.all([currentUser.save(), userToFollow.save()]);

        // 清理相关缓存
        try {
            await Promise.all([
                // 清理关注状态缓存
                redisClient.clearFollowCache(req.userId, req.params.userId),
                // 清理用户主页缓存
                redisClient.clearUserProfileCache(req.params.userId),
                redisClient.clearUserProfileCache(req.userId),
                // 清理推荐帖子缓存
                redisClient.clearFeedCache(req.userId),
                // 清理用户关注列表缓存
                redisClient.clearFollowListCache(req.userId),
                redisClient.clearFollowListCache(req.params.userId),
                // 清理关注状态缓存
                redisClient.clearCache([
                    `follow:status:${req.userId}:*`,
                    `follow:status:*:${req.userId}`
                ])
            ]);
        } catch (error) {
            console.error('缓存清理失败:', error);
        }

        res.json({
            isFollowing: !isFollowing,
            followersCount: userToFollow.followers.length,
            followingCount: currentUser.following.length,
            currentUser: {
                following: currentUser.following,
                followers: currentUser.followers
            }
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

// 获取关注状态
router.get('/status/:userId', auth, async (req, res) => {
    try {
        const currentUser = await User.findById(req.userId)
            .select('following');  // 只获取 following 字段
        const targetUser = await User.findById(req.params.userId)
            .select('followers');  // 只获取 followers 字段
        
        if (!currentUser || !targetUser) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        // 检查目标用户是否在当前用户的关注列表中
        const isFollowing = currentUser.following.includes(targetUser._id);
        
        res.json({
            isFollowing,
            followersCount: targetUser.followers.length,
            followingCount: currentUser.following.length
        });
    } catch (error) {
        console.error('获取关注状态失败:', error);
        res.status(500).json({ message: '获取关注状态失败' });
    }
});

// 移除粉丝
router.delete('/remove-follower/:userId', auth, async (req, res) => {
    try {
        const currentUser = await User.findById(req.userId);
        const followerToRemove = await User.findById(req.params.userId);

        if (!currentUser || !followerToRemove) {
            return res.status(404).json({ message: '用户不存在' });
        }

        // 从当前用户的粉丝列表中移除
        currentUser.followers = currentUser.followers.filter(
            id => id.toString() !== followerToRemove._id.toString()
        );
        
        // 从粉丝的关注列表中移除当前用户
        followerToRemove.following = followerToRemove.following.filter(
            id => id.toString() !== currentUser._id.toString()
        );

        await Promise.all([
            currentUser.save(),
            followerToRemove.save()
        ]);

        // 返回更新后的数据
        res.json({
            message: '已移除粉丝',
            followersCount: currentUser.followers.length,
            followingCount: currentUser.following.length
        });
    } catch (error) {
        console.error('移除粉丝失败:', error);
        res.status(500).json({ message: '移除粉丝失败' });
    }
});

module.exports = router; 