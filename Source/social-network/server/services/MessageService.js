const Message = require('../models/Message');
const Chat = require('../models/Chat');
const RedisClient = require('../utils/RedisClient');
const { Types: { ObjectId } } = require('mongoose');
const KafkaService = require('./kafkaService');

class MessageError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

class MessageService {
    constructor() {
        this.socketManager = null;
    }

    // 添加设置 socketManager 的方法
    setSocketManager(manager) {
        this.socketManager = manager;
    }

    // 创建或获取聊天会话
    async getOrCreateChat(userId1, userId2) {
        try {
            // 参数验证
            if (!userId1 || !userId2) {
                throw new MessageError('INVALID_PARAMS', '用户ID不能为空');
            }

            // 确保是有效的 ObjectId
            const id1 = typeof userId1 === 'string' ? new ObjectId(userId1) : userId1;
            const id2 = typeof userId2 === 'string' ? new ObjectId(userId2) : userId2;
            
            let chat = await Chat.findOne({
                participants: { 
                    $all: [id1, id2],
                    $size: 2
                },
                type: 'private'
            });

            if (!chat) {
                chat = await Chat.create({
                    participants: [id1, id2],
                    type: 'private',
                    unreadCount: new Map([
                        [id1.toString(), 0],
                        [id2.toString(), 0]
                    ])
                });
            }

            return chat;
        } catch (error) {
            console.error('获取或创建聊天失败:', error);
            if (error instanceof MessageError) {
                throw error;
            }
            throw new Error('获取或创建聊天失败');
        }
    }

    // 发送消息
    async sendMessage(senderId, receiverId, content, type = 'text', attachments = []) {
        try {
            // 获取或创建聊天会话
            const chat = await this.getOrCreateChat(senderId, receiverId);
            
            // 创建消息
            const message = await Message.create({
                chatId: chat._id,  // 确保设置 chatId
                sender: senderId,
                receiver: receiverId,
                content,
                type,
                attachments,
                status: 'sent'
            });

            // 填充消息详情
            const populatedMessage = await Message.findById(message._id)
                .populate('sender', 'username avatar')
                .populate('receiver', 'username avatar')
                .populate('chatId')
                .lean();

            // 更新聊天的最后一条消息
            chat.lastMessage = message._id;
            await chat.save();

            // 实时通知
            if (this.socketManager) {
                console.log('发送实时通知给接收者:', receiverId);
                await this.socketManager.sendToUser(receiverId, 'new_message', {
                    message: populatedMessage
                });
                // 同时发送给发送者
                await this.socketManager.sendToUser(senderId, 'new_message', {
                    message: populatedMessage
                });
            }

            return populatedMessage;
        } catch (error) {
            console.error('发送消息失败:', error);
            throw error;
        }
    }

    // 获取聊天历史
    async getChatHistory(chatId, page = 1, limit = 20) {
        try {
            const messages = await Message.find({
                chatId: chatId,  // 使用正确的字段名
                isDeleted: false
            })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('sender', 'username avatar')
            .populate('receiver', 'username avatar')
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
                if (this.socketManager) {
                    await this.socketManager.sendToUser(message.sender, 'message_read', {
                        messageId: message._id,
                        chatId,
                        readBy: userId
                    });
                }
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
                    if (this.socketManager) {
                        this.socketManager.sendToUser(participantId, 'message_edited', {
                            messageId,
                            chatId: message.chatId,
                            newContent
                        });
                    }
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
            .populate('receiver', 'username avatar')
            .populate('chatId')
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
                    if (this.socketManager) {
                        this.socketManager.sendToUser(participantId, 'message_recalled', {
                            messageId,
                            chatId: message.chatId
                        });
                    }
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
                if (this.socketManager) {
                    this.socketManager.sendToUser(toUserId, 'new_message', {
                        message: await this.populateMessage(newMessage)
                    });
                }

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
                if (this.socketManager) {
                    this.socketManager.sendToUser(memberId, 'group_chat_created', {
                        chat: chat
                    });
                }
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

    // 获取未读消息数量
    async getUnreadCount(userId) {
        try {
            const chats = await Chat.find({
                participants: userId
            });

            let totalUnread = 0;
            const unreadByChat = {};

            chats.forEach(chat => {
                const unreadCount = chat.unreadCount.get(userId.toString()) || 0;
                totalUnread += unreadCount;
                unreadByChat[chat._id] = unreadCount;
            });

            return {
                total: totalUnread,
                byChat: unreadByChat
            };
        } catch (error) {
            console.error('获取未读消息数量失败:', error);
            throw error;
        }
    }

    // 获取最近聊天列表
    async getRecentChats(userId) {
        try {
            const chats = await Chat.find({
                participants: userId
            })
            .populate('participants', 'username avatar')
            .populate({
                path: 'lastMessage',
                populate: {
                    path: 'sender',
                    select: 'username avatar'
                }
            })
            .sort({ updatedAt: -1 })
            .lean();

            return chats.map(chat => {
                const otherParticipant = chat.participants.find(
                    p => p._id.toString() !== userId.toString()
                );
                
                return {
                    _id: chat._id,
                    username: otherParticipant?.username,
                    avatar: otherParticipant?.avatar,
                    lastMessage: chat.lastMessage?.content,
                    unreadCount: chat.unreadCount.get(userId.toString()) || 0,
                    updatedAt: chat.updatedAt
                };
            });
        } catch (error) {
            console.error('获取最近聊天列表失败:', error);
            throw error;
        }
    }

    // 在 MessageService 类中添加 deliverMessage 方法
    async deliverMessage(messageData) {
        try {
            const { messageId, chatId, sender, receiver, content, type, timestamp } = messageData;
            
            // 1. 更新消息状态
            const message = await Message.findById(messageId);
            if (!message) {
                throw new Error('消息不存在');
            }
            
            message.status = 'delivered';
            await message.save();

            // 2. 更新聊天会话
            const chat = await Chat.findById(chatId);
            if (chat) {
                const currentUnread = chat.unreadCount.get(receiver.toString()) || 0;
                chat.unreadCount.set(receiver.toString(), currentUnread + 1);
                chat.lastMessage = messageId;
                await chat.save();
            }

            // 3. 缓存消息
            await RedisClient.cacheRecentMessages(sender, receiver, message);

            // 4. 返回处理后的消息
            return await this.populateMessage(message);
        } catch (error) {
            console.error('投递消息失败:', error);
            throw error;
        }
    }
}

const messageService = new MessageService();
module.exports = messageService;