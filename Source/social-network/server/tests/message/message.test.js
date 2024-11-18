const mongoose = require('mongoose');
const Message = require('../../models/Message');
const Chat = require('../../models/Chat');
const User = require('../../models/User');
const MessageService = require('../../services/MessageService');
const mockKafkaService = require('../mocks/kafkaService.mock');
const mockRedisClient = require('../mocks/redisClient.mock');
const { neo4jServiceInstance } = require('../mocks/neo4jService.mock');

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
        } catch (error) {
            console.error('测试用户创建失败:', error);
            throw error;
        }
        User.prototype.neo4jService = neo4jServiceInstance;
    });

    beforeEach(async () => {
        // 创建测试聊天
        testChat = await Chat.create({
            participants: [global.testUser._id, receiverId],
            type: 'private'
        });
    });

    beforeEach(() => {
        // 清除所有 mock 的调用历史
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await Message.deleteMany({});
        await Chat.deleteMany({});
    });

    afterAll(async () => {
        try {
            // 清理测试数据
            await User.deleteMany({});
            await Message.deleteMany({});
            await Chat.deleteMany({});
        } catch (error) {
            console.error('测试数据清理失败:', error);
        }
    });

    test('发送消息基础功能', async () => {
        const content = 'test message';
        const message = await MessageService.sendMessage(
            global.testUser._id,
            receiverId,
            content
        );

        expect(message).toBeDefined();
        expect(message.content).toBe(content);
        expect(message.sender.toString()).toBe(global.testUser._id.toString());
        expect(message.status).toBe('sent');
    });

    test('获取聊天历史', async () => {
        // 创建多条测试消息
        await Message.create([
            {
                sender: global.testUser._id,
                receiver: receiverId,
                content: 'message 1',
                chatId: testChat._id
            },
            {
                sender: receiverId,
                receiver: global.testUser._id,
                content: 'message 2',
                chatId: testChat._id
            }
        ]);

        const messages = await MessageService.getChatHistory(testChat._id);
        expect(messages).toHaveLength(2);
        expect(messages[0].content).toBe('message 1');
    });

    test('标记消息已读', async () => {
        const message = await Message.create({
            sender: receiverId,
            receiver: global.testUser._id,
            content: 'unread message',
            chatId: testChat._id
        });

        await MessageService.markAsRead(global.testUser._id, testChat._id);
        
        const updatedMessage = await Message.findById(message._id);
        expect(updatedMessage.readBy).toContainEqual(
            expect.objectContaining({
                user: global.testUser._id
            })
        );
    });
});