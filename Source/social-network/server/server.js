const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
require('dotenv').config();
const fs = require('fs');
const RedisClient = require('./utils/RedisClient');
const SocketManager = require('./utils/socketManager');
const KafkaService = require('./services/KafkaService');

const app = express();
const server = http.createServer(app);

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

// 初始化服务
async function initializeServices() {
    try {
        // MongoDB 连接
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB连接成功');
        console.log('数据库URI:', process.env.MONGODB_URI);

        // Redis 连接
        await RedisClient.client.ping();
        console.log('Redis连接成功');

        // Kafka 连接
        await KafkaService.initialize();
        console.log('Kafka连接成功');

    } catch (error) {
        console.error('服务初始化失败:', error);
        process.exit(1);
    }
}

// 导入路由
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const friendRoutes = require('./routes/friends');
const followRoutes = require('./routes/followRoutes');
const adminRoutes = require('./routes/admin');
const cacheMonitorRoutes = require('./routes/admin/cache-monitor');
const messageRoutes = require('./routes/messageRoutes');

// 注册路由
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/cache', cacheMonitorRoutes);
app.use('/api/messages', messageRoutes);

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

// 修改服务器启动部分
if (process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT || 5000;
    
    // 初始化所有服务
    initializeServices().then(() => {
        // 初始化 Socket.IO
        SocketManager.initialize(server);
        
        // 启动服务器
        server.listen(PORT, () => {
            console.log(`服务器运行在端口 ${PORT}`);
            console.log('可用路由:');
            console.log('- GET  /api/users/me');
            console.log('- POST /api/users/login');
            console.log('- POST /api/users/register');
            console.log('- GET  /api/posts/user/:userId');
            console.log('- POST /api/follow/:userId');
            console.log('- GET  /api/follow/:userId/followers');
            console.log('- GET  /api/follow/:userId/following');
            console.log('消息系统路由:');
            console.log('- POST /api/messages/send');
            console.log('- GET  /api/messages/history/:userId');
            console.log('- PUT  /api/messages/read/:senderId');
            console.log('- GET  /api/messages/unread');
        });
    });

    // 优雅关闭
    const gracefulShutdown = async () => {
        console.log('正在关闭服务器...');
        
        // 关闭 HTTP 服务器
        server.close(async () => {
            try {
                // 关闭 Kafka 连接
                await KafkaService.shutdown();
                console.log('Kafka 连接已关闭');

                // 关闭 Redis 连接
                await RedisClient.client.quit();
                console.log('Redis 连接已关闭');

                // 关闭 MongoDB 连接
                await mongoose.connection.close();
                console.log('MongoDB 连接已关闭');

                console.log('服务器已安全关闭');
                process.exit(0);
            } catch (error) {
                console.error('关闭服务器时出错:', error);
                process.exit(1);
            }
        });
    };

    // 监听进程信号
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
}

module.exports = { app, server }; 