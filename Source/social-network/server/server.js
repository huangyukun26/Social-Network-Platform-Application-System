const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const fs = require('fs');

const app = express();

// 中间件
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 创建上传目录
const uploadDir = path.join(__dirname, 'uploads');
const avatarDir = path.join(uploadDir, 'avatars');
const postDir = path.join(uploadDir, 'posts');

// 确保目录存在
[uploadDir, avatarDir, postDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// 配置静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 请求日志中间件
app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    if (req.method === 'POST') {
        console.log('请求体:', req.body);
        if (req.file) {
            console.log('上传的文件:', req.file);
        }
    }
    next();
});

// 连接MongoDB数据库
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('MongoDB连接成功');
    console.log('数据库URI:', process.env.MONGODB_URI);
})
.catch(err => {
    console.error('MongoDB连接失败:', err);
    process.exit(1);
});

// 导入路由
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');

// 注册路由
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

// 基础路由
app.get('/', (req, res) => {
    res.send('社交网络API正在运行');
});

// 404 处理
app.use((req, res) => {
    console.log(`404 - 未找到路由: ${req.originalUrl}`);
    res.status(404).json({ message: `未找到路由: ${req.originalUrl}` });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误详情:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
        headers: req.headers
    });

    res.status(500).json({ 
        message: '服务器错误',
        error: process.env.NODE_ENV === 'development' ? {
            message: err.message,
            stack: err.stack
        } : undefined
    });
});

// 启动服务器
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log('可用路由:');
    console.log('- GET  /api/users/me');
    console.log('- POST /api/users/login');
    console.log('- POST /api/users/register');
    console.log('- GET  /api/posts/user/:userId');
});

module.exports = app; 