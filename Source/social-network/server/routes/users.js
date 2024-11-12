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
        console.log('登录请求:', req.body);
        const { email, password } = req.body;

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

// 注册路由
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

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
        console.log('收到请求头:', req.headers);
        console.log('收到文件:', req.file);
        console.log('收到表单数据:', req.body);

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

        // 更新其他字段
        const allowedUpdates = ['username', 'bio', 'website', 'profileVisibility', 'showEmail'];
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'profileVisibility') {
                    user.privacy.profileVisibility = req.body[field];
                } else if (field === 'showEmail') {
                    user.privacy.showEmail = req.body[field] === 'true';
                } else {
                    user[field] = req.body[field];
                }
            }
        });

        await user.save();
        console.log('更新后的用户信息:', user.toObject());
        
        res.json(user.toObject());
    } catch (error) {
        console.error('更新个人资料错误:', error);
        res.status(500).json({ message: '更新失败' });
    }
});

// 导出路由
module.exports = router; 