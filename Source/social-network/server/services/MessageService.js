const Message = require('../models/Message');
const Chat = require('../models/Chat');
const RedisClient = require('../utils/RedisClient');
const SocketManager = require('../utils/socketManager');
const User = require('../models/User');
const mongoose = require('mongoose');
const KafkaService = require('./KafkaService');

class MessageService {
    // 创建或获取聊天会话
    async getOrCreateChat(userId1, userId2) {
        const participants = [userId1, userId2].sort();
        
        let chat = await Chat.findOne({
            participants: { $all: participants },
            type: 'private'
        });

        if (!chat) {
            chat = await Chat.create({
                participants,
                type: 'private',
                unreadCount: new Map([[userId2.toString(), 0]])
            });

            // 更新用户的活跃聊天列表
            await User.updateMany(
                { _id: { $in: participants } },
                { $addToSet: { activeChats: chat._id } }
            );
        }

        return chat;
    }

    // 发送消息
    async sendMessage(senderId, receiverId, content, type = 'text', attachments = []) {
        try {
            // 获取或创建聊天会话
            const chat = await this.getOrCreateChat(senderId, receiverId);

            // 创建消息记录
            const message = await Message.create({
                sender: senderId,
                receiver: receiverId,
                chatId: chat._id,
                content,
                type,
                attachments,
                status: 'sent',
                readBy: [{
                    user: senderId,
                    readAt: new Date()
                }]
            });

            // 更新聊天会话
            chat.lastMessage = message._id;
            chat.unreadCount.set(receiverId.toString(), 
                (chat.unreadCount.get(receiverId.toString()) || 0) + 1
            );
            await chat.save();

            // 发送到Kafka
            await KafkaService.sendMessage({
                messageId: message._id,
                chatId: chat._id,
                sender: senderId,
                receiver: receiverId,
                content,
                type,
                timestamp: message.createdAt
            });

            // 缓存最新消息
            await RedisClient.cacheRecentMessages(senderId, receiverId, message);

            // 实时通知
            SocketManager.sendToUser(receiverId, 'new_message', {
                message: await this.populateMessage(message)
            });

            return message;
        } catch (error) {
            console.error('发送消息失败:', error);
            throw error;
        }
    }

    // 获取聊天历史
    async getChatHistory(chatId, page = 1, limit = 20) {
        try {
            const messages = await Message.find({
                chatId,
                isDeleted: false
            })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('sender', 'username avatar')
            .populate('replyTo')
            .lean();

            return messages.reverse();
        } catch (error) {
            console.error('获取聊天历史失败:', error);
            throw error;
        }
    }

    // 标记消息为已读
    async markAsRead(userId, chatId) {
        try {
            const chat = await Chat.findById(chatId);
            if (!chat) throw new Error('聊天不存在');

            // 更新消息状态
            const messages = await Message.find({
                chatId,
                receiver: userId,
                'readBy.user': { $ne: userId }
            });

            for (const message of messages) {
                message.readBy.push({
                    user: userId,
                    readAt: new Date()
                });
                await message.save();

                // 通知发送者消息已读
                SocketManager.sendToUser(message.sender, 'message_read', {
                    messageId: message._id,
                    chatId,
                    readBy: userId
                });
            }

            // 重置未读计数
            chat.unreadCount.set(userId.toString(), 0);
            await chat.save();

        } catch (error) {
            console.error('标记消息已读失败:', error);
            throw error;
        }
    }

    // 获取活跃聊天列表
    async getActiveChats(userId) {
        try {
            const chats = await Chat.find({
                participants: userId
            })
            .populate('participants', 'username avatar')
            .populate('lastMessage')
            .sort({ updatedAt: -1 })
            .lean();

            return chats.map(chat => ({
                ...chat,
                unreadCount: chat.unreadCount.get(userId.toString()) || 0
            }));
        } catch (error) {
            console.error('获取活跃聊天列表失败:', error);
            throw error;
        }
    }

    // 编辑消息
    async editMessage(messageId, userId, newContent) {
        try {
            const message = await Message.findById(messageId);
            if (!message) throw new Error('消息不存在');
            if (message.sender.toString() !== userId.toString()) {
                throw new Error('无权编辑此消息');
            }

            // 保存编辑历史
            message.editHistory.push({
                content: message.content,
                editedAt: new Date()
            });

            message.content = newContent;
            message.isEdited = true;
            await message.save();

            // 通知其他参与者
            const chat = await Chat.findById(message.chatId);
            chat.participants
                .filter(p => p.toString() !== userId.toString())
                .forEach(participantId => {
                    SocketManager.sendToUser(participantId, 'message_edited', {
                        messageId,
                        chatId: message.chatId,
                        newContent
                    });
                });

            return message;
        } catch (error) {
            console.error('编辑消息失败:', error);
            throw error;
        }
    }

    // 辅助方法：填充消息信息
    async populateMessage(message) {
        return await Message.findById(message._id)
            .populate('sender', 'username avatar')
            .populate('replyTo')
            .lean();
    }

    // 撤回消息
    async recallMessage(messageId, userId) {
        try {
            const message = await Message.findById(messageId);
            if (!message) throw new Error('消息不存在');
            
            // 检查权限和时间限制（例如2分钟内可撤回）
            if (message.sender.toString() !== userId.toString()) {
                throw new Error('无权撤回此消息');
            }
            
            const timeDiff = Date.now() - message.createdAt.getTime();
            if (timeDiff > 2 * 60 * 1000) {
                throw new Error('消息发送超过2分钟，无法撤回');
            }

            message.content = '此消息已被撤回';
            message.isRecalled = true;
            message.status = 'recalled';
            await message.save();

            // 通知聊天参与者
            const chat = await Chat.findById(message.chatId);
            chat.participants
                .filter(p => p.toString() !== userId.toString())
                .forEach(participantId => {
                    SocketManager.sendToUser(participantId, 'message_recalled', {
                        messageId,
                        chatId: message.chatId
                    });
                });

            return message;
        } catch (error) {
            console.error('撤回消息失败:', error);
            throw error;
        }
    }

    // 转发消息
    async forwardMessage(messageId, fromUserId, toUserIds) {
        try {
            const originalMessage = await Message.findById(messageId);
            if (!originalMessage) throw new Error('原消息不存在');

            const forwardedMessages = [];

            for (const toUserId of toUserIds) {
                const chat = await this.getOrCreateChat(fromUserId, toUserId);
                
                const newMessage = await Message.create({
                    sender: fromUserId,
                    receiver: toUserId,
                    chatId: chat._id,
                    content: originalMessage.content,
                    type: originalMessage.type,
                    attachments: originalMessage.attachments,
                    forwardedFrom: messageId,
                    status: 'sent',
                    readBy: [{
                        user: fromUserId,
                        readAt: new Date()
                    }]
                });

                // 更新聊天会话
                chat.lastMessage = newMessage._id;
                chat.unreadCount.set(toUserId.toString(), 
                    (chat.unreadCount.get(toUserId.toString()) || 0) + 1
                );
                await chat.save();

                // 实时通知
                SocketManager.sendToUser(toUserId, 'new_message', {
                    message: await this.populateMessage(newMessage)
                });

                forwardedMessages.push(newMessage);
            }

            return forwardedMessages;
        } catch (error) {
            console.error('转发消息失败:', error);
            throw error;
        }
    }

    // 搜索消息
    async searchMessages(userId, query, options = {}) {
        try {
            const {
                chatId,
                startDate,
                endDate,
                type,
                limit = 20,
                page = 1
            } = options;

            const searchQuery = {
                $or: [
                    { sender: userId },
                    { receiver: userId }
                ],
                isDeleted: false,
                $text: { $search: query }
            };

            if (chatId) searchQuery.chatId = chatId;
            if (type) searchQuery.type = type;
            if (startDate || endDate) {
                searchQuery.createdAt = {};
                if (startDate) searchQuery.createdAt.$gte = new Date(startDate);
                if (endDate) searchQuery.createdAt.$lte = new Date(endDate);
            }

            const messages = await Message.find(searchQuery)
                .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('sender', 'username avatar')
                .populate('receiver', 'username avatar')
                .lean();

            const total = await Message.countDocuments(searchQuery);

            return {
                messages,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            };
        } catch (error) {
            console.error('搜索消息失败:', error);
            throw error;
        }
    }

    // 创建群聊
    async createGroupChat(creatorId, name, memberIds) {
        try {
            const allMembers = [creatorId, ...memberIds];
            
            const chat = await Chat.create({
                participants: allMembers,
                type: 'group',
                name,
                creator: creatorId,
                admins: [creatorId],
                unreadCount: new Map(allMembers.map(id => [id.toString(), 0]))
            });

            // 更新所有成员的活跃聊天列表
            await User.updateMany(
                { _id: { $in: allMembers } },
                { $addToSet: { activeChats: chat._id } }
            );

            // 创建系统消息
            await this.createSystemMessage(chat._id, `${creatorId} 创建了群聊 "${name}"`);

            // 通知所有成员
            memberIds.forEach(memberId => {
                SocketManager.sendToUser(memberId, 'group_chat_created', {
                    chat: chat
                });
            });

            return chat;
        } catch (error) {
            console.error('创建群聊失败:', error);
            throw error;
        }
    }

    // 创建系统消息
    async createSystemMessage(chatId, content) {
        try {
            const message = await Message.create({
                chatId,
                content,
                type: 'system',
                status: 'sent'
            });

            const chat = await Chat.findById(chatId);
            chat.lastMessage = message._id;
            await chat.save();

            return message;
        } catch (error) {
            console.error('创建系统消息失败:', error);
            throw error;
        }
    }

    // 获取未读消息统计
    async getUnreadStats(userId) {
        try {
            const chats = await Chat.find({
                participants: userId
            });

            const stats = {
                total: 0,
                chats: {}
            };

            chats.forEach(chat => {
                const unread = chat.unreadCount.get(userId.toString()) || 0;
                stats.total += unread;
                stats.chats[chat._id] = unread;
            });

            return stats;
        } catch (error) {
            console.error('获取未读统计失败:', error);
            throw error;
        }
    }
}

module.exports = new MessageService();