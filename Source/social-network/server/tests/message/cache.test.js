const RedisClient = require('../../utils/RedisClient');
const MessageService = require('../../services/MessageService');
const User = require('../../models/User');

describe('消息缓存测试', () => {
    let receiverId;
    let messageId;

    beforeAll(async () => {
        const testReceiver = await User.create({
            username: 'cacheTestReceiver',
            email: 'cache@test.com',
            password: 'password123'
        });
        receiverId = testReceiver._id;
    });

    test('消息缓存写入和读取', async () => {
        const message = {
            sender: global.testUser._id,
            receiver: receiverId,
            content: 'cache test message'
        };

        // 测试缓存写入
        await RedisClient.cacheMessage(message._id, message);
        
        // 测试缓存读取
        const cachedMessage = await RedisClient.getCachedMessage(message._id);
        expect(cachedMessage).toBeDefined();
        expect(cachedMessage.content).toBe(message.content);
    });

    test('未读消息计数', async () => {
        await RedisClient.incrUnreadMessages(receiverId, global.testUser._id);
        await RedisClient.incrUnreadMessages(receiverId, global.testUser._id);

        const unreadCounts = await RedisClient.getUnreadMessagesCount(receiverId);
        expect(unreadCounts[0].count).toBe(2);
    });
});