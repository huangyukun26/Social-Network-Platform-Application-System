const mongoose = require('mongoose');
const path = require('path');

// 数据库连接信息
const DB_CONFIG = {
    MONGODB_URI: 'mongodb://localhost:27017/social-network'
};

async function migrateMessageSystem() {
    try {
        console.log('正在连接到:', DB_CONFIG.MONGODB_URI);
        
        await mongoose.connect(DB_CONFIG.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('数据库连接成功');

        const User = mongoose.connection.collection('users');
        const Message = mongoose.connection.collection('messages');
        const Chat = mongoose.connection.collection('chats');
        
        // 1. 为用户添加消息相关字段
        const userResult = await User.updateMany(
            {
                $or: [
                    { messageSettings: { $exists: false } },
                    { activeChats: { $exists: false } }
                ]
            },
            {
                $set: {
                    messageSettings: {
                        allowDirectMessages: true,
                        messagePrivacy: 'everyone',
                        notificationPreferences: {
                            newMessage: true,
                            messageRead: true,
                            typing: true
                        }
                    },
                    activeChats: []
                }
            }
        );

        console.log('用户字段更新完成:', {
            matched: userResult.matchedCount,
            modified: userResult.modifiedCount
        });

        // 2. 为现有消息创建对应的聊天会话
        const messages = await Message.find({}).toArray();
        const chatMap = new Map(); // 用于存储已创建的聊天会话

        for (const message of messages) {
            const participantIds = [message.sender, message.receiver].sort();
            const chatKey = participantIds.join('-');

            let chatId = chatMap.get(chatKey);
            
            if (!chatId) {
                // 创建新的聊天会话
                const chatResult = await Chat.insertOne({
                    participants: participantIds,
                    type: 'private',
                    status: 'active',
                    unreadCount: new Map(),
                    createdAt: message.createdAt,
                    updatedAt: message.createdAt
                });
                chatId = chatResult.insertedId;
                chatMap.set(chatKey, chatId);
            }

            // 更新消息的chatId字段
            await Message.updateOne(
                { _id: message._id },
                {
                    $set: {
                        chatId: chatId,
                        readBy: [{
                            user: message.sender,
                            readAt: message.createdAt
                        }],
                        isEdited: false,
                        editHistory: []
                    }
                }
            );
        }

        console.log('消息迁移完成，共处理消息数:', messages.length);

        // 3. 更新用户的activeChats字段
        for (const [chatKey, chatId] of chatMap) {
            const [user1, user2] = chatKey.split('-');
            await User.updateMany(
                { _id: { $in: [mongoose.Types.ObjectId(user1), mongoose.Types.ObjectId(user2)] } },
                { $addToSet: { activeChats: chatId } }
            );
        }

        // 4. 创建必要的索引
        console.log('创建索引...');
        await Chat.createIndex({ participants: 1 });
        await Chat.createIndex({ lastMessage: 1 });
        await Chat.createIndex({ updatedAt: -1 });
        await Message.createIndex({ chatId: 1, createdAt: -1 });

        // 5. 验证迁移结果
        const stats = {
            totalUsers: await User.countDocuments(),
            totalMessages: await Message.countDocuments(),
            totalChats: await Chat.countDocuments()
        };

        console.log('迁移统计:', stats);

        await mongoose.disconnect();
        console.log('迁移完成');
        process.exit(0);
    } catch (error) {
        console.error('迁移失败:', error);
        console.error('错误详情:', error.stack);
        process.exit(1);
    }
}

// 添加错误处理
process.on('unhandledRejection', (error) => {
    console.error('未处理的Promise拒绝:', error);
    process.exit(1);
});

// 执行迁移
migrateMessageSystem();