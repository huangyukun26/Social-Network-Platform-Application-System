const mongoose = require('mongoose');
const Message = require('../../models/Message');
const Chat = require('../../models/Chat');
const User = require('../../models/User');
const MessageService = require('../../services/MessageService');
const mockKafkaService = require('../mocks/kafkaService.mock');
const RedisClient = require('../mocks/redisClient.mock');
const { Types: { ObjectId } } = require('mongoose');
const { describe, beforeAll, beforeEach, test, expect } = require('@jest/globals');

describe('消息模块单元测试', () => {
    let testChat;
    let receiverId;

    beforeAll(async () => {
        try {
            // 创建测试接收者
            const testReceiver = await User.create({
                username: 'testReceiver',
                email: 'receiver@test.com',
                password: 'password123'
            });
            receiverId = testReceiver._id;

            // 创建测试聊天
            const chatData = {
                participants: [global.testUser._id, receiverId],
                type: 'private',
                unreadCount: new Map([
                    [global.testUser._id.toString(), 0],
                    [receiverId.toString(), 0]
                ])
            };
            
            testChat = await Chat.create(chatData);
            console.log('初始化的 Chat:', {
                id: testChat._id,
                unreadCount: Object.fromEntries(testChat.unreadCount)
            });
        } catch (error) {
            console.error('测试初始化失败:', error);
            throw error;
        }
    });

    beforeEach(async () => {
        try {
            // 先检查 Chat 是否存在
            const existingChat = await Chat.findById(testChat._id);
            if (!existingChat) {
                console.log('Chat 不存在，重新创建');
                testChat = await Chat.create({
                    participants: [global.testUser._id, receiverId],
                    type: 'private',
                    unreadCount: new Map([
                        [global.testUser._id.toString(), 0],
                        [receiverId.toString(), 0]
                    ])
                });
            } else {
                // 更新现有的 Chat
                existingChat.unreadCount = new Map([
                    [global.testUser._id.toString(), 0],
                    [receiverId.toString(), 0]
                ]);
                await existingChat.save();
                testChat = existingChat;
            }

            console.log('重置后的 Chat:', {
                id: testChat._id,
                unreadCount: Object.fromEntries(testChat.unreadCount)
            });
            
            jest.clearAllMocks();
        } catch (error) {
            console.error('beforeEach 失败:', error);
            throw error;
        }
    });

    afterAll(async () => {
        try {
            await Chat.deleteMany({});
            await Message.deleteMany({});
        } catch (error) {
            console.error('清理失败:', error);
        }
    });

    test('发送消息基础功能', async () => {
        const content = 'test message';
        
        // 发送消息前检查 Chat 状态
        const beforeChat = await Chat.findById(testChat._id);
        console.log('发送消息前的 Chat:', {
            id: beforeChat._id,
            unreadCount: Object.fromEntries(beforeChat.unreadCount)
        });
        
        const message = await MessageService.sendMessage(
            global.testUser._id.toString(),
            receiverId.toString(),
            content
        );

        expect(message).toBeDefined();
        expect(message.content).toBe(content);
        expect(message.sender.toString()).toBe(global.testUser._id.toString());
        expect(message.status).toBe('sent');
        
        // 等待一下确保数据已更新
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 验证未读计数
        const updatedChat = await Chat.findById(testChat._id);
        console.log('发送消息后的 Chat:', {
            id: updatedChat._id,
            unreadCount: Object.fromEntries(updatedChat.unreadCount)
        });
        
        expect(updatedChat).toBeDefined();
        expect(updatedChat.unreadCount).toBeDefined();
        const unreadCount = updatedChat.unreadCount.get(receiverId.toString());
        expect(unreadCount).toBe(1);
        
        // 验证 Redis 缓存调用
        expect(RedisClient.cacheRecentMessages).toHaveBeenCalled();
        
        // 验证 Kafka mock 被调用
        expect(mockKafkaService.sendMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                content,
                sender: global.testUser._id.toString(),
                receiver: receiverId.toString()
            })
        );
    });
});