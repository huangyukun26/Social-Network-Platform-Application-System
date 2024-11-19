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
                if (!token) {
                    return next(new Error('认证失败'));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.userId = decoded.userId;
                
                // 更新用户在线状态
                await redisClient.hset('online_users', decoded.userId, socket.id);
                this.userSockets.set(decoded.userId, socket);
                
                // 通知好友上线
                await this.updateUserStatus(decoded.userId, true);
                
                next();
            } catch (error) {
                next(new Error('认证失败'));
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
            
            // 无论用户是否在线都返回成功，因为消息已经保存到数据库
            if (socketId) {
                console.log(`用户 ${userId} 在线，立即发送消息`);
                this.io.to(socketId).emit(event, data);
            } else {
                console.log(`用户 ${userId} 不在线，消息已存储到数据库`);
                // 消息已经保存在数据库中，用户上线后可以通过获取历史消息看到
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