const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');

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

// 获取当前用户信息
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

        console.log('登录请求:', req.body);
        const { password } = req.body;

        // 查找用户
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: '邮箱或密码错误' });
        }

        // 验证密码
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: '邮箱或密码错误' });
        }

        // 登录失败时记录
        if (!isMatch) {
            loginAttempts.set(email, attempts + 1);
            setTimeout(() => loginAttempts.delete(email), 15 * 60 * 1000);
        } else {
            loginAttempts.delete(email);
        }

        // 生成 token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 返回用户信息和token
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
                createdAt: user.createdAt
            }
        });

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

        // 创建新用户
        user = new User({
            username,
            email,
            password
        });

        // 加密密码
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // 生成 token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ message: '服务器错误' });
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

// 获取用户资料
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
        console.error('获取用户资料失败:', error);
        res.status(500).json({ message: '获取用户资料失败' });
    }
});

// 获取推荐关注用户
router.get('/suggestions', auth, async (req, res) => {
    try {
        const currentUser = await User.findById(req.userId);
        
        // 获取未关注的用户(排除自己和已关注的用户)
        const suggestions = await User.find({
            _id: { 
                $nin: [
                    req.userId,
                    ...currentUser.following
                ]
            }
        })
        .select('username avatar bio')
        .limit(5); // 限制返回5个推荐

        res.json(suggestions);
    } catch (error) {
        console.error('获取推荐用户失败:', error);
        res.status(500).json({ message: '获取推荐用户失败' });
    }
});

// 导出路由
module.exports = router; 