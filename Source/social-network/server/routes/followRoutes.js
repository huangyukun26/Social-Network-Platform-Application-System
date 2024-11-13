const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

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
        }

        await Promise.all([currentUser.save(), userToFollow.save()]);

        // 返回更新后的完整数据
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
        const currentUser = await User.findById(req.userId);
        const isFollowing = currentUser.following.includes(req.params.userId);
        
        res.json({ isFollowing });
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