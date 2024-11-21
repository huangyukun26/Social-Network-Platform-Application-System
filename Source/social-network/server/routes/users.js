const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const RedisClient = require('../utils/RedisClient');
const neo4jService = require('../services/neo4jService');
const mongoose = require('mongoose');

// 配置 multer 存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const avatarDir = path.join(__dirname, '../uploads/avatars');
        // 确保目录存在
        if (!fs.existsSync(avatarDir)) {
            fs.mkdirSync(avatarDir, { recursive: true });
        }
        cb(null, avatarDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('只能上传图片文件！'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// 调试日志中间件
router.use((req, res, next) => {
    console.log(`User route accessed: ${req.method} ${req.path}`);
    next();
});

// 添加登录失败次数限制
const loginAttempts = new Map();

// 添加隐私检查中间件
const checkPrivacy = async (req, res, next) => {
    try {
        const targetUser = await User.findById(req.params.userId);
        const requestingUser = req.userId; // 来自 auth 中间件

        if (!targetUser) {
            return res.status(404).json({ message: '用户不存在' });
        }

        // 如果是查看自己的资料，直接通过
        if (targetUser._id.toString() === requestingUser) {
            return next();
        }

        // 检查资料可见性
        if (targetUser.privacy.profileVisibility === 'private') {
            return res.status(403).json({ message: '该用户资料已设为私密' });
        }

        if (targetUser.privacy.profileVisibility === 'friends') {
            const isFriend = targetUser.friends.includes(requestingUser);
            if (!isFriend) {
                return res.status(403).json({ message: '仅好友可见' });
            }
        }

        next();
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
};

// 1. 先定义搜索路由
router.get('/search', auth, async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.json([]);
        }

        // 获取当前用户信息，包括好友列表
        const currentUser = await User.findById(req.userId)
            .select('friends');

        const users = await User.find({
            $and: [
                { _id: { $ne: req.userId } }, // 排除当前用户
                {
                    $or: [
                        { username: new RegExp(query, 'i') },
                        { email: new RegExp(query, 'i') }
                    ]
                }
            ]
        })
        .select('username avatar bio privacy friends')
        .limit(10);

        const processedUsers = users.map(user => {
            const isFriend = currentUser.friends.includes(user._id);
            return {
                _id: user._id,
                username: user.username,
                avatar: user.avatar,
                bio: user.privacy?.profileVisibility === 'private' ? '这是一个私密账户' : user.bio,
                isPrivate: user.privacy?.profileVisibility === 'private',
                isFriend: isFriend, // 添加好友状态
                statistics: {
                    friendsCount: user.friends?.length || 0
                }
            };
        });

        res.json(processedUsers);
    } catch (error) {
        console.error('搜索用户失败:', error);
        res.status(500).json({ message: '搜索失败' });
    }
});

// 2. 获取当前用户信息
router.get('/me', auth, async (req, res) => {
    try {
        console.log('GET /me - 用户ID:', req.userId);
        console.log('GET /me - 请求头:', req.headers);
        
        if (!req.userId) {
            console.log('未找到用户ID');
            return res.status(401).json({ message: '未授权访问' });
        }

        const user = await User.findById(req.userId).select('-password');
        console.log('查找到的用户:', user);
        
        if (!user) {
            console.log('用户不存在:', req.userId);
            return res.status(404).json({ message: '用户不存在' });
        }

        res.json(user);
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 3. 其他特定路由
router.get('/suggestions', auth, async (req, res) => {
    try {
        const currentUser = await User.findById(req.userId)
            .populate('following')
            .populate('interactions.targetUser');
        
        // 构建排除列表 - 当前用户和已关注的用户
        const excludeIds = [
            new mongoose.Types.ObjectId(req.userId),
            ...(currentUser.following || []).map(f => f._id)
        ];

        // 获取用户的互动记录
        const interactionUsers = currentUser.interactions?.map(i => i.targetUser._id) || [];
        
        // 聚合查询推荐用户
        const suggestions = await User.aggregate([
            {
                $match: {
                    _id: { $nin: excludeIds },
                    'privacy.profileVisibility': { $ne: 'private' }
                }
            },
            {
                $addFields: {
                    score: {
                        $add: [
                            // 1. 互动分数
                            {
                                $cond: [
                                    { $in: ['$_id', interactionUsers] },
                                    10,
                                    0
                                ]
                            },
                            // 2. 共同关注分数 - 添加空值检查
                            {
                                $cond: [
                                    { $isArray: '$following' },
                                    {
                                        $size: {
                                            $setIntersection: [
                                                { $ifNull: ['$following', []] },
                                                { $ifNull: [currentUser.following || [], []] }
                                            ]
                                        }
                                    },
                                    0
                                ]
                            },
                            // 3. 活跃度分数 - 添加空值检查
                            {
                                $cond: [
                                    { $and: [
                                        { $isNumber: '$activityMetrics.postFrequency' },
                                        { $ne: ['$activityMetrics.postFrequency', null] }
                                    ]},
                                    { $divide: ['$activityMetrics.postFrequency', 10] },
                                    0
                                ]
                            },
                            // 4. 粉丝数量分数 - 添加空值检查
                            {
                                $cond: [
                                    { $isArray: '$followers' },
                                    { $divide: [{ $size: { $ifNull: ['$followers', []] } }, 100] },
                                    0
                                ]
                            }
                        ]
                    }
                }
            },
            { $sort: { score: -1 } },
            { $limit: 5 },
            {
                $project: {
                    username: 1,
                    avatar: 1,
                    bio: 1,
                    followersCount: {
                        $cond: [
                            { $isArray: '$followers' },
                            { $size: { $ifNull: ['$followers', []] } },
                            0
                        ]
                    },
                    postsCount: {
                        $cond: [
                            { $isArray: '$posts' },
                            { $size: { $ifNull: ['$posts', []] } },
                            0
                        ]
                    }
                }
            }
        ]);

        res.json(suggestions);
    } catch (error) {
        console.error('获取推荐用户失败:', error);
        res.status(500).json({ message: '获取推荐用户失败' });
    }
});

// 4. 最后才是通用的用户ID路由
router.get('/:userId', auth, checkPrivacy, async (req, res) => {
    try {
        const userId = req.params.userId === 'me' ? req.userId : req.params.userId;
        const requestingUser = req.userId;

        const user = await User.findById(userId)
            .select('-password')
            .populate('friends', 'username avatar bio')
            .populate('posts')
            .lean();

        // 根据隐私设置过滤数据
        if (userId !== requestingUser) {
            if (!user.privacy.showEmail) {
                delete user.email;
            }
            if (!user.privacy.showFollowers) {
                delete user.followers;
            }
            if (!user.privacy.showFollowing) {
                delete user.following;
            }
            if (!user.privacy.showPosts) {
                delete user.posts;
            }
        }

        // 添加统计数据
        user.statistics = {
            postsCount: user.posts ? user.posts.length : 0,
            friendsCount: user.friends ? user.friends.length : 0,
            likesCount: user.likesReceived || 0
        };

        res.json(user);
    } catch (error) {
        console.error('获取户资料失败:', error);
        res.status(500).json({ message: '获取用户资料失败' });
    }
});

// 登录路由
router.post('/login', async (req, res) => {
    try {
        const { email } = req.body;
        
        // 检查登录失败次数
        const attempts = loginAttempts.get(email) || 0;
        if (attempts >= 5) {
            return res.status(429).json({ 
                message: '登录失败次数过多，请15分钟后再试' 
            });
        }

        const { password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(401).json({ message: '邮箱或密码错误' });
        }

        // 验证密码
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            loginAttempts.set(email, attempts + 1);
            setTimeout(() => loginAttempts.delete(email), 15 * 60 * 1000);
            return res.status(401).json({ message: '邮箱或密码错误' });
        }

        // 清除失败记录
        loginAttempts.delete(email);

        // 生成 token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        try {
            // 创分布式会话
            const sessionId = await RedisClient.setUserSession(user._id, {
                userId: user._id,
                deviceInfo: req.body.deviceInfo || {},
                loginTime: new Date().toISOString()
            });

            res.json({
                token,
                sessionId,
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    bio: user.bio,
                    website: user.website,
                    privacy: user.privacy,
                    role: user.role,
                    createdAt: user.createdAt
                }
            });
        } catch (redisError) {
            console.error('Redis 会话创建失败:', redisError);
            // 即使 Redis 出错，也返回基本的登录信息
            res.json({
                token,
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    bio: user.bio,
                    website: user.website,
                    privacy: user.privacy,
                    role: user.role,
                    createdAt: user.createdAt
                }
            });
        }
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 添加密码强度验证
const validatePassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    return regex.test(password);
};

// 注册路由
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 密码强度验证
        if (!validatePassword(password)) {
            return res.status(400).json({
                message: '密码必须包含大小写字母和数字，且长度至少8位'
            });
        }

        // 用户名格式验证
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({
                message: '用户名长度必须在3-20个字符之间'
            });
        }

        // 检查用户是否已存在
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ message: '用户名或邮箱已存在' });
        }

        // 创建新用户 - 移除手动加密步骤
        user = new User({
            username,
            email,
            password  // 密码会在 pre-save 中间件中自动加密
        });

        await user.save();

        // 生成 token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 即使 Neo4j 同步失败，也返回成功响应
        res.status(201).json({
            token,
            sessionId: user._id,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({ message: '注册失败，请稍后重试' });
    }
});

// 更新个人资料
router.put('/profile', auth, upload.single('avatar'), async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        // 更新头像
        if (req.file) {
            // 删除旧头像
            if (user.avatar) {
                const oldAvatarPath = path.join(__dirname, '..', user.avatar);
                try {
                    if (fs.existsSync(oldAvatarPath)) {
                        fs.unlinkSync(oldAvatarPath);
                        console.log('成功删除旧头像:', oldAvatarPath);
                    }
                } catch (err) {
                    console.error('删除旧头像失败:', err);
                }
            }
            
            const avatarPath = `/uploads/avatars/${req.file.filename}`;
            console.log('新的头像路径:', avatarPath);
            user.avatar = avatarPath;
        }

        // 更新基本信息
        ['username', 'bio', 'website'].forEach(field => {
            if (req.body[field] !== undefined) {
                user[field] = req.body[field];
            }
        });

        // 更新隐私设置
        if (req.body.privacySettings) {
            try {
                const privacySettings = JSON.parse(req.body.privacySettings);
                user.privacy = {
                    ...user.privacy,
                    ...privacySettings
                };
                console.log('解析后的隐私设置:', privacySettings);
            } catch (error) {
                console.error('解析隐私设置失败:', error);
            }
        }

        console.log('更新前的用户数据:', user.toObject());
        await user.save();
        console.log('更新后的用户数据:', user.toObject());

        // 返回更新后的用户数据
        const updatedUser = await User.findById(user._id)
            .select('-password')
            .lean();

        res.json(updatedUser);
    } catch (error) {
        console.error('更新个人资料错误:', error);
        res.status(500).json({ message: '更新失败' });
    }
});

// 更新在线状态
router.post('/status/online', auth, async (req, res) => {
  try {
    const { isOnline, deviceInfo } = req.body;
    const user = await User.findById(req.userId);
    
    user.onlineStatus.isOnline = isOnline;
    user.onlineStatus.lastActiveAt = new Date();
    if (deviceInfo) {
      user.onlineStatus.deviceInfo = deviceInfo;
    }
    
    await user.save();
    
    // 更新 Neo4j
    await neo4jService.updateUserOnlineStatus(req.userId, isOnline);
    
    res.json({ message: '状态更新成功' });
  } catch (error) {
    console.error('更新在线状态失败:', error);
    res.status(500).json({ message: '更新状态失败' });
  }
});

// 获取用户社交统计
router.get('/:userId/social-stats', auth, checkPrivacy, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('friendships.friend', 'username avatar')
      .populate('friendGroups', 'name membersCount');
    
    const stats = {
      totalFriends: user.friends.length,
      closeFriends: user.friendships.filter(f => f.status === 'close').length,
      groupsCount: user.friendGroups.length,
      averageInteractions: user.activityMetrics.interactionFrequency,
      lastActive: user.onlineStatus.lastActiveAt
    };
    
    res.json(stats);
  } catch (error) {
    console.error('获取社交统计失败:', error);
    res.status(500).json({ message: '获取统计失败' });
  }
});

// 管理好友分组
router.post('/groups', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const user = await User.findById(req.userId);
    
    user.friendGroups.push({
      name,
      description,
      members: []
    });
    
    await user.save();
    res.json(user.friendGroups[user.friendGroups.length - 1]);
  } catch (error) {
    console.error('创建好友分组失败:', error);
    res.status(500).json({ message: '创建分组失败' });
  }
});

// 更新好友关系状态
router.put('/friendship/:friendId', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findById(req.userId);
    
    const friendship = user.friendships.find(
      f => f.friend.toString() === req.params.friendId
    );
    
    if (friendship) {
      friendship.status = status;
      await user.save();
      
      // 同步到 Neo4j
      await neo4jService.updateFriendshipStatus(
        req.userId,
        req.params.friendId,
        status
      );
      
      res.json(friendship);
    } else {
      res.status(404).json({ message: '好友关系不存在' });
    }
  } catch (error) {
    console.error('更新好友关系失败:', error);
    res.status(500).json({ message: '更新关系失败' });
  }
});


/*
// 获取关注状态
router.get('/follow/status/:userId', auth, async (req, res) => {
    try {
        const currentUser = await User.findById(req.userId);
        const isFollowing = currentUser.following.includes(req.params.userId);
        res.json({ isFollowing });
    } catch (error) {
        console.error('获取关注状态失败:', error);
        res.status(500).json({ message: '获取关注状态失败' });
    }
});
*/


// 导出路由
module.exports = router; 