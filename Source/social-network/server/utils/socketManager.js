const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const RedisClient = require('./RedisClient');
const MessageService = require('../services/MessageService');
const User = require('../models/User');

class SocketManager {
    initialize(server) {
        this.io = socketIO(server, {
            cors: {
                origin: process.env.CLIENT_URL,
                methods: ['GET', 'POST']
            }
        });

        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error('认证失败'));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.userId = decoded.userId;
                
                // 记录用户socket连接
                await RedisClient.hset('online_users', decoded.userId, socket.id);
                
                next();
            } catch (error) {
                next(new Error('认证失败'));
            }
        });

        this.io.on('connection', (socket) => {
            console.log(`用户连接: ${socket.userId}`);

            socket.on('disconnect', async () => {
                console.log(`用户断开连接: ${socket.userId}`);
                await RedisClient.hdel('online_users', socket.userId);
            });

            this.setupMessageHandlers(socket);
        });
    }

    // 发送消息给指定用户
    async sendToUser(userId, event, data) {
        const socketId = await RedisClient.hget('online_users', userId);
        if (socketId) {
            this.io.to(socketId).emit(event, data);
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
            await MessageService.markAsRead(socket.userId, data.senderId);
            await this.sendToUser(data.senderId, 'message_read_receipt', {
                reader: socket.userId,
                messageIds: data.messageIds
            });
        });
    }

    // 添加在线状态管理
    async updateUserStatus(userId, isOnline) {
        await RedisClient.setUserOnlineStatus(userId, isOnline);
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