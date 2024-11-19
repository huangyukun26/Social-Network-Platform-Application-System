const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const redisClient = require('./RedisClient');
const User = require('../models/User');

class SocketManager {
    constructor() {
        this.io = null;
        this.userSockets = new Map();
    }

    initialize(server) {
        this.io = socketIO(server, {
            cors: {
                origin: process.env.CLIENT_URL,
                methods: ['GET', 'POST']
            },
            pingTimeout: 60000
        });

        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                console.log('Socket 认证, token:', token ? '存在' : '不存在');
                
                if (!token) {
                    return next(new Error('认证失败: 缺少token'));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.userId = decoded.userId;
                
                console.log('Socket 用户认证成功:', socket.userId);
                
                // 更新用户在线状态
                await redisClient.hset('online_users', decoded.userId, socket.id);
                this.userSockets.set(decoded.userId, socket);
                
                next();
            } catch (error) {
                console.error('Socket 认证失败:', error);
                next(new Error('认证失败: ' + error.message));
            }
        });

        this.io.on('connection', (socket) => {
            console.log(`用户连接: ${socket.userId}`);

            socket.on('disconnect', async () => {
                console.log(`用户断开连接: ${socket.userId}`);
                await redisClient.hdel('online_users', socket.userId);
                this.userSockets.delete(socket.userId);
                // 通知好友下线
                await this.updateUserStatus(socket.userId, false);
            });

            this.setupMessageHandlers(socket);
        });
    }

    // 发送消息给指定用户
    async sendToUser(userId, event, data) {
        try {
            if (!this.io) {
                console.warn('Socket.IO not initialized');
                return false;
            }

            const socketId = await redisClient.hget('online_users', userId);
            
            // 添加数据格式日志
            console.log(`发送${event}事件，数据:`, data);
            
            if (socketId) {
                console.log(`用户 ${userId} 在线，立即发送消息`);
                this.io.to(socketId).emit(event, data);
            } else {
                console.log(`用户 ${userId} 不在线，消息已存储到数据库`);
            }

            return true;
        } catch (error) {
            console.error('发送消息失败:', error);
            return false;
        }
    }

    // 添加消息事件处理
    setupMessageHandlers(socket) {
        // 处理用户开始输入
        socket.on('typing_start', async (data) => {
            await this.sendToUser(data.receiverId, 'typing_start', {
                userId: socket.userId
            });
        });

        // 处理用户停止输入
        socket.on('typing_end', async (data) => {
            await this.sendToUser(data.receiverId, 'typing_end', {
                userId: socket.userId
            });
        });

        // 处理消息已读回执
        socket.on('message_read', async (data) => {
            this.emit('messageRead', {
                userId: socket.userId,
                senderId: data.senderId,
                messageIds: data.messageIds
            });
            
            await this.sendToUser(data.senderId, 'message_read_receipt', {
                reader: socket.userId,
                messageIds: data.messageIds
            });
        });
    }

    // 添加在线状态管理
    async updateUserStatus(userId, isOnline) {
        await redisClient.setUserOnlineStatus(userId, isOnline);
        // 通知好友状态变化
        const friends = await User.findById(userId).select('friendships');
        for (const friendship of friends.friendships) {
            await this.sendToUser(friendship.friend, 'friend_status_change', {
                userId,
                isOnline
            });
        }
    }
}

module.exports = new SocketManager();